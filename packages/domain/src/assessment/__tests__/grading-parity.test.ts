import { describe, expect, it } from 'vitest'

import {
  type QuestionMarking,
  type QuestionType,
  type QuizMarking,
  gradeAnswer,
} from '../grading.js'
import { legacyGradeAnswer } from './legacy-reference.js'

/**
 * Parity with the implementation this replaces.
 *
 * The grading rules are the one piece of behaviour carried forward from the
 * closed-source application rather than rewritten, so "we preserved the
 * semantics" needs to be a test. A difference here is either a bug in the port
 * or a deliberate change that must be documented in `grading.ts` and this file
 * updated to say so — which is exactly why both are committed together.
 *
 * The reference lives in `./legacy-reference.ts`, is a verbatim copy, and is
 * deleted along with `apps/api`.
 */

const QUESTION_TYPES: readonly QuestionType[] = [
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'INTEGER',
]

/** Deterministic pseudo-random source, so a failure is reproducible. */
function makeRandom(seed: number) {
  let state = seed

  return () => {
    // xorshift32. Not for anything but test input generation.
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0xffffffff
  }
}

const random = makeRandom(0x2f6e2b1)

const pick = <T>(values: readonly T[]): T =>
  values[Math.floor(random() * values.length)] as T

const INTEGER_STRINGS = [
  '0',
  '1',
  '-1',
  '42',
  '41.995',
  '42.005',
  '3.14',
  'abc',
  '',
]
const TEXT_STRINGS = [
  'a',
  'b',
  'c',
  'A',
  'B',
  'true',
  'false',
  '',
  '  b  ',
  'nope',
]

function randomQuestion(): QuestionMarking {
  const questionType = pick(QUESTION_TYPES)
  const correctAnswers = ['a', 'b', 'c'].filter(() => random() < 0.6)

  return {
    questionType,
    correctAnswer:
      questionType === 'INTEGER'
        ? pick(['0', '1', '42', '3.14'])
        : pick(TEXT_STRINGS.filter(Boolean)),
    correctAnswers: questionType === 'MULTI_SELECT' ? correctAnswers : [],
    // Include 0 on purpose: it is the value that exposes the `||` quirk.
    points: pick([0, 1, 2, 4, 5, 7]),
    negativePoints: pick([0, 0, 1, 2, 0.5]),
    partialMarking: random() < 0.5,
  }
}

function randomQuiz(): QuizMarking {
  return {
    negativeMarking: random() < 0.5,
    defaultNegativeMark: pick([null, 0, 1, 2]),
  }
}

function randomSubmission(questionType: QuestionType) {
  if (questionType === 'MULTI_SELECT') {
    const count = Math.floor(random() * 4)

    /**
     * Deduplicated, because a checkbox cannot produce a repeated selection.
     *
     * A duplicate is the one input where the two implementations deliberately
     * differ — see the test below — so generating them here would make the
     * parity suite report a difference that only exists for input neither
     * version was designed for.
     */
    const chosen = [
      ...new Set(
        Array.from({ length: count }, () => pick(['a', 'b', 'c', 'd'])),
      ),
    ]

    return { answer: null, answers: chosen }
  }

  return {
    answer:
      questionType === 'INTEGER' ? pick(INTEGER_STRINGS) : pick(TEXT_STRINGS),
    answers: [] as string[],
  }
}

/**
 * Normalise negative zero.
 *
 * `-0 === 0` is true but `expect(-0).toBe(0)` fails, and the legacy engine
 * produces `-0` for a wrong answer when the deduction is zero. That is a
 * representation difference rather than a grading difference, so the comparison
 * removes it instead of asserting it — the implementation itself is separately
 * tested to return `+0`.
 */
const normaliseZero = (value: number): number => (value === 0 ? 0 : value)

