import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../../db.js'
import type { Principal } from '../../authorization/principal.js'
import { ConflictError, ForbiddenError } from '../../shared/errors.js'
import { createAcademy, createWorkspace } from '../../tenancy/academies.js'
import {
  createCourse,
  createLesson,
  createModule,
} from '../../content/drafts.js'
import { publishCourse } from '../../content/publishing.js'
import { enroll, getCourseProgress } from '../../learning/enrollment.js'
import {
  getQuizForLearner,
  listAttempts,
  startAttempt,
  submitAttempt,
  upsertQuestion,
  upsertQuiz,
  upsertSection,
} from '../attempts.js'
import {
  gradeSubmission,
  listSubmissions,
  submitAssignment,
  upsertAssignment,
} from '../assignments.js'

/**
 * The assessment half of the loop.
 *
 * The properties that matter are not "a correct answer scores points" — the
 * grading engine's own tests cover that exhaustively — but the ones around it:
 * the answer key never leaves the server, an attempt is graded against the quiz
 * as it stood when it began, limits and windows are enforced from server-side
 * state, and a double submit produces one grade.
 */

let workspaceId: string
let academyId: string
let ownerUserId: string
let learnerId: string
let courseId: string
let quizLessonId: string
let assignmentLessonId: string
let questionOneId: string
let questionTwoId: string

const owner = (): Principal => ({
  kind: 'staff',
  userId: ownerUserId,
  workspaceId,
  memberId: 'unused',
  role: 'owner',
})

const learner = (): Principal => ({
  kind: 'learner',
  learnerId,
  academyId,
})

const tag = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

/** A course with a two-question quiz, an assignment, and an enrolled learner. */
async function buildCourse(
  options: {
    quiz?: Partial<{
      maxAttempts: number | null
      timeLimitMinutes: number | null
      opensAt: Date | null
      closesAt: Date | null
      negativeMarking: boolean
      defaultNegativeMark: number | null
    }>
    withQuiz?: boolean
    withAssignment?: boolean
  } = {},
) {
  const suffix = tag()

  const course = await createCourse(owner(), {
    workspaceId,
    academyId,
    title: `Assessed ${suffix}`,
    slug: `assessed-${suffix}`,
  })

  const module = await createModule(owner(), {
    workspaceId,
    academyId,
    courseId: course.id,
    title: 'Module',
  })

  await createLesson(owner(), {
    workspaceId,
    academyId,
    courseId: course.id,
    moduleId: module.id,
    title: 'Reading',
    contentType: 'TEXT',
    body: '<p>Read this.</p>',
  })

  let createdQuizId: string | null = null
  let quizLesson: string | null = null
  const questionIds: string[] = []

  if (options.withQuiz !== false) {
    const lesson = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Quiz',
      contentType: 'QUIZ',
    })
    quizLesson = lesson.id

    const quiz = await upsertQuiz(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      lessonId: lesson.id,
      title: 'Check yourself',
      passingPercent: 70,
      ...options.quiz,
    })
    createdQuizId = quiz.id

    const section = await upsertSection(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      quizId: quiz.id,
      title: 'Part one',
    })

    const first = await upsertQuestion(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      quizId: quiz.id,
      sectionId: section.id,
      prompt: 'What is 2 + 2?',
      questionType: 'INTEGER',
      correctAnswer: '4',
      points: 4,
      negativePoints: 1,
    })

    const second = await upsertQuestion(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      quizId: quiz.id,
      prompt: 'Which are prime?',
      questionType: 'MULTI_SELECT',
      options: ['2', '3', '4'],
      correctAnswer: '',
      correctAnswers: ['2', '3'],
      points: 4,
      partialMarking: true,
    })

    questionIds.push(first.id, second.id)
  }

  let assignmentLesson: string | null = null

  if (options.withAssignment) {
    const lesson = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Essay',
      contentType: 'ASSIGNMENT',
    })
    assignmentLesson = lesson.id

    await upsertAssignment(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      lessonId: lesson.id,
      title: 'Explain a machine',
      instructions: 'In 200 words.',
      totalPoints: 100,
    })
  }

  await publishCourse(owner(), { workspaceId, academyId, courseId: course.id })

  return {
    courseId: course.id,
    quizId: createdQuizId,
    quizLesson,
    assignmentLesson,
    questionIds,
  }
}

