/**
 * Quiz grading.
 *
 * A pure function over a question's marking scheme and a set of answers, with
 * no database access and no notion of who is asking. Everything that needs a
 * decision — attempt limits, time windows, whether the learner is entitled to
 * the course — happens before this is called.
 *
 * ## Why the rules live here and not in a controller
 *
 * The legacy application had these rules inside a 764-line HTTP controller,
 * which is why they were hard to test and impossible to reuse. They are the
 * same rules: exam-style marking with negative marking and optional partial
 * credit, carried forward deliberately rather than invented, because a
 * platform that aspires to replace commercial LMS products for exam
 * preparation has to get them right. `__tests__/legacy-reference.ts` holds a
 * frozen copy of the original function and the parity test asserts this
 * implementation agrees with it.
 *
 * ## Scoring
 *
 * Per question, `pointsEarned` can be negative when negative marking is on.
 * Per attempt, the total is clamped at zero — see `scoreAttempt` — because an
 * attempt score is not an exam rank, and a learner whose total reads `-3` has
 * been told something confusing rather than something useful.
 *
 * An unanswered question is never negative, for any question type. That is
 * worth stating explicitly because it is the rule most likely to be
 * "simplified" into a bug: a blank answer is not a wrong answer.
 */

/** The question types the platform supports. */
export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'INTEGER',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

/**
 * The marking scheme for one question.
 *
 * This is what gets snapshotted onto an attempt when it starts, so a later edit
 * to the published quiz cannot regrade an attempt that is already underway.
 */
export type QuestionMarking = {
  questionType: QuestionType
  /** The key for single-answer types. */
  correctAnswer: string
  /** The key for `MULTI_SELECT`. */
  correctAnswers: readonly string[]
  points: number
  negativePoints: number
  partialMarking: boolean
}

/** The rules that apply to the whole quiz. */
export type QuizMarking = {
  negativeMarking: boolean
  defaultNegativeMark: number | null
}

/** What a learner submitted for one question. */
export type SubmittedAnswer = {
  /** Single-answer types. */
  answer?: string | null
  /** `MULTI_SELECT`. */
  answers?: readonly string[] | null
}

export type GradedAnswer = {
  isCorrect: boolean
  /**
   * May be negative. Callers that display a running total should clamp it the
   * same way `scoreAttempt` does.
   */
  pointsEarned: number
  /** True when nothing was submitted, so a caller can distinguish blank from wrong. */
  isAnswered: boolean
}

/** Decimal places for partial credit. Two, matching the legacy behaviour. */
const PARTIAL_CREDIT_PRECISION = 100

/** Tolerance for numeric answers, matching the legacy behaviour. */
const INTEGER_TOLERANCE = 0.01

/**
 * The negative deduction that applies to a wrong answer.
 *
 * ## The `||`, and why it is not a `??`
 *
 * This reproduces the legacy behaviour exactly, including a quirk. The original
 * expression was `question.negativePoints || quiz.defaultNegativeMark || 0`, so
 * a question whose `negativePoints` is `0` falls through to the quiz default
 * rather than opting out of it.
 *
 * Changing that to `??` looks like a cleanup and is actually a behaviour change
 * that would silently raise or lower the marks of every existing question,
 * because the column defaults to `0` — so "unset" and "explicitly zero" are the
 * same value and there is no way to tell them apart in the data. Whether this
 * should change is a product decision about what a per-question override means,
 * and it is not one to make inside a port. The parity test asserts the current
 * behaviour, so a future change to it will be deliberate and visible.
 *
 * The quiz-level switch is checked first, so turning negative marking off truly
 * means off regardless of any per-question value.
 */
function negativeDeduction(
  question: QuestionMarking,
  quiz: QuizMarking,
): number {
  if (!quiz.negativeMarking) return 0

  return question.negativePoints || quiz.defaultNegativeMark || 0
}

/** The points a fully correct answer earns. A question worth 0 is worth 1. */
function maxPoints(question: QuestionMarking): number {
  return question.points || 1
}

function isAnswered(
  question: QuestionMarking,
  submitted: SubmittedAnswer,
): boolean {
  if (question.questionType === 'MULTI_SELECT') {
    return (submitted.answers?.length ?? 0) > 0
  }

  return Boolean(submitted.answer)
}

/**
 * Grade one answer.
 *
 * Returns a value for every combination of question type and submission; there
 * is no path that throws on learner input, because the input is a learner's.
 */