/** Drive both implementations with the shapes each of them expects. */
function both(
  marking: QuestionMarking,
  submitted: { answer: string | null; answers: string[] },
  quiz: QuizMarking,
) {
  const answer = submitted.answer ?? ''

  const ours = gradeAnswer(marking, submitted, quiz)

  return {
    /**
     * Reduced to the two fields the legacy function returned. Ours also reports
     * `isAnswered`, which the original had no way to express — comparing the
     * whole object would fail on an addition rather than a difference in
     * grading.
     */
    ours: {
      isCorrect: ours.isCorrect,
      pointsEarned: normaliseZero(ours.pointsEarned),
    },
    theirs: (() => {
      const result = legacyGradeAnswer(
        {
          questionType: marking.questionType,
          correctAnswer: marking.correctAnswer,
          correctAnswers: [...marking.correctAnswers],
          points: marking.points,
          negativePoints: marking.negativePoints,
          partialMarking: marking.partialMarking,
        },
        answer,
        submitted.answers,
        quiz.negativeMarking,
        quiz.defaultNegativeMark,
      )

      return {
        isCorrect: result.isCorrect,
        pointsEarned: normaliseZero(result.pointsEarned),
      }
    })(),
  }
}

describe('grading parity with the legacy implementation', () => {
  it('agrees on a fixed table of cases', () => {
    const cases: Array<{
      name: string
      marking: Partial<QuestionMarking>
      answer: string
      answers: string[]
      quiz: Partial<QuizMarking>
    }> = [
      {
        name: 'unanswered multiple choice, negative marking on',
        marking: {},
        answer: '',
        answers: [],
        quiz: { negativeMarking: true, defaultNegativeMark: 1 },
      },
      {
        name: 'wrong multiple choice with a per-question deduction',
        marking: { negativePoints: 1 },
        answer: 'wrong',
        answers: [],
        quiz: { negativeMarking: true },
      },
      {
        name: 'wrong multiple choice falling back to the quiz default',
        marking: { negativePoints: 0 },
        answer: 'wrong',
        answers: [],
        quiz: { negativeMarking: true, defaultNegativeMark: 2 },
      },
      {
        name: 'correct short answer, different case and padding',
        marking: { questionType: 'SHORT_ANSWER', correctAnswer: ' b ' },
        answer: 'B',
        answers: [],
        quiz: {},
      },
      {
        name: 'integer inside the tolerance',
        marking: { questionType: 'INTEGER', correctAnswer: '42' },
        answer: '42.009',
        answers: [],
        quiz: {},
      },
      {
        name: 'integer outside the tolerance, penalised',
        marking: {
          questionType: 'INTEGER',
          correctAnswer: '42',
          negativePoints: 1,
        },
        answer: '42.02',
        answers: [],
        quiz: { negativeMarking: true },
      },
      {
        name: 'non-numeric integer answer, penalised',
        marking: {
          questionType: 'INTEGER',
          correctAnswer: '42',
          negativePoints: 1,
        },
        answer: 'abc',
        answers: [],
        quiz: { negativeMarking: true },
      },
      {
        name: 'multi-select with the whole key',
        marking: { questionType: 'MULTI_SELECT', correctAnswers: ['a', 'b'] },
        answer: '',
        answers: ['a', 'b'],
        quiz: {},
      },
      {
        name: 'multi-select subset with partial marking',
        marking: {
          questionType: 'MULTI_SELECT',
          correctAnswers: ['a', 'b', 'c'],
          partialMarking: true,
        },
        answer: '',
        answers: ['a'],
        quiz: {},
      },
      {
        name: 'multi-select subset without partial marking',
        marking: {
          questionType: 'MULTI_SELECT',
          correctAnswers: ['a', 'b', 'c'],
        },
        answer: '',
        answers: ['a'],
        quiz: {},
      },
      {
        name: 'multi-select with a wrong option, partial marking on',
        marking: {
          questionType: 'MULTI_SELECT',
          correctAnswers: ['a', 'b'],
          partialMarking: true,
          negativePoints: 1,
        },
        answer: '',
        answers: ['a', 'z'],
        quiz: { negativeMarking: true },
      },
      {
        name: 'multi-select with no selections at all',
        marking: { questionType: 'MULTI_SELECT', correctAnswers: ['a', 'b'] },
        answer: '',
        answers: [],
        quiz: {},
      },
      {
        name: 'a question worth zero points',
        marking: { points: 0 },
        answer: 'b',
        answers: [],
        quiz: {},
      },
    ]

    for (const testCase of cases) {
      const marking: QuestionMarking = {
        questionType: 'MULTIPLE_CHOICE',
        correctAnswer: 'b',
        correctAnswers: [],
        points: 4,
        negativePoints: 0,
        partialMarking: false,
        ...testCase.marking,
      }
      const quizMarking: QuizMarking = {
        negativeMarking: false,
        defaultNegativeMark: null,
        ...testCase.quiz,
      }

      const { ours, theirs } = both(
        marking,
        { answer: testCase.answer, answers: testCase.answers },
        quizMarking,
      )

      expect(ours, testCase.name).toEqual(theirs)
    }
  })

  /**
   * Where the two implementations deliberately disagree, named so that a
   * difference is a documented decision rather than a surprise.
   */
  describe('deliberate divergences from the legacy behaviour', () => {
    it('diffs on one index when a selection repeats a correct answer', () => {
      // The legacy partial-credit calculation counted the *raw* selections,
      // while comparing against the size of the key as a set. Three ticks of
      // one correct option out of a two-option key therefore scored 3/2 —
      // more than the question is worth. Ours deduplicates first, so the same
      // submission scores 1/2.
      const marking: QuestionMarking = {
        questionType: 'MULTI_SELECT',
        correctAnswer: '',
        correctAnswers: ['b', 'c'],
        points: 1,
        negativePoints: 0,
        partialMarking: true,
      }
      const quizMarking: QuizMarking = {
        negativeMarking: false,
        defaultNegativeMark: null,
      }

      const { ours, theirs } = both(
        marking,
        { answer: null, answers: ['b', 'b', 'b'] },
        quizMarking,
      )

      expect(theirs.pointsEarned).toBe(1.5)
      expect(ours.pointsEarned).toBe(0.5)
    })

    it('diffs when a duplicate turns a subset into the whole key', () => {
      // The same counting bug from the other direction: `['a', 'a', 'b']`
      // against a two-option key looks like three correct selections, so the
      // legacy function reported "all correct" for a set that is the whole key
      // only if you ignore the repeat. Ours sees the set `{a, b}`.
      const marking: QuestionMarking = {
        questionType: 'MULTI_SELECT',
        correctAnswer: '',
        correctAnswers: ['a', 'b'],
        points: 4,
        negativePoints: 0,
        partialMarking: false,
      }

      const { ours, theirs } = both(
        marking,
        { answer: null, answers: ['a', 'a', 'b'] },
        { negativeMarking: false, defaultNegativeMark: null },
      )

      expect(theirs.isCorrect).toBe(false)
      expect(ours.isCorrect).toBe(true)
    })

    it('agrees that a multi-select key with no answers is ungradeable', () => {
      // Not a divergence: unreachable vacuous truth was the concern, and it is
      // unreachable because a non-empty selection against an empty key is
      // always a wrong selection. Both implementations refuse it for that
      // reason rather than by a special case.
      const marking: QuestionMarking = {
        questionType: 'MULTI_SELECT',
        correctAnswer: '',
        correctAnswers: [],
        points: 4,
        negativePoints: 0,
        partialMarking: true,
      }

      const { ours, theirs } = both(
        marking,
        { answer: null, answers: ['z'] },
        { negativeMarking: false, defaultNegativeMark: null },
      )

      expect(ours).toEqual(theirs)
      expect(ours.pointsEarned).toBe(0)
      expect(ours.isCorrect).toBe(false)
    })
  })

  it('agrees on 2000 randomised cases', () => {
    for (let index = 0; index < 2000; index += 1) {
      const marking = randomQuestion()
      const quizMarking = randomQuiz()
      const submitted = randomSubmission(marking.questionType)

      const { ours, theirs } = both(marking, submitted, quizMarking)

      expect(
        ours,
        `case ${index}: ${JSON.stringify({ marking, quizMarking, submitted })}`,
      ).toEqual(theirs)
    }
  })

  it('has a randomised corpus that actually exercises negative marking', () => {
    // A parity test that only ever generates "correct, no penalty" proves
    // nothing. This asserts the generator produces the interesting branches, so
    // a future edit to the generator cannot quietly hollow out the test above.
    let negatives = 0
    let partials = 0
    let multiSelect = 0

    for (let index = 0; index < 2000; index += 1) {
      const marking = randomQuestion()
      const quizMarking = randomQuiz()
      const submitted = randomSubmission(marking.questionType)

      const { ours } = both(marking, submitted, quizMarking)

      if (ours.pointsEarned < 0) negatives += 1
      if (ours.pointsEarned > 0 && !ours.isCorrect) partials += 1
      if (marking.questionType === 'MULTI_SELECT') multiSelect += 1
    }

    expect(negatives).toBeGreaterThan(50)
    expect(partials).toBeGreaterThan(20)
    expect(multiSelect).toBeGreaterThan(200)
  })
})
