import { describe, expect, it } from 'vitest'

import {
  type GradingSnapshot,
  type QuestionMarking,
  type QuizMarking,
  gradeAnswer,
  gradeFromSnapshot,
  scoreAttempt,
} from '../grading'

/**
 * The grading rules, stated as a table.
 *
 * Grading is the one piece of legacy behaviour carried forward deliberately
 * rather than rewritten, so the tests serve two purposes: they pin the rules a
 * reader can check against the product intent, and `grading-parity.test.ts`
 * separately asserts this implementation still agrees with the original.
 */
const quiz = (overrides: Partial<QuizMarking> = {}): QuizMarking => ({
  negativeMarking: false,
  defaultNegativeMark: null,
  ...overrides,
})

const question = (
  overrides: Partial<QuestionMarking> = {},
): QuestionMarking => ({
  questionType: 'MULTIPLE_CHOICE',
  correctAnswer: 'b',
  correctAnswers: [],
  points: 4,
  negativePoints: 0,
  partialMarking: false,
  ...overrides,
})

describe('an unanswered question', () => {
  it.each([
    ['MULTIPLE_CHOICE', '', []],
    ['TRUE_FALSE', '', []],
    ['SHORT_ANSWER', '', []],
    ['INTEGER', '', []],
    ['MULTI_SELECT', '', []],
    ['MULTI_SELECT', null as unknown as string, []],
  ] as const)(
    'earns zero and is never penalised, for %s',
    (questionType, answer, answers) => {
      // The rule most likely to be "simplified" into a bug. A blank answer is
      // not a wrong answer, and a learner who skips a question is not
      // penalised — for every question type, even with negative marking on.
      const graded = gradeAnswer(
        question({ questionType, correctAnswers: ['a', 'b'] }),
        { answer, answers },
        quiz({ negativeMarking: true, defaultNegativeMark: 1 }),
      )

      expect(graded.pointsEarned).toBe(0)
      expect(graded.isCorrect).toBe(false)
      expect(graded.isAnswered).toBe(false)
    },
  )
})

describe('MULTIPLE_CHOICE and TRUE_FALSE', () => {
  it('awards full marks for an exact match', () => {
    const graded = gradeAnswer(question(), { answer: 'b' }, quiz())

    expect(graded).toEqual({
      isCorrect: true,
      pointsEarned: 4,
      isAnswered: true,
    })
  })

  it('awards nothing for a wrong answer when negative marking is off', () => {
    expect(gradeAnswer(question(), { answer: 'c' }, quiz()).pointsEarned).toBe(
      0,
    )
  })

  it('deducts the per-question value when negative marking is on', () => {
    const graded = gradeAnswer(
      question({ negativePoints: 1 }),
      { answer: 'c' },
      quiz({ negativeMarking: true }),
    )

    expect(graded.pointsEarned).toBe(-1)
    expect(graded.isCorrect).toBe(false)
  })

  it('falls back to the quiz default when the question sets nothing', () => {
    // The legacy quirk, pinned: a question whose `negativePoints` is 0 falls
    // through to the quiz default. See `negativeDeduction`.
    const graded = gradeAnswer(
      question({ negativePoints: 0 }),
      { answer: 'c' },
      quiz({ negativeMarking: true, defaultNegativeMark: 2 }),
    )

    expect(graded.pointsEarned).toBe(-2)
  })

  it('deducts nothing when the quiz default is null', () => {
    const graded = gradeAnswer(
      question({ negativePoints: 0 }),
      { answer: 'c' },
      quiz({ negativeMarking: true, defaultNegativeMark: null }),
    )

    expect(graded.pointsEarned).toBe(0)
  })

  it('treats TRUE_FALSE as an exact match', () => {
    const scheme = question({
      questionType: 'TRUE_FALSE',
      correctAnswer: 'true',
    })

    expect(gradeAnswer(scheme, { answer: 'true' }, quiz()).isCorrect).toBe(true)
    expect(gradeAnswer(scheme, { answer: 'True' }, quiz()).isCorrect).toBe(
      false,
    )
  })
})

describe('INTEGER', () => {
  const scheme = question({ questionType: 'INTEGER', correctAnswer: '42' })

  it('accepts an exact value', () => {
    expect(gradeAnswer(scheme, { answer: '42' }, quiz()).isCorrect).toBe(true)
  })

  it('accepts within the tolerance', () => {
    // 0.01, matching the legacy engine. Not a rounding convenience: it makes
    // "the answer is 42" gradeable when a learner types 41.999.
    expect(gradeAnswer(scheme, { answer: '42.009' }, quiz()).isCorrect).toBe(
      true,
    )
  })

  it('rejects outside the tolerance', () => {
    expect(gradeAnswer(scheme, { answer: '42.02' }, quiz()).isCorrect).toBe(
      false,
    )
  })

  it('treats a non-numeric answer as wrong rather than blank', () => {
    // The distinction matters: `isAnswered` drives the "you left this blank"
    // message, and typing "forty-two" is not leaving it blank.
    const graded = gradeAnswer(scheme, { answer: 'forty-two' }, quiz())

    expect(graded.isAnswered).toBe(true)
    expect(graded.isCorrect).toBe(false)
  })

  it('penalises a non-numeric answer like any other wrong answer', () => {
    const graded = gradeAnswer(
      question({
        questionType: 'INTEGER',
        correctAnswer: '42',
        negativePoints: 1,
      }),
      { answer: 'nope' },
      quiz({ negativeMarking: true }),
    )

    expect(graded.pointsEarned).toBe(-1)
  })
})