beforeAll(async () => {
  const suffix = tag()

  const user = await prisma.staffUser.create({
    data: {
      id: `u-${suffix}`,
      name: 'Owner',
      email: `assess-${suffix}@example.com`,
    },
  })
  ownerUserId = user.id

  const workspace = await createWorkspace({
    name: 'Assessment',
    slug: `assessment-${suffix}`,
    ownerUserId,
  })
  workspaceId = workspace.id

  const academy = await createAcademy(owner(), workspaceId, {
    name: 'Assessment Academy',
    slug: `assessment-academy-${suffix}`,
  })
  academyId = academy.id

  const learnerRow = await prisma.learner.create({
    data: {
      id: `l-${suffix}`,
      academyId,
      name: 'Alan Turing',
      email: `alan-${suffix}@example.com`,
    },
  })
  learnerId = learnerRow.id

  // The main course, whose ids the tests below use directly.
  const built = await buildCourse({
    withQuiz: true,
    withAssignment: true,
    quiz: { maxAttempts: 2, negativeMarking: true, defaultNegativeMark: 1 },
  })

  courseId = built.courseId
  quizLessonId = built.quizLesson!
  assignmentLessonId = built.assignmentLesson!
  questionOneId = built.questionIds[0]!
  questionTwoId = built.questionIds[1]!

  await enroll(learner(), { workspaceId, academyId, courseId, learnerId })
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.staffUser.deleteMany({ where: { id: ownerUserId } })
  await prisma.$disconnect()
})

describe('getQuizForLearner', () => {
  it('never includes the answer key', async () => {
    const view = await getQuizForLearner(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    /**
     * Inspected as serialised JSON rather than field by field, because a nested
     * field is exactly what a per-field assertion misses.
     *
     * The check is for the *key names*, not for the key's value: `"4"` is a
     * legitimate option of the multi-select question, so asserting its absence
     * would be asserting that a real option had gone missing. What must not
     * appear is a field called `correctAnswer` or `correctAnswers`.
     */
    const serialised = JSON.stringify(view)

    expect(serialised).not.toContain('correctAnswer')
    expect(serialised).not.toContain('correctAnswers')
    expect(view.questions).toHaveLength(2)

    // And the integer question, whose answer is `4`, carries no field holding
    // it: options are empty and there is nowhere else for a key to hide.
    const integer = view.questions.find((q) => q.questionType === 'INTEGER')
    expect(integer?.options).toEqual([])
    expect(Object.keys(integer ?? {})).not.toContain('correctAnswer')
  })

  it('includes the sections and the options', async () => {
    const view = await getQuizForLearner(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    expect(view.sections).toHaveLength(1)
    expect(
      view.questions.find((q) => q.questionType === 'MULTI_SELECT')?.options,
    ).toEqual(['2', '3', '4'])
  })

  it('reports the attempt limit and how many remain', async () => {
    const view = await getQuizForLearner(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    expect(view.maxAttempts).toBe(2)
    expect(view.attemptsRemaining).toBe(2)
  })

  it('refuses a learner with no access to the course', async () => {
    const other = await prisma.learner.create({
      data: {
        id: `l-x-${tag()}`,
        academyId,
        name: 'No Access',
        email: `noaccess-${tag()}@example.com`,
      },
    })

    await expect(
      getQuizForLearner(
        { kind: 'learner', learnerId: other.id, academyId },
        { academyId, learnerId: other.id, lessonId: quizLessonId },
      ),
    ).rejects.toThrow(/do not have access/)
  })
})

describe('startAttempt', () => {
  it('creates an attempt with the grading snapshot', async () => {
    const { attempt, resumed } = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    expect(resumed).toBe(false)
    expect(attempt.attemptNumber).toBe(1)
    expect(attempt.totalPoints).toBe(8)

    const stored = await prisma.quizAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      select: { gradingSnapshot: true },
    })

    const snapshot = stored.gradingSnapshot as {
      questions: { questionId: string }[]
      quiz: { negativeMarking: boolean }
    }

    expect(snapshot.questions).toHaveLength(2)
    expect(snapshot.quiz.negativeMarking).toBe(true)
  })

  it('resumes an open attempt rather than starting a new one', async () => {
    // A learner who closes a tab should return to where they were, not consume
    // another of their slots.
    const { attempt, resumed } = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    expect(resumed).toBe(true)
    expect(attempt.attemptNumber).toBe(1)
  })

  it('refuses a quiz that has not opened yet', async () => {
    const future = await buildCourse({
      quiz: { opensAt: new Date(Date.now() + 86_400_000) },
    })
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: future.courseId,
      learnerId,
    })

    await expect(
      startAttempt(learner(), {
        academyId,
        learnerId,
        lessonId: future.quizLesson!,
      }),
    ).rejects.toThrow(/opens on/)
  })

  it('refuses a quiz that has closed', async () => {
    const past = await buildCourse({
      quiz: { closesAt: new Date(Date.now() - 86_400_000) },
    })
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: past.courseId,
      learnerId,
    })

    await expect(
      startAttempt(learner(), {
        academyId,
        learnerId,
        lessonId: past.quizLesson!,
      }),
    ).rejects.toThrow(/closed on/)
  })
})

