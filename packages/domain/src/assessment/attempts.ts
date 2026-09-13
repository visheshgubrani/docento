/**
 * Quiz attempts.
 *
 * ## The snapshot is the point
 *
 * An attempt stores the grading rules and answer key as they stood when it
 * began. Everything here reads that snapshot and never the live quiz, which is
 * what makes "a published edit cannot rewrite an attempt already in progress"
 * true rather than aspirational. The legacy application graded against the
 * current quiz, so an author fixing a typo in an answer key silently regraded
 * every historical attempt.
 *
 * ## Trust boundaries
 *
 * The client tells us which options a learner selected. It does not tell us how
 * long they took, whether they passed, or what the score was. Elapsed time is
 * computed from `startedAt`, which the server wrote; the score comes from the
 * grading engine; and the answer key never appears in a response, before or
 * after submission.
 *
 * ## Attempt limits and windows
 *
 * `maxAttempts` counts *completed* attempts, so an abandoned attempt does not
 * silently consume a slot. `opensAt` and `closesAt` are checked on start and
 * again on submit, because a learner can begin inside the window and finish
 * outside it — a case that has a defined answer rather than an accident.
 */

import { prisma } from '../db'
import type { Principal } from '../authorization/principal'
import { completeLesson } from '../learning/enrollment'
import {
  ConflictError,
  DomainRuleError,
  NotFoundError,
  assertCan,
  assertFound,
} from '../shared/errors'
import {
  type GradingSnapshot,
  type QuestionType,
  type SubmittedAnswer,
  asQuestionType,
  gradeFromSnapshot,
  scoreAttempt,
} from '../assessment/grading'
import { hasAccess } from '../learning/enrollment'

export type AttemptSummary = {
  id: string
  quizId: string
  learnerId: string
  attemptNumber: number
  score: number
  totalPoints: number
  passed: boolean
  startedAt: Date
  submittedAt: Date | null
  timeSpentSeconds: number | null
}

const ATTEMPT_FIELDS = {
  id: true,
  quizId: true,
  learnerId: true,
  attemptNumber: true,
  score: true,
  totalPoints: true,
  passed: true,
  startedAt: true,
  submittedAt: true,
  timeSpentSeconds: true,
} as const

/**
 * A refusal about access rather than about a missing resource.
 *
 * Distinct from `ForbiddenError`, which comes from `can()`: this one means the
 * principal is allowed to attempt quizzes in this academy but has no live grant
 * for this course. The two produce different client behaviour — re-authenticate
 * versus ask for access — so they are different types.
 */
export class ForbiddenAccess extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenAccess'
  }
}

/**
 * Everything an attempt needs about its quiz, read from the release.
 *
 * Deliberately reads the release snapshot rather than the draft rows: the draft
 * may have moved on since the learner's course was published, and a learner
 * follows a release.
 */
async function loadQuizContext(
  academyId: string,
  lessonId: string,
): Promise<{
  quizId: string
  lessonTitle: string
  courseId: string
  passingPercent: number
  maxAttempts: number | null
  timeLimitMinutes: number | null
  opensAt: Date | null
  closesAt: Date | null
  isMockTest: boolean
  snapshot: GradingSnapshot
} | null> {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { academyId } } },
    select: {
      id: true,
      title: true,
      quiz: { select: { id: true } },
      module: { select: { courseId: true } },
    },
  })

  if (!lesson?.quiz) return null

  const courseId = lesson.module.courseId

  const release = await prisma.courseRelease.findFirst({
    where: { courseId, supersededAt: null },
    orderBy: { version: 'desc' },
    select: { snapshot: true },
  })

  if (!release) return null

  const snapshotDocument = release.snapshot as unknown as {
    modules: {
      lessons: {
        id: string
        quiz: {
          id: string
          passingPercent: number
          maxAttempts: number | null
          timeLimitMinutes: number | null
          opensAt: string | null
          closesAt: string | null
          isMockTest: boolean
          quizMarking: {
            negativeMarking: boolean
            defaultNegativeMark: number | null
          }
          questions: {
            id: string
            marking: GradingSnapshot['questions'][number]['marking']
          }[]
        } | null
      }[]
    }[]
  }

  const releasedLesson = snapshotDocument.modules
    .flatMap((module) => module.lessons)
    .find((candidate) => candidate.id === lessonId)

  if (!releasedLesson?.quiz) return null

  return {
    quizId: lesson.quiz.id,
    lessonTitle: lesson.title,
    courseId,
    passingPercent: releasedLesson.quiz.passingPercent,
    maxAttempts: releasedLesson.quiz.maxAttempts,
    timeLimitMinutes: releasedLesson.quiz.timeLimitMinutes,
    opensAt: releasedLesson.quiz.opensAt
      ? new Date(releasedLesson.quiz.opensAt)
      : null,
    closesAt: releasedLesson.quiz.closesAt
      ? new Date(releasedLesson.quiz.closesAt)
      : null,
    isMockTest: releasedLesson.quiz.isMockTest,
    snapshot: {
      questions: releasedLesson.quiz.questions.map((question) => ({
        questionId: question.id,
        marking: question.marking,
      })),
      quiz: releasedLesson.quiz.quizMarking,
    },
  }
}