describe('SHORT_ANSWER', () => {
  const scheme = question({
    questionType: 'SHORT_ANSWER',
    correctAnswer: 'Mitochondria',
  })

  it.each([
    ['Mitochondria'],
    ['mitochondria'],
    ['  mitochondria  '],
    ['MITOCHONDRIA'],
  ])('accepts %s', (answer) => {
    expect(gradeAnswer(scheme, { answer }, quiz()).isCorrect).toBe(true)
  })

  it('does not accept a different word', () => {
    expect(
      gradeAnswer(scheme, { answer: 'mitochondrion' }, quiz()).isCorrect,
    ).toBe(false)
  })
})

describe('MULTI_SELECT', () => {
  const scheme = question({
    questionType: 'MULTI_SELECT',
    correctAnswers: ['a', 'b', 'c'],
    points: 4,
  })

  it('awards full marks for the whole key', () => {
    expect(gradeAnswer(scheme, { answers: ['a', 'b', 'c'] }, quiz())).toEqual({
      isCorrect: true,
      pointsEarned: 4,
      isAnswered: true,
    })
  })

  it('accepts the key in any order', () => {
    expect(
      gradeAnswer(scheme, { answers: ['c', 'a', 'b'] }, quiz()).isCorrect,
    ).toBe(true)
  })

  it('treats a repeated selection as the set it represents', () => {
    // `[a, a, b, c]` is the same set as `[a, b, c]`, so it is the full key.
    // A duplicate is a client bug, not a different answer, and failing a
    // learner for it would be punishing them for someone else's defect.
    expect(
      gradeAnswer(scheme, { answers: ['a', 'a', 'b', 'c'] }, quiz()).isCorrect,
    ).toBe(true)
  })

  it('deducts fully when any wrong option is selected', () => {
    // Even with partial marking on: a wrong selection is not partial credit.
    const graded = gradeAnswer(
      question({
        questionType: 'MULTI_SELECT',
        correctAnswers: ['a', 'b', 'c'],
        negativePoints: 1,
        partialMarking: true,
      }),
      { answers: ['a', 'b', 'd'] },
      quiz({ negativeMarking: true }),
    )

    expect(graded.pointsEarned).toBe(-1)
    expect(graded.isCorrect).toBe(false)
  })

  it('awards nothing for a correct subset when partial marking is off', () => {
    expect(
      gradeAnswer(scheme, { answers: ['a', 'b'] }, quiz()).pointsEarned,
    ).toBe(0)
  })

  describe('with partial marking on', () => {
    const partial = question({
      questionType: 'MULTI_SELECT',
      correctAnswers: ['a', 'b', 'c'],
      points: 4,
      partialMarking: true,
    })

    it.each([
      // Rounded to two places, which is what the learner sees.
      [['a'], 1.33],
      [['a', 'b'], 2.67],
      [['a', 'b', 'c'], 4],
    ])('scales %j to %s', (answers, expected) => {
      expect(gradeAnswer(partial, { answers }, quiz()).pointsEarned).toBe(
        expected,
      )
    })

    it('rounds to two decimal places', () => {
      // 3 points over 7 correct options is 0.428571…, and the legacy engine
      // rounded to two places because a learner sees the number.
      const graded = gradeAnswer(
        question({
          questionType: 'MULTI_SELECT',
          correctAnswers: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
          points: 3,
          partialMarking: true,
        }),
        { answers: ['a'] },
        quiz(),
      )

      expect(graded.pointsEarned).toBe(0.43)
    })

    it('never awards full marks for a subset', () => {
      const graded = gradeAnswer(partial, { answers: ['a', 'b'] }, quiz())

      expect(graded.pointsEarned).toBeLessThan(4)
      expect(graded.isCorrect).toBe(false)
    })
  })

  it('treats a quiz with no key as ungradeable rather than passing everyone', () => {
    // Without this guard, `correctSelections.length === correctSet.size` is
    // `0 === 0`, so a submission of nothing at all would score full marks. That
    // is a data error creating a pass, which is worse than a fail.
    const graded = gradeAnswer(
      question({ questionType: 'MULTI_SELECT', correctAnswers: [] }),
      { answers: [] },
      quiz(),
    )

    expect(graded.isCorrect).toBe(false)
    expect(graded.pointsEarned).toBe(0)
  })
})

describe('a question worth zero', () => {
  it('is worth one point, not zero', () => {
    // `points || 1`, matching the legacy engine. Defaulting to zero would mean
    // a misconfigured question silently contributes nothing to the total while
    // still counting towards it, which makes pass marks wrong.
    const graded = gradeAnswer(
      question({ points: 0, correctAnswer: 'b' }),
      { answer: 'b' },
      quiz(),
    )

    expect(graded.pointsEarned).toBe(1)
  })
})

