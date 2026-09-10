// controllers/studentQuiz.controller.ts
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import { dispatchWebhook } from '../utils/webhook'
import { logger } from '../utils/logger'

// ===== STUDENT QUIZ ENDPOINTS =====

// Get quiz for student (WITHOUT correct answers)
export const getQuizForStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const lesson = req.lesson! // From middleware that validates enrollment

    // Get quiz for this lesson
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    if (!quiz) {
      return next(new ApiError(404, 'This lesson does not have a quiz'))
    }

    // Check mock test time window
    if (quiz.isMockTest) {
      const now = new Date()
      if (quiz.startTime && now < quiz.startTime) {
        return next(new ApiError(403, 'This exam has not started yet'))
      }
      if (quiz.endTime && now > quiz.endTime) {
        return next(new ApiError(403, 'This exam window has closed'))
      }
    }

    // Get questions WITHOUT correct answers or explanations
    const questions = await prisma.question.findMany({
      where: { quizId: quiz.id },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        options: true,
        points: true,
        negativePoints: true,
        partialMarking: true,
        sectionId: true,
        order: true,
        // Explicitly exclude sensitive fields
        correctAnswer: false,
        correctAnswers: false,
        explanation: false,
      },
      orderBy: { order: 'asc' },
    })

    // Get student's previous attempts
    const previousAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: quiz.id,
        endUserId: endUser.id,
      },
      orderBy: {
        attemptNumber: 'desc',
      },
      take: 5,
      select: {
        id: true,
        attemptNumber: true,
        score: true,
        passed: true,
        startedAt: true,
        completedAt: true,
        timeSpent: true,
      },
    })

    // Check if student has reached max attempts
    const canTakeQuiz =
      !quiz.maxAttempts ||
      previousAttempts.filter((a) => a.completedAt).length < quiz.maxAttempts

    // Calculate total possible points
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

    return res.status(200).json(
      new ApiResponse(200, 'Quiz fetched successfully', {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.maxAttempts,
          timeLimit: quiz.timeLimit,
          negativeMarking: quiz.negativeMarking,
          defaultNegativeMark: quiz.defaultNegativeMark,
          isMockTest: quiz.isMockTest,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          totalQuestions: questions.length,
          totalPoints,
        },
        sections: quiz.sections,
        questions,
        previousAttempts,
        canTakeQuiz,
        attemptsRemaining: quiz.maxAttempts
          ? quiz.maxAttempts -
            previousAttempts.filter((a) => a.completedAt).length
          : null,
      })
    )
  } catch (error) {
    console.error('[GET_QUIZ_FOR_STUDENT_ERROR]', error)
    next(error)
  }
}