/**
 * The quiz as a learner may see it.
 *
 * The projection is built here, field by field, rather than by deleting keys
 * from a full object. A `delete` is invisible in a diff and easy to lose; a
 * projection that never mentions `correctAnswer` cannot leak it.
 */
export type LearnerQuizView = {
  id: string
  lessonId: string
  title: string
  description: string | null
  passingPercent: number
  maxAttempts: number | null
  timeLimitMinutes: number | null
  opensAt: string | null
  closesAt: string | null
  isMockTest: boolean
  sections: { id: string; title: string; position: number }[]
  questions: {
    id: string
    prompt: string
    questionType: QuestionType
    options: string[]
    points: number
    sectionId: string | null
    position: number
  }[]
  /** The learner's own attempts, newest first. */
  attempts: AttemptSummary[]
  attemptsRemaining: number | null
  bestScore: number
  hasPassed: boolean
  /** An attempt that is open right now, if there is one. */
  openAttempt: {
    id: string
    startedAt: string
    remainingSeconds: number | null
  } | null
}

/**
 * Read a quiz for a learner who is entitled to take it.
 *
 * Refuses when access has lapsed, when the window has closed, and when the
 * attempt limit is exhausted — each with the reason, so the learner knows which
 * of the three it is rather than seeing a generic failure.
 */
export async function getQuizForLearner(
  principal: Principal,
  input: { academyId: string; learnerId: string; lessonId: string },
): Promise<LearnerQuizView> {
  assertCan(principal, 'learner:attempt:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const context = await loadQuizContext(input.academyId, input.lessonId)

  if (!context) {
    throw new NotFoundError('quiz', input.lessonId)
  }

  const entitled = await hasAccess(
    input.academyId,
    context.courseId,
    input.learnerId,
  )

  if (!entitled) {
    throw new ForbiddenAccess('You do not have access to this course.')
  }

  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { id: context.quizId },
    select: {
      id: true,
      title: true,
      description: true,
      sections: {
        orderBy: { position: 'asc' },
        select: { id: true, title: true, position: true },
      },
      questions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          prompt: true,
          questionType: true,
          options: true,
          points: true,
          sectionId: true,
          position: true,
        },
      },
    },
  })

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      quizId: context.quizId,
      learnerId: input.learnerId,
      submittedAt: { not: null },
    },
    orderBy: { attemptNumber: 'desc' },
    select: ATTEMPT_FIELDS,
  })

  const open = await prisma.quizAttempt.findFirst({
    where: {
      quizId: context.quizId,
      learnerId: input.learnerId,
      submittedAt: null,
    },
    orderBy: { attemptNumber: 'desc' },
    select: { id: true, startedAt: true },
  })

  const bestScore =
    attempts.length > 0
      ? Math.max(...attempts.map((attempt) => attempt.score))
      : 0

  return {
    id: quiz.id,
    lessonId: input.lessonId,
    title: quiz.title,
    description: quiz.description,
    passingPercent: context.passingPercent,
    maxAttempts: context.maxAttempts,
    timeLimitMinutes: context.timeLimitMinutes,
    opensAt: context.opensAt?.toISOString() ?? null,
    closesAt: context.closesAt?.toISOString() ?? null,
    isMockTest: context.isMockTest,
    sections: quiz.sections,
    /**
     * Built field by field. `correctAnswer`, `correctAnswers` and
     * `reviewStatus` are not omitted from this object — they are never written
     * into it, which is a different guarantee.
     */
    questions: quiz.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      // Narrowed before it can reach a client or the grading engine.
      questionType: asQuestionType(question.questionType),
      options: asStringArray(question.options),
      points: question.points,
      sectionId: question.sectionId,
      position: question.position,
    })),
    attempts,
    attemptsRemaining:
      context.maxAttempts === null
        ? null
        : Math.max(0, context.maxAttempts - attempts.length),
    bestScore,
    hasPassed: attempts.some((attempt) => attempt.passed),
    openAttempt: open
      ? {
          id: open.id,
          startedAt: open.startedAt.toISOString(),
          remainingSeconds: remainingSeconds(
            context.timeLimitMinutes,
            open.startedAt,
          ),
        }
      : null,
  }
}