describe('submitAttempt', () => {
  it('grades against the snapshot and reports per-question detail', async () => {
    const { attempt } = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    const result = await submitAttempt(learner(), {
      academyId,
      learnerId,
      attemptId: attempt.id,
      answers: [
        { questionId: questionOneId, answer: '4' },
        { questionId: questionTwoId, answers: ['2', '3'] },
      ],
    })

    expect(result.attempt.score).toBe(8)
    expect(result.percent).toBe(100)
    expect(result.attempt.passed).toBe(true)
    expect(result.questions).toHaveLength(2)
  })

  it('does not leak the answer key in a result', async () => {
    const { attempt } = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    const result = await submitAttempt(learner(), {
      academyId,
      learnerId,
      attemptId: attempt.id,
      answers: [{ questionId: questionOneId, answer: 'wrong' }],
    })

    // A results view may say which questions were right. It may not say what
    // the right answers were, because `maxAttempts` allows another attempt —
    // and the explanation is authored for the learner, so it stays.
    const serialised = JSON.stringify(result)

    expect(serialised).not.toContain('correctAnswer')
    expect(serialised).not.toContain('correctAnswers')
  })

  it('is idempotent: a second submit returns the stored result', async () => {
    // A double-click must not produce two grades, or a score that depends on
    // which request arrived second.
    //
    // On its own course: the shared one has `maxAttempts: 2` and the tests
    // above have used them, so reusing it here would fail on the limit rather
    // than on the property under test.
    const course = await buildCourse({ quiz: { maxAttempts: 5 } })
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: course.courseId,
      learnerId,
    })

    const { attempt } = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: course.quizLesson!,
    })

    const first = await submitAttempt(learner(), {
      academyId,
      learnerId,
      attemptId: attempt.id,
      answers: [{ questionId: course.questionIds[0]!, answer: '4' }],
    })

    const second = await submitAttempt(learner(), {
      academyId,
      learnerId,
      attemptId: attempt.id,
      answers: [{ questionId: course.questionIds[0]!, answer: 'nonsense' }],
    })

    expect(second.attempt.score).toBe(first.attempt.score)
    expect(second.attempt.submittedAt?.getTime()).toBe(
      first.attempt.submittedAt?.getTime(),
    )
  })

  it('clamps the total at zero with negative marking', async () => {
    const negative = await buildCourse({
      quiz: { negativeMarking: true, defaultNegativeMark: 4 },
    })
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: negative.courseId,
      learnerId,
    })

    const started = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: negative.quizLesson!,
    })

    const questions = await prisma.question.findMany({
      where: { quizId: negative.quizId! },
      select: { id: true },
    })

    const result = await submitAttempt(learner(), {
      academyId,
      learnerId,
      attemptId: started.attempt.id,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: 'wrong',
        answers: ['wrong'],
      })),
    })

    // Every question wrong and heavily penalised: the attempt score is zero,
    // not negative.
    expect(result.attempt.score).toBe(0)
    expect(result.percent).toBe(0)
    expect(result.attempt.passed).toBe(false)

    // The per-question negatives are still visible, which is the information a
    // learner needs to understand the result.
    expect(
      result.questions.every((question) => question.pointsEarned < 0),
    ).toBe(true)
  })

  it('grades against the snapshot after the quiz is edited', async () => {
    // The property the whole design exists for. The legacy application graded
    // against the live quiz, so fixing a typo in an answer key regraded every
    // historical attempt.
    const course = await buildCourse({})
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: course.courseId,
      learnerId,
    })

    const question = await prisma.question.findFirstOrThrow({
      where: { quizId: course.quizId! },
      select: { id: true },
    })

    const started = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: course.quizLesson!,
    })

    // The author changes the key mid-attempt.
    await upsertQuestion(owner(), {
      workspaceId,
      academyId,
      courseId: course.courseId,
      quizId: course.quizId!,
      questionId: question.id,
      prompt: 'What is 2 + 2?',
      questionType: 'INTEGER',
      correctAnswer: '5',
      points: 4,
    })

    const result = await submitAttempt(learner(), {
      academyId,
      learnerId,
      attemptId: started.attempt.id,
      answers: [{ questionId: question.id, answer: '4' }],
    })

    // Correct against the snapshot, which is what the learner was answering.
    expect(result.questions[0]?.isCorrect).toBe(true)
  })
})