// Start quiz attempt
export const startQuizAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const lesson = req.lesson!

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'This lesson does not have a quiz'))
    }

    const now = new Date()

    // Check if there's an incomplete attempt
    const incompleteAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId: quiz.id,
        endUserId: endUser.id,
        completedAt: null,
      },
    })

    if (incompleteAttempt) {
      const timeLimitSeconds =
        typeof quiz.timeLimit === 'number' && quiz.timeLimit > 0
          ? quiz.timeLimit * 60
          : null

      if (timeLimitSeconds !== null) {
        const elapsedSeconds = Math.max(
          0,
          Math.floor((now.getTime() - incompleteAttempt.startedAt.getTime()) / 1000)
        )

        // Stale incomplete attempts should be finalized before creating a new attempt.
        if (elapsedSeconds >= timeLimitSeconds) {
          await prisma.quizAttempt.update({
            where: { id: incompleteAttempt.id },
            data: {
              score: 0,
              passed: false,
              completedAt: now,
              timeSpent: timeLimitSeconds,
            },
          })
        } else {
          return res.status(200).json(
            new ApiResponse(200, 'You have an incomplete attempt', {
              attempt: incompleteAttempt,
              timeLimit: quiz.timeLimit,
              remainingSeconds: Math.max(0, timeLimitSeconds - elapsedSeconds),
            })
          )
        }
      } else {
        return res.status(200).json(
          new ApiResponse(200, 'You have an incomplete attempt', {
            attempt: incompleteAttempt,
            timeLimit: quiz.timeLimit,
            remainingSeconds: null,
          })
        )
      }
    }

    // Check mock test time window
    if (quiz.isMockTest) {
      if (quiz.startTime && now < quiz.startTime) {
        return next(new ApiError(403, 'This exam has not started yet'))
      }
      if (quiz.endTime && now > quiz.endTime) {
        return next(new ApiError(403, 'This exam window has closed'))
      }
    }

    // Check max attempts
    if (quiz.maxAttempts) {
      const completedAttempts = await prisma.quizAttempt.count({
        where: {
          quizId: quiz.id,
          endUserId: endUser.id,
          completedAt: { not: null },
        },
      })

      if (completedAttempts >= quiz.maxAttempts) {
        return next(
          new ApiError(
            403,
            `You have reached the maximum number of attempts (${quiz.maxAttempts})`
          )
        )
      }
    }

    // Get next attempt number
    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId: quiz.id,
        endUserId: endUser.id,
      },
      orderBy: {
        attemptNumber: 'desc',
      },
    })

    const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1

    // Calculate total points for this quiz
    const questions = await prisma.question.findMany({
      where: { quizId: quiz.id },
      select: { points: true },
    })
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

    // Create new attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        endUserId: endUser.id,
        attemptNumber,
        score: 0,
        totalPoints,
        passed: false,
      },
    })

    const remainingSeconds =
      typeof quiz.timeLimit === 'number' && quiz.timeLimit > 0
        ? quiz.timeLimit * 60
        : null

    return res.status(201).json(
      new ApiResponse(201, 'Quiz attempt started', {
        attempt,
        timeLimit: quiz.timeLimit, // Send time limit to frontend
        remainingSeconds,
      })
    )
  } catch (error) {
    console.error('[START_QUIZ_ATTEMPT_ERROR]', error)
    next(error)
  }
}