/**
 * Remaining time, or `null` when there is no limit.
 *
 * Computed from the stored start rather than from anything the client sends.
 * The legacy version trusted a client-supplied `timeSpent`, which meant a
 * learner could grant themselves an unbounded attempt by editing a request.
 */
function remainingSeconds(
  timeLimitMinutes: number | null,
  startedAt: Date,
): number | null {
  if (timeLimitMinutes === null) return null

  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)

  return Math.max(0, timeLimitMinutes * 60 - elapsed)
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.filter((entry): entry is string => typeof entry === 'string')
}

/**
 * Start an attempt, or resume the open one.
 *
 * ## Resuming rather than restarting
 *
 * A learner who closes a tab mid-quiz should return to where they were, not to
 * a fresh attempt that consumes one of their slots. So an open attempt is
 * returned as-is.
 *
 * ## An attempt that ran out of time
 *
 * If an open attempt is past its limit, it is finalised with whatever answers
 * were recorded and the learner is told the attempt is over. Silently issuing a
 * new one would make the limit meaningless; refusing outright would lose the
 * answers they did give.
 */
export async function startAttempt(
  principal: Principal,
  input: { academyId: string; learnerId: string; lessonId: string },
): Promise<{ attempt: AttemptSummary; resumed: boolean; expired: boolean }> {
  assertCan(principal, 'learner:attempt:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const context = await loadQuizContext(input.academyId, input.lessonId)

  if (!context) throw new NotFoundError('quiz', input.lessonId)

  const entitled = await hasAccess(
    input.academyId,
    context.courseId,
    input.learnerId,
  )
  if (!entitled)
    throw new ForbiddenAccess('You do not have access to this course.')

  assertWindowOpen(context)

  const open = await prisma.quizAttempt.findFirst({
    where: {
      quizId: context.quizId,
      learnerId: input.learnerId,
      submittedAt: null,
    },
    orderBy: { attemptNumber: 'desc' },
    select: { ...ATTEMPT_FIELDS, gradingSnapshot: true },
  })

  if (open) {
    const remaining = remainingSeconds(context.timeLimitMinutes, open.startedAt)

    if (remaining === null || remaining > 0) {
      return {
        attempt: stripSnapshot(open),
        resumed: true,
        expired: false,
      }
    }

    // Out of time. Finalise with what was recorded.
    const submitted = await finaliseAttempt(
      open.id,
      open.gradingSnapshot,
      context.passingPercent,
    )

    return { attempt: submitted, resumed: false, expired: true }
  }

  const completed = await prisma.quizAttempt.count({
    where: {
      quizId: context.quizId,
      learnerId: input.learnerId,
      submittedAt: { not: null },
    },
  })

  if (context.maxAttempts !== null && completed >= context.maxAttempts) {
    throw new ConflictError(
      'no_attempts_remaining',
      `This quiz allows ${context.maxAttempts} attempt${
        context.maxAttempts === 1 ? '' : 's'
      }, and they have all been used.`,
    )
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_learnerId: {
        courseId: context.courseId,
        learnerId: input.learnerId,
      },
    },
    select: { id: true },
  })

  assertFound(
    'enrollment',
    enrollment,
    `${input.learnerId}/${context.courseId}`,
  )

  /**
   * The attempt number is the next one after every attempt, completed or not.
   *
   * Not "completed plus one": a resumed open attempt keeps its number, and
   * reusing a number would collide with the unique constraint that makes a
   * double-submit unable to create two attempts.
   */
  const total = await prisma.quizAttempt.count({
    where: { quizId: context.quizId, learnerId: input.learnerId },
  })

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: context.quizId,
      learnerId: input.learnerId,
      attemptNumber: total + 1,
      /**
       * The whole point. Grading reads this, never the live quiz, so an author
       * editing the answer key after this moment cannot change the outcome.
       */
      gradingSnapshot: context.snapshot as unknown as object,
      totalPoints: context.snapshot.questions.reduce(
        (sum, question) => sum + (question.marking.points || 1),
        0,
      ),
    },
    select: ATTEMPT_FIELDS,
  })

  return { attempt, resumed: false, expired: false }
}