describe('scoreAttempt', () => {
  const snapshot = (
    questions: QuestionMarking[],
    quizMarking: Partial<QuizMarking> = {},
  ): GradingSnapshot => ({
    questions: questions.map((marking, index) => ({
      questionId: `q${index}`,
      marking,
    })),
    quiz: quiz(quizMarking),
  })

  it('sums the questions and totals their maxima', () => {
    const result = scoreAttempt(
      snapshot([
        question({ points: 4 }),
        question({ points: 4 }),
        question({ points: 2 }),
      ]),
      new Map([
        ['q0', { answer: 'b' }],
        ['q1', { answer: 'wrong' }],
      ]),
      70,
    )

    expect(result.score).toBe(4)
    expect(result.totalPoints).toBe(10)
    expect(result.percent).toBe(40)
    expect(result.passed).toBe(false)
  })

  it('clamps the total at zero', () => {
    // The product decision: negative marking is visible per question, but an
    // attempt score is not an exam rank and never reads below zero.
    const result = scoreAttempt(
      snapshot(
        [
          question({ negativePoints: 1 }),
          question({ negativePoints: 1 }),
          question({ negativePoints: 1 }),
        ],
        { negativeMarking: true },
      ),
      new Map([
        ['q0', { answer: 'wrong' }],
        ['q1', { answer: 'wrong' }],
        ['q2', { answer: 'wrong' }],
      ]),
      40,
    )

    expect(result.score).toBe(0)
    expect(result.percent).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('passes exactly at the threshold', () => {
    const result = scoreAttempt(
      snapshot([question({ points: 10 })]),
      new Map([['q0', { answer: 'b' }]]),
      70,
    )

    expect(result.percent).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('fails just below the threshold', () => {
    const result = scoreAttempt(
      snapshot([question({ points: 10 }), question({ points: 4 })]),
      new Map([
        ['q0', { answer: 'b' }],
        ['q1', { answer: 'nope' }],
      ]),
      72,
    )

    // 10/14 is 71.4%, and the boundary is inclusive on the pass side only.
    expect(result.percent).toBeCloseTo(71.43, 1)
    expect(result.passed).toBe(false)
  })

  it('reports zero percent when nothing is worth points', () => {
    // A release with no gradable questions must not divide by zero or pass.
    const result = scoreAttempt(snapshot([]), new Map(), 70)

    expect(result.score).toBe(0)
    expect(result.totalPoints).toBe(0)
    expect(result.percent).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('ignores submissions for questions that are not in the snapshot', () => {
    // The snapshot is the authority. An extra answer — from a stale client, or
    // from a question removed since the attempt began — cannot add points.
    const result = scoreAttempt(
      snapshot([question({ points: 4 })]),
      new Map([
        ['q0', { answer: 'b' }],
        ['q-stale', { answer: 'b' }],
      ]),
      70,
    )

    expect(result.totalPoints).toBe(4)
    expect(result.score).toBe(4)
  })

  it('grades a partially submitted attempt without penalising the gaps', () => {
    const result = scoreAttempt(
      snapshot([question({ points: 4 }), question({ points: 4 })]),
      new Map([['q0', { answer: 'b' }]]),
      40,
    )

    expect(result.score).toBe(4)
    expect(result.percent).toBe(50)
    expect(result.passed).toBe(true)
  })
})

describe('gradeFromSnapshot', () => {
  const snapshot: GradingSnapshot = {
    questions: [{ questionId: 'q1', marking: question({ points: 5 }) }],
    quiz: quiz(),
  }

  it('grades against the stored key', () => {
    expect(gradeFromSnapshot(snapshot, 'q1', { answer: 'b' })).toEqual({
      isCorrect: true,
      pointsEarned: 5,
      isAnswered: true,
    })
  })

  it('returns null for a question that is not in the snapshot', () => {
    // A caller must distinguish "graded as wrong" from "not part of this
    // attempt", or a results view would show a removed question as failed.
    expect(gradeFromSnapshot(snapshot, 'q-absent', { answer: 'b' })).toBeNull()
  })

  it('grades against the snapshot rather than any live quiz', () => {
    // The property that makes an in-progress attempt safe from a published
    // edit: the key is whatever was stored when the attempt started.
    const stale: GradingSnapshot = {
      questions: [
        { questionId: 'q1', marking: question({ correctAnswer: 'z' }) },
      ],
      quiz: quiz(),
    }

    // The helper returns `null` for a question that is not in the snapshot, so
    // the assertions narrow first — the same thing a caller has to do.
    const againstStale = gradeFromSnapshot(stale, 'q1', { answer: 'b' })
    const againstLive = gradeFromSnapshot(snapshot, 'q1', { answer: 'b' })

    expect(againstStale).not.toBeNull()
    expect(againstStale?.isCorrect).toBe(false)
    expect(againstLive?.isCorrect).toBe(true)
  })
})