// Submit quiz attempt
export const submitQuizAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const { attemptId } = req.params
    const { answers, timeSpent } = req.body // timeSpent in seconds

    if (!Array.isArray(answers) || answers.length === 0) {
      return next(new ApiError(400, 'Answers array is required'))
    }

    // Verify attempt belongs to this user and is not completed
    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        endUserId: endUser.id,
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
            lesson: {
              select: {
                id: true,
                module: {
                  select: {
                    course: {
                      select: {
                        id: true,
                        projectId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      return next(new ApiError(404, 'Quiz attempt not found'))
    }

    if (attempt.completedAt) {
      return next(new ApiError(400, 'This attempt has already been submitted'))
    }

    // Validate time limit (if set)
    if (attempt.quiz.timeLimit && timeSpent > attempt.quiz.timeLimit * 60) {
      return next(
        new ApiError(400, 'Time limit exceeded. Quiz attempt is invalid.')
      )
    }

    // ===== GRADE ALL ANSWERS IN MEMORY =====
    let totalPointsEarned = 0
    const gradedAnswers: Array<{
      questionId: string
      questionText: string
      userAnswer: string
      userAnswers: string[]
      correctAnswer: string
      correctAnswers: string[]
      isCorrect: boolean
      pointsEarned: number
      pointsPossible: number
      explanation: string | null
    }> = []

    const answersToInsert: Array<{
      attemptId: string
      questionId: string
      userAnswer: string
      userAnswers: string[]
      isCorrect: boolean
      pointsEarned: number
    }> = []

    for (const answer of answers) {
      const question = attempt.quiz.questions.find(
        (q) => q.id === answer.questionId
      )

      if (!question) {
        continue // Skip invalid question IDs
      }

      // Grade the answer using the new grading engine
      const gradeResult = gradeAnswer(
        question,
        answer.userAnswer || '',
        answer.userAnswers || [],
        attempt.quiz.negativeMarking,
        attempt.quiz.defaultNegativeMark
      )

      totalPointsEarned += gradeResult.pointsEarned

      // Prepare for batch insert
      answersToInsert.push({
        attemptId: attempt.id,
        questionId: question.id,
        userAnswer: answer.userAnswer || '',
        userAnswers: answer.userAnswers || [],
        isCorrect: gradeResult.isCorrect,
        pointsEarned: gradeResult.pointsEarned,
      })

      gradedAnswers.push({
        questionId: question.id,
        questionText: question.questionText,
        userAnswer: answer.userAnswer || '',
        userAnswers: answer.userAnswers || [],
        correctAnswer: question.correctAnswer,
        correctAnswers: question.correctAnswers,
        isCorrect: gradeResult.isCorrect,
        pointsEarned: gradeResult.pointsEarned,
        pointsPossible: question.points || 1,
        explanation: question.explanation,
      })
    }

    // ===== BATCH INSERT ALL ANSWERS AT ONCE =====
    await prisma.answer.createMany({
      data: answersToInsert,
    })

    // Ensure score doesn't go below 0 (negative marking can cause this)
    const clampedPoints = Math.max(totalPointsEarned, 0)
    const score = Math.round((clampedPoints / attempt.totalPoints) * 100)
    const passed = score >= attempt.quiz.passingScore

    // Update attempt
    const completedAttempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        score,
        passed,
        completedAt: new Date(),
        timeSpent: timeSpent || null,
      },
    })

    // Update lesson progress if passed
    if (passed) {
      await prisma.progress.upsert({
        where: {
          lessonId_endUserId: {
            lessonId: attempt.quiz.lessonId,
            endUserId: endUser.id,
          },
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
        },
        create: {
          lessonId: attempt.quiz.lessonId,
          endUserId: endUser.id,
          isCompleted: true,
          completedAt: new Date(),
        },
      })
    }

    dispatchWebhook(req.project!.id, 'quiz.attempt_completed', {
      attemptId: completedAttempt.id,
      quizId: attempt.quiz.id,
      lessonId: attempt.quiz.lesson.id,
      courseId: attempt.quiz.lesson.module.course.id,
      endUserId: endUser.id,
      score,
      passed,
      timeSpent,
    }).catch(console.error)

    logger.info('Quiz attempt completed', {
      attemptId: completedAttempt.id,
      quizId: attempt.quiz.id,
      lessonId: attempt.quiz.lesson.id,
      courseId: attempt.quiz.lesson.module.course.id,
      endUserId: endUser.id,
      passed,
    })

    return res.status(200).json(
      new ApiResponse(200, 'Quiz submitted successfully', {
        attempt: completedAttempt,
        answers: gradedAnswers,
        summary: {
          totalQuestions: attempt.quiz.questions.length,
          totalPoints: attempt.totalPoints,
          pointsEarned: totalPointsEarned,
          clampedPoints,
          score,
          passed,
          passingScore: attempt.quiz.passingScore,
          negativeMarking: attempt.quiz.negativeMarking,
          timeSpent,
        },
      })
    )
  } catch (error) {
    console.error('[SUBMIT_QUIZ_ATTEMPT_ERROR]', error)
    next(error)
  }
}

// Get quiz results (for a specific attempt)
export const getQuizResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const { attemptId } = req.params

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        endUserId: endUser.id,
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
            negativeMarking: true,
            isMockTest: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
                correctAnswer: true,
                correctAnswers: true,
                explanation: true,
                points: true,
                negativePoints: true,
                partialMarking: true,
                sectionId: true,
                order: true,
              },
            },
          },
          orderBy: {
            question: {
              order: 'asc',
            },
          },
        },
      },
    })

    if (!attempt) {
      return next(new ApiError(404, 'Quiz attempt not found'))
    }

    if (!attempt.completedAt) {
      return next(new ApiError(400, 'This attempt is not yet completed'))
    }

    return res.status(200).json(
      new ApiResponse(200, 'Quiz results fetched successfully', {
        attempt,
      })
    )
  } catch (error) {
    console.error('[GET_QUIZ_RESULTS_ERROR]', error)
    next(error)
  }
}