function stripSnapshot(
  row: AttemptSummary & { gradingSnapshot?: unknown },
): AttemptSummary {
  const { gradingSnapshot: _snapshot, ...rest } = row

  return rest
}

/**
 * Refuse a start or a submit outside the quiz's window.
 *
 * Distinguished from the attempt limit so a learner knows whether to come back
 * later or to speak to their instructor.
 */
function assertWindowOpen(context: {
  opensAt: Date | null
  closesAt: Date | null
}): void {
  const now = new Date()

  if (context.opensAt && now < context.opensAt) {
    throw new ConflictError(
      'quiz_not_open',
      `This quiz opens on ${context.opensAt.toISOString()}.`,
    )
  }

  if (context.closesAt && now > context.closesAt) {
    throw new ConflictError(
      'quiz_closed',
      `This quiz closed on ${context.closesAt.toISOString()}.`,
    )
  }
}

/**
 * Submit an attempt.
 *
 * ## Idempotence
 *
 * Submitting twice returns the stored result rather than regrading. Two
 * concurrent submits race on a conditional update, and the loser reads the
 * winner's result — so a double-click cannot produce two grades or a score that
 * depends on which request arrived second.
 *
 * ## Grading against the snapshot
 *
 * The answers are graded against `gradingSnapshot`, which was written when the
 * attempt began. A question deleted from the quiz since then still grades,
 * because the snapshot still contains it.
 */
export async function submitAttempt(
  principal: Principal,
  input: {
    academyId: string
    learnerId: string
    attemptId: string
    answers: readonly {
      questionId: string
      answer?: string | null
      answers?: string[]
    }[]
  },
): Promise<AttemptResult> {
  assertCan(principal, 'learner:attempt:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: input.attemptId, learnerId: input.learnerId },
    select: { ...ATTEMPT_FIELDS, gradingSnapshot: true },
  })

  assertFound('quiz attempt', attempt, input.attemptId)

  if (attempt.submittedAt) {
    // Already submitted. Return what was recorded rather than regrading with
    // whatever the second request happened to contain.
    return buildResult(attempt.id, input.learnerId)
  }

  // Record the answers as given. They are graded below, against the snapshot,
  // so storing them and grading them cannot disagree.
  await prisma.$transaction(
    input.answers.map((answer) =>
      prisma.quizAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: input.attemptId,
            questionId: answer.questionId,
          },
        },
        create: {
          attemptId: input.attemptId,
          questionId: answer.questionId,
          answer: answer.answer ?? '',
          answers: answer.answers ?? [],
        },
        update: {
          answer: answer.answer ?? '',
          answers: answer.answers ?? [],
        },
      }),
    ),
  )

  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { id: attempt.quizId },
    select: { passingPercent: true, lessonId: true },
  })

  const finalised = await finaliseAttempt(
    input.attemptId,
    attempt.gradingSnapshot,
    quiz.passingPercent,
  )

  /**
   * A passed quiz completes its lesson.
   *
   * ## Why this lives here rather than in the route
   *
   * It is the completion rule for a quiz lesson, and the route is not the only
   * caller — a worker grading an expired attempt would have to remember it too,
   * and the one that forgot would produce a learner whose quiz says "passed" and
   * whose course says "1 of 2 required lessons are done". That is exactly the
   * state this was written after finding: nothing in the domain completed a quiz
   * lesson, so a course with a quiz could never be finished and its certificate
   * could never be issued.
   *
   * `completeLesson` rather than a direct write, because it owns the rest of the
   * consequences: the enrolment's `completedAt`, and the withdrawal of
   * completion when the release grows.
   */
  if (finalised.passed) {
    await completeLesson(
      {
        kind: 'learner',
        learnerId: input.learnerId,
        academyId: input.academyId,
      },
      {
        academyId: input.academyId,
        learnerId: input.learnerId,
        lessonId: quiz.lessonId,
      },
    )
  }

  return buildResult(input.attemptId, input.learnerId)
}