describe('attempt limits', () => {
  it('counts completed attempts, so an abandoned one does not consume a slot', async () => {
    const limited = await buildCourse({ quiz: { maxAttempts: 1 } })
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: limited.courseId,
      learnerId,
    })

    // Start and abandon twice.
    await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: limited.quizLesson!,
    })
    await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: limited.quizLesson!,
    })

    const view = await getQuizForLearner(learner(), {
      academyId,
      learnerId,
      lessonId: limited.quizLesson!,
    })

    expect(view.attemptsRemaining).toBe(1)
  })

  it('refuses once the limit is reached', async () => {
    const limited = await buildCourse({ quiz: { maxAttempts: 1 } })
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: limited.courseId,
      learnerId,
    })

    const question = await prisma.question.findFirstOrThrow({
      where: { quizId: limited.quizId! },
      select: { id: true },
    })

    const started = await startAttempt(learner(), {
      academyId,
      learnerId,
      lessonId: limited.quizLesson!,
    })

    await submitAttempt(learner(), {
      academyId,
      learnerId,
      attemptId: started.attempt.id,
      answers: [{ questionId: question.id, answer: 'wrong' }],
    })

    await expect(
      startAttempt(learner(), {
        academyId,
        learnerId,
        lessonId: limited.quizLesson!,
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })
})

