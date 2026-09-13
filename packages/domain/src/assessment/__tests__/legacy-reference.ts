/**
 * A frozen copy of the legacy grading function, used only to prove parity.
 *
 * This is `gradeAnswer` from
 * `apps/api/src/controllers/studentQuiz.controller.ts:658-763` in the
 * closed-source application this repository replaces, reproduced verbatim apart
 * from formatting and an explicit return type. It is here for one reason: the
 * grading rules are the single piece of behaviour worth carrying forward
 * unchanged, and "we preserved the semantics" is a claim that should be a test
 * rather than a promise.
 *
 * It is deliberately not imported or exported anywhere except the parity test,
 * and it is deleted along with `apps/api`. Nothing new should call it, and
 * nothing should be fixed in it — a bug found here that is not also a bug in
 * `grading.ts` is a difference the parity test exists to expose.
 *
 * It is pure: no Prisma, no Express, no tenant. That is why it could be lifted
 * at all.
 */
export function legacyGradeAnswer(
  question: {
    questionType: string
    correctAnswer: string
    correctAnswers: string[]
    points: number
    negativePoints: number
    partialMarking: boolean
  },
  userAnswer: string,
  userAnswers: string[],
  quizNegativeMarking: boolean,
  defaultNegativeMark: number | null,
): { isCorrect: boolean; pointsEarned: number } {
  const maxPoints = question.points || 1
  const negPoints = question.negativePoints || defaultNegativeMark || 0

  const isAttempted =
    question.questionType === 'MULTI_SELECT'
      ? userAnswers.length > 0
      : !!userAnswer

  if (!isAttempted) {
    return { isCorrect: false, pointsEarned: 0 }
  }

  switch (question.questionType) {
    case 'MULTI_SELECT': {
      const correctSet = new Set(question.correctAnswers)

      const wrongSelections = userAnswers.filter((a) => !correctSet.has(a))
      const correctSelections = userAnswers.filter((a) => correctSet.has(a))

      if (wrongSelections.length > 0) {
        return {
          isCorrect: false,
          pointsEarned: quizNegativeMarking ? -negPoints : 0,
        }
      }

      if (correctSelections.length === correctSet.size) {
        return { isCorrect: true, pointsEarned: maxPoints }
      }

      if (question.partialMarking && correctSelections.length > 0) {
        const partialPoints =
          Math.round(
            maxPoints * (correctSelections.length / correctSet.size) * 100,
          ) / 100
        return { isCorrect: false, pointsEarned: partialPoints }
      }

      return { isCorrect: false, pointsEarned: 0 }
    }

    case 'INTEGER': {
      const correctNum = Number(question.correctAnswer)
      const userNum = Number(userAnswer)
      if (isNaN(userNum)) {
        return {
          isCorrect: false,
          pointsEarned: quizNegativeMarking ? -negPoints : 0,
        }
      }
      const isCorrect = Math.abs(correctNum - userNum) <= 0.01
      if (isCorrect) {
        return { isCorrect: true, pointsEarned: maxPoints }
      }
      return {
        isCorrect: false,
        pointsEarned: quizNegativeMarking ? -negPoints : 0,
      }
    }

    case 'SHORT_ANSWER': {
      const isCorrect =
        question.correctAnswer.trim().toLowerCase() ===
        userAnswer.trim().toLowerCase()
      if (isCorrect) {
        return { isCorrect: true, pointsEarned: maxPoints }
      }
      return {
        isCorrect: false,
        pointsEarned: quizNegativeMarking ? -negPoints : 0,
      }
    }

    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
    default: {
      const isCorrect = question.correctAnswer === userAnswer
      if (isCorrect) {
        return { isCorrect: true, pointsEarned: maxPoints }
      }
      return {
        isCorrect: false,
        pointsEarned: quizNegativeMarking ? -negPoints : 0,
      }
    }
  }
}