/**
 * Grade and close an attempt.
 *
 * The conditional update is the concurrency guard: only the request that
 * observes `submittedAt: null` writes the score, so two simultaneous submits
 * cannot each compute and store a result.
 */
async function finaliseAttempt(
  attemptId: string,
  gradingSnapshot: unknown,
  passingPercent: number,
): Promise<AttemptSummary> {
  const snapshot = gradingSnapshot as unknown as GradingSnapshot

  const stored = await prisma.quizAnswer.findMany({
    where: { attemptId },
    select: { questionId: true, answer: true, answers: true },
  })

  const submissions = new Map<string, SubmittedAnswer>(
    stored.map((row) => [
      row.questionId,
      { answer: row.answer, answers: row.answers },
    ]),
  )

  const scored = scoreAttempt(snapshot, submissions, passingPercent)

  const updated = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, submittedAt: null },
    data: {
      score: scored.score,
      totalPoints: scored.totalPoints,
      passed: scored.passed,
      submittedAt: new Date(),
      timeSpentSeconds: await elapsedSeconds(attemptId),
    },
  })

  if (updated.count === 0) {
    // Another request closed it first. Its result is the truth.
    const existing = await prisma.quizAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: ATTEMPT_FIELDS,
    })

    return existing
  }

  // Per-answer marks, so a results view can show which questions were right
  // without the answer key being sent anywhere.
  for (const row of stored) {
    const graded = gradeFromSnapshot(snapshot, row.questionId, {
      answer: row.answer,
      answers: row.answers,
    })

    if (!graded) continue

    await prisma.quizAnswer.update({
      where: {
        attemptId_questionId: { attemptId, questionId: row.questionId },
      },
      data: { isCorrect: graded.isCorrect, pointsEarned: graded.pointsEarned },
    })
  }

  return prisma.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: ATTEMPT_FIELDS,
  })
}

/** Elapsed seconds, from the server's own clock. */
async function elapsedSeconds(attemptId: string): Promise<number> {
  const attempt = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: { startedAt: true },
  })

  return Math.max(
    0,
    Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000),
  )
}

export type AttemptResult = {
  attempt: AttemptSummary
  percent: number
  /** Per question, with the key withheld. */
  questions: {
    questionId: string
    prompt: string
    questionType: string
    /** What the learner selected. */
    submitted: { answer: string; answers: string[] }
    isCorrect: boolean
    pointsEarned: number
    points: number
    explanation: string | null
  }[]
}

/**
 * A completed attempt's result.
 *
 * `explanation` is included and the answer key is not. An explanation is
 * authored for the learner and is what makes a wrong answer instructive; the
 * key is only withheld because the same quiz may be attempted again, and
 * `maxAttempts` is enforced rather than assumed.
 */
async function buildResult(
  attemptId: string,
  learnerId: string,
): Promise<AttemptResult> {
  const attempt = await prisma.quizAttempt.findFirstOrThrow({
    where: { id: attemptId, learnerId },
    select: { ...ATTEMPT_FIELDS, gradingSnapshot: true },
  })

  const snapshot = attempt.gradingSnapshot as unknown as GradingSnapshot

  const answers = await prisma.quizAnswer.findMany({
    where: { attemptId },
    select: {
      questionId: true,
      answer: true,
      answers: true,
      isCorrect: true,
      pointsEarned: true,
      question: {
        select: {
          prompt: true,
          questionType: true,
          explanation: true,
          points: true,
        },
      },
    },
  })

  const byQuestion = new Map(answers.map((row) => [row.questionId, row]))

  const questions = snapshot.questions.map((question) => {
    const row = byQuestion.get(question.questionId)

    return {
      questionId: question.questionId,
      prompt: row?.question.prompt ?? '',
      questionType: row?.question.questionType
        ? asQuestionType(row.question.questionType)
        : question.marking.questionType,
      submitted: { answer: row?.answer ?? '', answers: row?.answers ?? [] },
      isCorrect: row?.isCorrect ?? false,
      pointsEarned: row?.pointsEarned ?? 0,
      points: row?.question.points ?? question.marking.points,
      explanation: row?.question.explanation ?? null,
    }
  })

  return {
    attempt: stripSnapshot(attempt),
    percent:
      attempt.totalPoints > 0
        ? Math.min(
            100,
            Math.max(0, (attempt.score / attempt.totalPoints) * 100),
          )
        : 0,
    questions,
  }
}