describe('listAttempts', () => {
  it('returns the learner’s own history', async () => {
    const { attempts, passingPercent } = await listAttempts(learner(), {
      academyId,
      learnerId,
      lessonId: quizLessonId,
    })

    expect(attempts.length).toBeGreaterThan(0)
    expect(passingPercent).toBe(70)
  })

  it('refuses to read another learner’s history', async () => {
    const other = await prisma.learner.create({
      data: {
        id: `l-y-${tag()}`,
        academyId,
        name: 'Other',
        email: `other-${tag()}@example.com`,
      },
    })

    await expect(
      listAttempts(learner(), {
        academyId,
        learnerId: other.id,
        lessonId: quizLessonId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})

describe('assignments', () => {
  it('accepts a written submission', async () => {
    const submission = await submitAssignment(learner(), {
      academyId,
      learnerId,
      lessonId: assignmentLessonId,
      content: 'A machine is a thing that does work.',
    })

    expect(submission.grade).toBeNull()
    expect(submission.gradedAt).toBeNull()
  })

  it('replaces an ungraded submission', async () => {
    const submission = await submitAssignment(learner(), {
      academyId,
      learnerId,
      lessonId: assignmentLessonId,
      content: 'A machine is a device that transmits or modifies force.',
    })

    expect(submission.gradedAt).toBeNull()
    expect(submission.content).toContain('transmits')
  })

  it('refuses an empty submission', async () => {
    await expect(
      submitAssignment(learner(), {
        academyId,
        learnerId,
        lessonId: assignmentLessonId,
        content: '   ',
      }),
    ).rejects.toThrow(/written work or a file/)
  })

  it('grades within the point range', async () => {
    const submission = await prisma.assignmentSubmission.findFirstOrThrow({
      where: { learnerId, assignment: { lessonId: assignmentLessonId } },
      select: { id: true },
    })

    const graded = await gradeSubmission(owner(), {
      workspaceId,
      academyId,
      submissionId: submission.id,
      grade: 85,
      feedback: 'Good, but be more specific.',
    })

    expect(graded.grade).toBe(85)
    expect(graded.gradedById).toBe(ownerUserId)
  })

  it('refuses a grade above the assignment total', async () => {
    const submission = await prisma.assignmentSubmission.findFirstOrThrow({
      where: { learnerId, assignment: { lessonId: assignmentLessonId } },
      select: { id: true },
    })

    await expect(
      gradeSubmission(owner(), {
        workspaceId,
        academyId,
        submissionId: submission.id,
        grade: 101,
      }),
    ).rejects.toThrow(/between 0 and 100/)
  })

  it('refuses a resubmission once graded', async () => {
    // Silently overwriting a graded submission would leave a grade attached to
    // work the learner can no longer see.
    await expect(
      submitAssignment(learner(), {
        academyId,
        learnerId,
        lessonId: assignmentLessonId,
        content: 'Actually, here is a better answer.',
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('does not complete the lesson as a side effect of grading', async () => {
    // The legacy application did exactly this, so a marker's action silently
    // changed a learner's progress.
    const progress = await getCourseProgress(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    const assignmentProgress = progress.lessons.find(
      (lesson) => lesson.lessonId === assignmentLessonId,
    )

    expect(assignmentProgress?.isCompleted ?? false).toBe(false)
  })

  it('lists submissions for a gradebook', async () => {
    const { assignment, submissions } = await listSubmissions(owner(), {
      workspaceId,
      academyId,
      lessonId: assignmentLessonId,
    })

    expect(assignment.totalPoints).toBe(100)
    expect(submissions).toHaveLength(1)
    expect(submissions[0]?.learnerName).toBe('Alan Turing')
    expect(submissions[0]?.grade).toBe(85)
  })

  it('filters by graded status', async () => {
    const ungraded = await listSubmissions(owner(), {
      workspaceId,
      academyId,
      lessonId: assignmentLessonId,
      status: 'ungraded',
    })

    expect(ungraded.submissions).toHaveLength(0)

    const graded = await listSubmissions(owner(), {
      workspaceId,
      academyId,
      lessonId: assignmentLessonId,
      status: 'graded',
    })

    expect(graded.submissions).toHaveLength(1)
  })

  it('refuses a submission after the due date', async () => {
    const course = await buildCourse({ withAssignment: true, withQuiz: false })
    await enroll(learner(), {
      workspaceId,
      academyId,
      courseId: course.courseId,
      learnerId,
    })

    await upsertAssignment(owner(), {
      workspaceId,
      academyId,
      courseId: course.courseId,
      lessonId: course.assignmentLesson!,
      title: 'Late work',
      totalPoints: 10,
      dueAt: new Date(Date.now() - 86_400_000),
    })

    await expect(
      submitAssignment(learner(), {
        academyId,
        learnerId,
        lessonId: course.assignmentLesson!,
        content: 'Sorry I am late.',
      }),
    ).rejects.toThrow(/was due on/)
  })

  it('refuses grading across academies', async () => {
    const submission = await prisma.assignmentSubmission.findFirstOrThrow({
      where: { learnerId, assignment: { lessonId: assignmentLessonId } },
      select: { id: true },
    })

    const otherAcademy = await prisma.academy.create({
      data: { workspaceId, name: 'Elsewhere', slug: `elsewhere-${tag()}` },
    })

    await expect(
      gradeSubmission(owner(), {
        workspaceId,
        academyId: otherAcademy.id,
        submissionId: submission.id,
        grade: 50,
      }),
    ).rejects.toThrow()

    await prisma.academy.delete({ where: { id: otherAcademy.id } })
  })

  it('refuses an owner of another workspace', async () => {
    const submission = await prisma.assignmentSubmission.findFirstOrThrow({
      where: { learnerId, assignment: { lessonId: assignmentLessonId } },
      select: { id: true },
    })

    await expect(
      gradeSubmission(
        {
          kind: 'staff',
          userId: 'u-x',
          workspaceId: 'ws-x',
          memberId: 'm',
          role: 'owner',
        },
        { workspaceId, academyId, submissionId: submission.id, grade: 50 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})