export function gradeAnswer(
  question: QuestionMarking,
  submitted: SubmittedAnswer,
  quiz: QuizMarking,
): GradedAnswer {
  if (!isAnswered(question, submitted)) {
    // Not a wrong answer. No deduction, for every type.
    return { isCorrect: false, pointsEarned: 0, isAnswered: false }
  }

  const points = maxPoints(question)
  const deduction = negativeDeduction(question, quiz)

  const correct = (): GradedAnswer => ({
    isCorrect: true,
    pointsEarned: points,
    isAnswered: true,
  })

  const wrong = (): GradedAnswer => ({
    isCorrect: false,
    /**
     * `+ 0` is not decoration. `-deduction` where the deduction is zero is
     * negative zero, which `toBe(0)` distinguishes from `0` in every test
     * assertion and which will serialise to the client as `-0` in JSON. Adding
     * zero normalises it without changing any nonzero value.
     */
    pointsEarned: -deduction + 0,
    isAnswered: true,
  })

  switch (question.questionType) {
    case 'MULTI_SELECT': {
      /**
       * Deduplicated on the way in.
       *
       * The selection is a set, so `['a', 'a', 'b', 'c']` for a key of
       * `['a', 'b', 'c']` is the whole key and not a subset. Treating a
       * duplicate as a partial selection would fail a learner for a defect in
       * whatever built the payload, which is a worse outcome than ignoring a
       * repeated tick that the checkbox UI cannot produce anyway.
       */
      const chosen = [...new Set(submitted.answers ?? [])]
      const correctSet = new Set(question.correctAnswers)

      /**
       * There is deliberately no "the quiz has no key" guard here.
       *
       * An empty key looks dangerous — `correctSelections.length ===
       * correctSet.size` is `0 === 0` — but reaching that comparison requires
       * `isAnswered`, and for a multi-select that means a non-empty selection,
       * every element of which is then a wrong selection against an empty key.
       * The wrong-selection branch returns first. The vacuous comparison is
       * unreachable, so a guard for it would be dead code asserting a
       * hypothetical rather than a property.
       */
      const wrongSelections = chosen.filter((answer) => !correctSet.has(answer))
      if (wrongSelections.length > 0) return wrong()

      const correctSelections = chosen.filter((answer) =>
        correctSet.has(answer),
      )

      if (correctSelections.length === correctSet.size) {
        return correct()
      }

      if (question.partialMarking && correctSelections.length > 0) {
        // Proportional, as the legacy engine did it: full marks scaled by the
        // fraction of the key that was selected, rounded to two places.
        const earned =
          Math.round(
            points *
              (correctSelections.length / correctSet.size) *
              PARTIAL_CREDIT_PRECISION,
          ) / PARTIAL_CREDIT_PRECISION

        return { isCorrect: false, pointsEarned: earned, isAnswered: true }
      }

      // All-or-nothing when partial marking is off: a subset is not credit.
      return { isCorrect: false, pointsEarned: 0, isAnswered: true }
    }

    case 'INTEGER': {
      const expected = Number(question.correctAnswer)
      const given = Number(submitted.answer)

      if (!Number.isFinite(given) || !Number.isFinite(expected)) {
        // Answered with something that is not a number, which is wrong rather
        // than blank.
        return wrong()
      }

      return Math.abs(expected - given) <= INTEGER_TOLERANCE
        ? correct()
        : wrong()
    }

    case 'SHORT_ANSWER': {
      const expected = question.correctAnswer.trim().toLowerCase()
      const given = (submitted.answer ?? '').trim().toLowerCase()

      return expected === given ? correct() : wrong()
    }

    case 'TRUE_FALSE':
    case 'MULTIPLE_CHOICE':
    default:
      return question.correctAnswer === submitted.answer ? correct() : wrong()
  }
}

/** One question as it stood when the attempt began. */
export type SnapshotQuestion = {
  questionId: string
  marking: QuestionMarking
}

/**
 * The grading rules and answer key, as of the moment an attempt started.
 *
 * Stored on the attempt row. This is what makes a published edit unable to
 * rewrite an attempt already in progress: grading reads this, never the live
 * quiz.
 */
export type GradingSnapshot = {
  questions: SnapshotQuestion[]
  quiz: QuizMarking
}

export type AttemptScore = {
  /** Clamped at zero. */
  score: number
  /** The sum of every question's maximum, from the snapshot. */
  totalPoints: number
  /** `score / totalPoints`, clamped to 0–100. Zero when nothing is worth points. */
  percent: number
  passed: boolean
}

/**
 * Score a whole attempt.
 *
 * The total is clamped at zero. Per-question `pointsEarned` values are *not*
 * clamped — an individual negative is real information and the UI shows it —
 * but the attempt score is what a learner sees as their result, and a negative
 * result is not a thing an exam produces.
 *
 * `passingPercent` is compared against the clamped percentage, so an attempt
 * that earned nothing is at 0% and cannot pass by having been penalised into
 * the negative.
 */
export function scoreAttempt(
  snapshot: GradingSnapshot,
  submissions: ReadonlyMap<string, SubmittedAnswer>,
  passingPercent: number,
): AttemptScore {
  let raw = 0
  let totalPoints = 0

  for (const question of snapshot.questions) {
    totalPoints += maxPoints(question.marking)

    const submitted = submissions.get(question.questionId) ?? {}
    raw += gradeAnswer(question.marking, submitted, snapshot.quiz).pointsEarned
  }

  const score = Math.max(0, raw)
  const percent =
    totalPoints > 0
      ? Math.min(100, Math.max(0, (score / totalPoints) * 100))
      : 0

  return {
    score,
    totalPoints,
    percent,
    passed: percent >= passingPercent,
  }
}

/**
 * Grade one answer against a snapshot's stored key.
 *
 * This is what a results view uses to show which questions were right, without
 * the answer key ever being sent to the client.
 */
export function gradeFromSnapshot(
  snapshot: GradingSnapshot,
  questionId: string,
  submitted: SubmittedAnswer,
): GradedAnswer | null {
  const question = snapshot.questions.find(
    (entry) => entry.questionId === questionId,
  )
  if (!question) return null

  return gradeAnswer(question.marking, submitted, snapshot.quiz)
}