/** A learner's own attempt history for a lesson. */
export async function listAttempts(
  principal: Principal,
  input: { academyId: string; learnerId: string; lessonId: string },
): Promise<{ attempts: AttemptSummary[]; passingPercent: number }> {
  assertCan(principal, 'learner:attempt:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const context = await loadQuizContext(input.academyId, input.lessonId)

  if (!context) throw new NotFoundError('quiz', input.lessonId)

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: context.quizId, learnerId: input.learnerId },
    orderBy: { attemptNumber: 'desc' },
    select: ATTEMPT_FIELDS,
  })

  return { attempts, passingPercent: context.passingPercent }
}

// ---------------------------------------------------------------------------
// Authoring: quizzes, sections and questions
// ---------------------------------------------------------------------------

/**
 * Create or replace a lesson's quiz.
 *
 * Upsert rather than create, because a lesson has at most one quiz
 * (`Quiz.lessonId` is unique) and an author editing settings should not have to
 * know whether the row exists.
 */
export async function upsertQuiz(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    lessonId: string
    title: string
    description?: string | null
    passingPercent?: number
    maxAttempts?: number | null
    timeLimitMinutes?: number | null
    opensAt?: Date | null
    closesAt?: Date | null
    isMockTest?: boolean
    negativeMarking?: boolean
    defaultNegativeMark?: number | null
  },
): Promise<{ id: string; lessonId: string }> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: { id: input.lessonId, module: { courseId: input.courseId } },
    select: { id: true, quiz: { select: { id: true } } },
  })

  assertFound('lesson', lesson, input.lessonId)

  const problems: { path: string; message: string }[] = []

  if (
    input.passingPercent !== undefined &&
    (input.passingPercent < 0 || input.passingPercent > 100)
  ) {
    problems.push({
      path: 'passingPercent',
      message: 'must be between 0 and 100',
    })
  }

  if (
    input.maxAttempts !== undefined &&
    input.maxAttempts !== null &&
    input.maxAttempts < 1
  ) {
    problems.push({ path: 'maxAttempts', message: 'must be at least 1' })
  }

  if (
    input.opensAt &&
    input.closesAt &&
    input.opensAt.getTime() >= input.closesAt.getTime()
  ) {
    problems.push({
      path: 'closesAt',
      message: 'must be after the opening time',
    })
  }

  if (problems.length > 0) {
    throw new DomainRuleError(
      'invalid_quiz',
      'This quiz has invalid settings.',
      problems,
    )
  }

  const data = {
    title: input.title.trim(),
    description: input.description ?? null,
    ...(input.passingPercent !== undefined
      ? { passingPercent: input.passingPercent }
      : {}),
    ...(input.maxAttempts !== undefined
      ? { maxAttempts: input.maxAttempts }
      : {}),
    ...(input.timeLimitMinutes !== undefined
      ? { timeLimitMinutes: input.timeLimitMinutes }
      : {}),
    ...(input.opensAt !== undefined ? { opensAt: input.opensAt } : {}),
    ...(input.closesAt !== undefined ? { closesAt: input.closesAt } : {}),
    ...(input.isMockTest !== undefined ? { isMockTest: input.isMockTest } : {}),
    ...(input.negativeMarking !== undefined
      ? { negativeMarking: input.negativeMarking }
      : {}),
    ...(input.defaultNegativeMark !== undefined
      ? { defaultNegativeMark: input.defaultNegativeMark }
      : {}),
  }

  const quiz = lesson.quiz
    ? await prisma.quiz.update({
        where: { id: lesson.quiz.id },
        data,
        select: { id: true, lessonId: true },
      })
    : await prisma.quiz.create({
        data: { ...data, lessonId: input.lessonId },
        select: { id: true, lessonId: true },
      })

  return quiz
}