// Get student's quiz history for a lesson
export const getQuizHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const lesson = req.lesson!

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'This lesson does not have a quiz'))
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: quiz.id,
        endUserId: endUser.id,
        completedAt: { not: null },
      },
      orderBy: {
        attemptNumber: 'desc',
      },
      select: {
        id: true,
        attemptNumber: true,
        score: true,
        totalPoints: true,
        passed: true,
        startedAt: true,
        completedAt: true,
        timeSpent: true,
      },
    })

    const bestScore =
      attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0

    return res.status(200).json(
      new ApiResponse(200, 'Quiz history fetched successfully', {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.maxAttempts,
        },
        attempts,
        summary: {
          totalAttempts: attempts.length,
          bestScore,
          hasPassed: attempts.some((a) => a.passed),
          attemptsRemaining: quiz.maxAttempts
            ? quiz.maxAttempts - attempts.length
            : null,
        },
      })
    )
  } catch (error) {
    console.error('[GET_QUIZ_HISTORY_ERROR]', error)
    next(error)
  }
}

// ===== GRADING ENGINE =====

/**
 * Grade a single answer based on question type and marking scheme.
 *
 * Scoring rules:
 * - MULTIPLE_CHOICE / TRUE_FALSE: Binary (full points or negative)
 * - MULTI_SELECT (partialMarking=false): All-or-nothing
 * - MULTI_SELECT (partialMarking=true): JEE Advanced style proportional partial credit
 *   +4 for all correct, +3 if 3/4 correct selected (no wrong), etc.
 *   Any wrong option selected → full negative deduction
 * - INTEGER: Numeric comparison with ±0.01 tolerance
 * - SHORT_ANSWER: Case-insensitive trim match
 */
function gradeAnswer(
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
  defaultNegativeMark: number | null
): { isCorrect: boolean; pointsEarned: number } {
  const maxPoints = question.points || 1
  const negPoints = question.negativePoints || defaultNegativeMark || 0

  // Check if student attempted the question
  const isAttempted =
    question.questionType === 'MULTI_SELECT'
      ? userAnswers.length > 0
      : !!userAnswer

  if (!isAttempted) {
    return { isCorrect: false, pointsEarned: 0 } // Unanswered → 0
  }

  switch (question.questionType) {
    case 'MULTI_SELECT': {
      const correctSet = new Set(question.correctAnswers)
      const userSet = new Set(userAnswers)

      // Check for wrong selections
      const wrongSelections = userAnswers.filter((a) => !correctSet.has(a))
      const correctSelections = userAnswers.filter((a) => correctSet.has(a))

      if (wrongSelections.length > 0) {
        // Any wrong option selected → negative marking
        return {
          isCorrect: false,
          pointsEarned: quizNegativeMarking ? -negPoints : 0,
        }
      }

      if (correctSelections.length === correctSet.size) {
        // All correct options selected, no wrong → full marks
        return { isCorrect: true, pointsEarned: maxPoints }
      }

      // Partially correct (some correct, no wrong)
      if (question.partialMarking && correctSelections.length > 0) {
        // JEE Advanced proportional: points * (correctSelected / totalCorrect)
        const partialPoints =
          Math.round(
            (maxPoints * (correctSelections.length / correctSet.size)) * 100
          ) / 100
        return { isCorrect: false, pointsEarned: partialPoints }
      }

      // No partial marking → all-or-nothing (not all selected = 0)
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