export async function upsertQuestion(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    quizId: string
    questionId?: string
    prompt: string
    questionType: string
    options?: string[]
    correctAnswer: string
    correctAnswers?: string[]
    explanation?: string | null
    points?: number
    negativePoints?: number
    partialMarking?: boolean
    sectionId?: string | null
  },
): Promise<{ id: string }> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: input.quizId,
      lesson: { module: { courseId: input.courseId } },
    },
    select: { id: true },
  })

  assertFound('quiz', quiz, input.quizId)

  if (input.sectionId) {
    const section = await prisma.quizSection.findFirst({
      where: { id: input.sectionId, quizId: input.quizId },
      select: { id: true },
    })

    // A question in another quiz's section would be a quiz that grades answers
    // it never asked for.
    assertFound('quiz section', section, input.sectionId)
  }

  const problems: { path: string; message: string }[] = []

  if (
    input.questionType === 'MULTI_SELECT' &&
    (input.correctAnswers?.length ?? 0) === 0
  ) {
    problems.push({
      path: 'correctAnswers',
      message: 'a multi-select question needs at least one correct option',
    })
  }

  if (
    input.questionType !== 'MULTI_SELECT' &&
    input.correctAnswer.trim().length === 0
  ) {
    problems.push({ path: 'correctAnswer', message: 'is required' })
  }

  if (input.prompt.trim().length === 0) {
    problems.push({ path: 'prompt', message: 'is required' })
  }

  if (problems.length > 0) {
    throw new DomainRuleError(
      'invalid_question',
      'This question is incomplete.',
      problems,
    )
  }

  const data = {
    prompt: input.prompt.trim(),
    questionType: input.questionType,
    options: (input.options ?? []) as unknown as object,
    correctAnswer: input.correctAnswer,
    correctAnswers: input.correctAnswers ?? [],
    explanation: input.explanation ?? null,
    ...(input.points !== undefined ? { points: input.points } : {}),
    ...(input.negativePoints !== undefined
      ? { negativePoints: input.negativePoints }
      : {}),
    ...(input.partialMarking !== undefined
      ? { partialMarking: input.partialMarking }
      : {}),
    ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
  }

  if (input.questionId) {
    const existing = await prisma.question.findFirst({
      where: { id: input.questionId, quizId: input.quizId },
      select: { id: true },
    })

    assertFound('question', existing, input.questionId)

    return prisma.question.update({
      where: { id: input.questionId },
      data,
      select: { id: true },
    })
  }

  const position = await prisma.question.count({
    where: { quizId: input.quizId },
  })

  return prisma.question.create({
    data: { quizId: input.quizId, position: position + 1, ...data },
    select: { id: true },
  })
}

export async function upsertSection(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    quizId: string
    sectionId?: string
    title: string
  },
): Promise<{ id: string }> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: input.quizId,
      lesson: { module: { courseId: input.courseId } },
    },
    select: { id: true },
  })

  assertFound('quiz', quiz, input.quizId)

  if (input.sectionId) {
    const existing = await prisma.quizSection.findFirst({
      where: { id: input.sectionId, quizId: input.quizId },
      select: { id: true },
    })

    assertFound('quiz section', existing, input.sectionId)

    return prisma.quizSection.update({
      where: { id: input.sectionId },
      data: { title: input.title.trim() },
      select: { id: true },
    })
  }

  const position = await prisma.quizSection.count({
    where: { quizId: input.quizId },
  })

  return prisma.quizSection.create({
    data: {
      quizId: input.quizId,
      title: input.title.trim(),
      position: position + 1,
    },
    select: { id: true },
  })
}

/** A question as its author sees it, which is to say with its answer key. */
export type AuthorQuestionSummary = {
  id: string
  prompt: string
  /**
   * Narrowed from the column's `string`.
   *
   * The schema stores a string and a migration could introduce a value this
   * build does not know; the contract's enum would then reject the whole quiz
   * response, and the author would see a failed page rather than the one
   * question they cannot edit. `asQuestionType` is the same narrowing the
   * grading path uses, so an unrecognised value behaves the same in both.
   */
  questionType: QuestionType
  options: string[]
  correctAnswer: string
  correctAnswers: string[]
  explanation: string | null
  points: number
  negativePoints: number
  partialMarking: boolean
  sectionId: string | null
  position: number
  source: string
  reviewStatus: string
}

export type AuthorQuizSummary = {
  id: string
  lessonId: string
  title: string
  description: string | null
  passingPercent: number
  maxAttempts: number | null
  timeLimitMinutes: number | null
  opensAt: string | null
  closesAt: string | null
  isMockTest: boolean
  negativeMarking: boolean
  defaultNegativeMark: number | null
  sections: { id: string; title: string; position: number }[]
  questions: AuthorQuestionSummary[]
}

/**
 * Read a lesson's quiz as its author, including the answer keys.
 *
 * ## Why this is not `getQuizForLearner`
 *
 * The learner read returns a projection with no field that could hold a key —
 * a deliberate shape, so a key cannot leak through it. That projection is also
 * reached under `/learn/...` by a learner principal, so it is the wrong thing
 * for an editor on both counts.
 *
 * ## Why it returns `null` rather than throwing
 *
 * "This lesson has no quiz yet" is the state an author is in when they arrive
 * to write one. A `404` would make the ordinary case an error the UI has to
 * recognise by code, and the code is shared with "this lesson is not yours",
 * which must not be conflated with it.
 *
 * ## Why every field is returned
 *
 * An edit form that can only write resets whatever it did not read back: an
 * author changing the passing mark would silently clear the time limit. So the
 * read returns everything `upsertQuiz` accepts.
 */
export async function getQuizForAuthor(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    lessonId: string
  },
): Promise<AuthorQuizSummary | null> {
  assertCan(principal, 'course:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  /**
   * The lesson is looked up through the course before the quiz is looked up
   * through the lesson, so naming a lesson from another course is a not-found
   * rather than a read.
   */
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: input.lessonId,
      module: {
        courseId: input.courseId,
        course: { academyId: input.academyId },
      },
    },
    select: { id: true },
  })

  assertFound('lesson', lesson, input.lessonId)

  const quiz = await prisma.quiz.findUnique({
    where: { lessonId: input.lessonId },
    select: {
      id: true,
      lessonId: true,
      title: true,
      description: true,
      passingPercent: true,
      maxAttempts: true,
      timeLimitMinutes: true,
      opensAt: true,
      closesAt: true,
      isMockTest: true,
      negativeMarking: true,
      defaultNegativeMark: true,
      sections: {
        orderBy: { position: 'asc' },
        select: { id: true, title: true, position: true },
      },
      questions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          prompt: true,
          questionType: true,
          options: true,
          correctAnswer: true,
          correctAnswers: true,
          explanation: true,
          points: true,
          negativePoints: true,
          partialMarking: true,
          sectionId: true,
          position: true,
          source: true,
          reviewStatus: true,
        },
      },
    },
  })

  if (!quiz) return null

  return {
    ...quiz,
    /**
     * ISO strings, as the rest of the API sends dates. The learner read does the
     * same conversion, and a form that receives a `Date` here would be the one
     * place the wire format differs.
     */
    opensAt: quiz.opensAt?.toISOString() ?? null,
    closesAt: quiz.closesAt?.toISOString() ?? null,
    questions: quiz.questions.map((question) => ({
      ...question,
      questionType: asQuestionType(question.questionType),
      options: asStringArray(question.options),
    })),
  }
}

/**
 * Remove a question from a quiz.
 *
 * ## Why this refuses once anybody has answered
 *
 * `QuizAnswer.questionId` cascades. Deleting a question an attempt already
 * answered would therefore delete those answer rows — the attempt keeps its
 * score and its grading snapshot, so the *result* survives, but the per-question
 * breakdown a learner can review would lose entries, and a gradebook would show
 * a submission with fewer questions than it was graded against.
 *
 * A conflict rather than a rule error, because nothing about the request is
 * malformed: it is the state of the world that says no. The message tells the
 * author what to do instead, since "delete" is not the only way to stop asking a
 * question.
 */
export async function deleteQuestion(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    quizId: string
    questionId: string
  },
): Promise<{ ok: true }> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const question = await prisma.question.findFirst({
    where: {
      id: input.questionId,
      quizId: input.quizId,
      quiz: { lesson: { module: { courseId: input.courseId } } },
    },
    select: { id: true, _count: { select: { answers: true } } },
  })

  assertFound('question', question, input.questionId)

  if (question._count.answers > 0) {
    throw new ConflictError(
      'question_answered',
      'Learners have already answered this question, so deleting it would remove their answers from a graded attempt. Edit it instead, or write a new question and leave this one out of the next release.',
    )
  }

  await prisma.question.delete({ where: { id: question.id } })

  return { ok: true }
}
