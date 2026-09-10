// controllers/quiz.controller.ts
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'

const toTrimmedStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseDelimitedCorrectAnswers = (value: unknown): string[] => {
  if (typeof value !== 'string') return []

  return value
    .split('||')
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeCorrectAnswersInput = (
  correctAnswer: unknown,
  correctAnswers: unknown
): string[] => {
  const fromArray = toTrimmedStringArray(correctAnswers)
  if (fromArray.length > 0) {
    return Array.from(new Set(fromArray))
  }

  const fromDelimitedString = parseDelimitedCorrectAnswers(correctAnswer)
  return Array.from(new Set(fromDelimitedString))
}

// ===== QUIZ CRUD (One-to-One with Lesson) =====

// Get quiz for a lesson (or null if doesn't exist)
export const getQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    })

    // It's OK if quiz is null - lesson might not have a quiz yet
    return res.status(200).json(
      new ApiResponse(200, 'Quiz fetched successfully', {
        quiz,
      })
    )
  } catch (error) {
    console.error('[GET_QUIZ_ERROR]', error)
    next(error)
  }
}

// Create quiz for a lesson
export const createQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const {
      title,
      description,
      passingScore,
      maxAttempts,
      timeLimit,
      negativeMarking,
      defaultNegativeMark,
      isMockTest,
      startTime,
      endTime,
    } = req.body

    if (!title) {
      return next(new ApiError(400, 'Title is required'))
    }

    // Check if lesson already has a quiz (one-to-one)
    const existingQuiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (existingQuiz) {
      return next(
        new ApiError(
          400,
          'This lesson already has a quiz. Use PATCH to update it.'
        )
      )
    }

    // Validate passing score
    if (passingScore && (passingScore < 0 || passingScore > 100)) {
      return next(new ApiError(400, 'Passing score must be between 0 and 100'))
    }

    // Validate maxAttempts
    if (maxAttempts && maxAttempts < 1) {
      return next(new ApiError(400, 'Max attempts must be at least 1'))
    }

    const isMockTestLesson = lesson.contentType === 'MOCK_TEST'

    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        title,
        description,
        passingScore: passingScore || 70,
        maxAttempts,
        timeLimit,
        negativeMarking: negativeMarking || false,
        defaultNegativeMark: defaultNegativeMark || null,
        isMockTest: isMockTestLesson ? true : Boolean(isMockTest),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'Quiz created successfully', {
        quiz,
      })
    )
  } catch (error) {
    console.error('[CREATE_QUIZ_ERROR]', error)
    next(error)
  }
}

// Update quiz
export const updateQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const {
      title,
      description,
      passingScore,
      maxAttempts,
      timeLimit,
      negativeMarking,
      defaultNegativeMark,
      isMockTest,
      startTime,
      endTime,
    } = req.body

    // Get existing quiz
    const existingQuiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!existingQuiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    const dataToUpdate: any = {}
    if (title !== undefined) dataToUpdate.title = title
    if (description !== undefined) dataToUpdate.description = description
    if (maxAttempts !== undefined) dataToUpdate.maxAttempts = maxAttempts
    if (timeLimit !== undefined) dataToUpdate.timeLimit = timeLimit
    if (negativeMarking !== undefined)
      dataToUpdate.negativeMarking = negativeMarking
    if (defaultNegativeMark !== undefined)
      dataToUpdate.defaultNegativeMark = defaultNegativeMark
    if (isMockTest !== undefined) dataToUpdate.isMockTest = isMockTest
    if (startTime !== undefined)
      dataToUpdate.startTime = startTime ? new Date(startTime) : null
    if (endTime !== undefined)
      dataToUpdate.endTime = endTime ? new Date(endTime) : null

    if (passingScore !== undefined) {
      if (passingScore < 0 || passingScore > 100) {
        return next(
          new ApiError(400, 'Passing score must be between 0 and 100')
        )
      }
      dataToUpdate.passingScore = passingScore
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return next(new ApiError(400, 'At least one field is required to update'))
    }

    if (lesson.contentType === 'MOCK_TEST') {
      dataToUpdate.isMockTest = true
    }

    const updated = await prisma.quiz.update({
      where: { id: existingQuiz.id },
      data: dataToUpdate,
    })

    return res.status(200).json(
      new ApiResponse(200, 'Quiz updated successfully', {
        quiz: updated,
      })
    )
  } catch (error) {
    console.error('[UPDATE_QUIZ_ERROR]', error)
    next(error)
  }
}

// Delete quiz
export const deleteQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    await prisma.quiz.delete({
      where: { id: quiz.id },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Quiz deleted successfully', {}))
  } catch (error) {
    console.error('[DELETE_QUIZ_ERROR]', error)
    next(error)
  }
}

// ===== QUESTION MANAGEMENT =====

// Create question
export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const {
      questionText,
      questionType,
      options,
      correctAnswer,
      correctAnswers,
      explanation,
      points,
      negativePoints,
      partialMarking,
      sectionId,
    } = req.body

    const normalizedOptions = toTrimmedStringArray(options)
    let normalizedMcqCorrectAnswers: string[] = []
    let normalizedMultiSelectCorrectAnswers: string[] = []

    if (!questionText || !questionType) {
      return next(
        new ApiError(
          400,
          'questionText and questionType are required'
        )
      )
    }

    // Get quiz for this lesson
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(
        new ApiError(404, 'No quiz found for this lesson. Create a quiz first.')
      )
    }

    const validTypes = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'INTEGER']
    if (!validTypes.includes(questionType)) {
      return next(new ApiError(400, `Invalid question type. Must be one of: ${validTypes.join(', ')}`))
    }

    // === Type-specific validation ===

    if (questionType === 'MULTI_SELECT') {
      normalizedMultiSelectCorrectAnswers = normalizeCorrectAnswersInput(
        correctAnswer,
        correctAnswers
      )

      if (normalizedMultiSelectCorrectAnswers.length === 0) {
        return next(
          new ApiError(400, 'correctAnswers array is required for MULTI_SELECT questions')
        )
      }
      if (normalizedOptions.length === 0) {
        return next(
          new ApiError(400, 'Options array is required for MULTI_SELECT questions')
        )
      }
      const invalidAnswers = normalizedMultiSelectCorrectAnswers.filter(
        (answer) => !normalizedOptions.includes(answer)
      )
      if (invalidAnswers.length > 0) {
        return next(
          new ApiError(400, `correctAnswers must all be in options. Invalid: ${invalidAnswers.join(', ')}`)
        )
      }
    } else if (questionType === 'MULTIPLE_CHOICE') {
      if (normalizedOptions.length === 0) {
        return next(
          new ApiError(400, 'Options array is required for multiple choice questions')
        )
      }

      normalizedMcqCorrectAnswers = normalizeCorrectAnswersInput(
        correctAnswer,
        correctAnswers
      )

      if (normalizedMcqCorrectAnswers.length === 0) {
        return next(new ApiError(400, 'correctAnswer is required for MULTIPLE_CHOICE questions'))
      }

      const invalidAnswers = normalizedMcqCorrectAnswers.filter(
        (answer) => !normalizedOptions.includes(answer)
      )
      if (invalidAnswers.length > 0) {
        return next(
          new ApiError(400, `correctAnswer values must be in options. Invalid: ${invalidAnswers.join(', ')}`)
        )
      }
    } else if (questionType === 'INTEGER') {
      if (!correctAnswer) {
        return next(new ApiError(400, 'correctAnswer is required for INTEGER questions'))
      }
      if (isNaN(Number(correctAnswer))) {
        return next(
          new ApiError(400, 'correctAnswer must be a valid number for INTEGER questions')
        )
      }
    } else {
      // TRUE_FALSE, SHORT_ANSWER
      if (!correctAnswer) {
        return next(new ApiError(400, 'correctAnswer is required'))
      }
    }

    // Validate sectionId belongs to this quiz
    if (sectionId) {
      const section = await prisma.quizSection.findFirst({
        where: { id: sectionId, quizId: quiz.id },
      })
      if (!section) {
        return next(
          new ApiError(404, 'Section not found in this quiz')
        )
      }
    }

    // Get next order number
    const lastQuestion = await prisma.question.findFirst({
      where: { quizId: quiz.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const order = lastQuestion ? lastQuestion.order + 1 : 1

    const question = await prisma.question.create({
      data: {
        quizId: quiz.id,
        questionText,
        questionType,
        options: normalizedOptions.length > 0 ? normalizedOptions : undefined,
        correctAnswer:
          questionType === 'MULTIPLE_CHOICE'
            ? normalizedMcqCorrectAnswers.join('||')
            : correctAnswer || '',
        correctAnswers:
          questionType === 'MULTI_SELECT'
            ? normalizedMultiSelectCorrectAnswers
            : questionType === 'MULTIPLE_CHOICE'
              ? normalizedMcqCorrectAnswers
              : [],
        explanation,
        points: points || 1,
        negativePoints: negativePoints || 0,
        partialMarking: partialMarking || false,
        sectionId: sectionId || null,
        order,
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'Question created successfully', {
        question,
      })
    )
  } catch (error) {
    console.error('[CREATE_QUESTION_ERROR]', error)
    next(error)
  }
}

// Update question
export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const { questionId } = req.params
    const {
      questionText,
      questionType,
      options,
      correctAnswer,
      correctAnswers,
      explanation,
      points,
      negativePoints,
      partialMarking,
      sectionId,
      order,
    } = req.body
    const normalizedOptionsInput =
      options !== undefined ? toTrimmedStringArray(options) : undefined

    // Get quiz for this lesson
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    // Verify question belongs to this quiz
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        quizId: quiz.id,
      },
    })

    if (!question) {
      return next(new ApiError(404, 'Question not found in this quiz'))
    }

    // Validate questionType if being updated
    const effectiveType = questionType || question.questionType
    if (questionType !== undefined) {
      const validTypes = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'INTEGER']
      if (!validTypes.includes(questionType)) {
        return next(new ApiError(400, `Invalid question type. Must be one of: ${validTypes.join(', ')}`))
      }
    }

    // Validate MULTI_SELECT correctAnswers
    let normalizedMultiSelectCorrectAnswers: string[] | undefined
    if (effectiveType === 'MULTI_SELECT') {
      normalizedMultiSelectCorrectAnswers = normalizeCorrectAnswersInput(
        correctAnswer !== undefined ? correctAnswer : question.correctAnswer,
        correctAnswers !== undefined ? correctAnswers : question.correctAnswers
      )

      if (normalizedMultiSelectCorrectAnswers.length === 0) {
        return next(new ApiError(400, 'correctAnswers array is required for MULTI_SELECT questions'))
      }

      const effectiveOptions =
        normalizedOptionsInput ?? toTrimmedStringArray(question.options)
      if (effectiveOptions.length === 0) {
        return next(
          new ApiError(400, 'Options array is required for MULTI_SELECT questions')
        )
      }

      const invalidAnswers = normalizedMultiSelectCorrectAnswers.filter(
        (answer) => !effectiveOptions.includes(answer)
      )
      if (invalidAnswers.length > 0) {
        return next(new ApiError(400, `correctAnswers must all be in options. Invalid: ${invalidAnswers.join(', ')}`))
      }
    }

    // Validate MULTIPLE_CHOICE with support for multiple answers in correctAnswer (e.g. "A||C")
    let normalizedMcqCorrectAnswers: string[] | undefined
    if (effectiveType === 'MULTIPLE_CHOICE') {
      const effectiveOptions =
        normalizedOptionsInput ?? toTrimmedStringArray(question.options)
      if (effectiveOptions.length === 0) {
        return next(
          new ApiError(400, 'Options array is required for multiple choice questions')
        )
      }

      normalizedMcqCorrectAnswers = normalizeCorrectAnswersInput(
        correctAnswer !== undefined ? correctAnswer : question.correctAnswer,
        correctAnswers !== undefined ? correctAnswers : question.correctAnswers
      )

      if (normalizedMcqCorrectAnswers.length === 0) {
        return next(
          new ApiError(
            400,
            'correctAnswer is required for MULTIPLE_CHOICE questions'
          )
        )
      }

      const invalidAnswers = normalizedMcqCorrectAnswers.filter(
        (answer) => !effectiveOptions.includes(answer)
      )
      if (invalidAnswers.length > 0) {
        return next(
          new ApiError(
            400,
            `correctAnswer values must be in options. Invalid: ${invalidAnswers.join(', ')}`
          )
        )
      }
    }

    // Validate INTEGER correctAnswer
    if (effectiveType === 'INTEGER' && correctAnswer !== undefined) {
      if (isNaN(Number(correctAnswer))) {
        return next(new ApiError(400, 'correctAnswer must be a valid number for INTEGER questions'))
      }
    }

    // Validate sectionId if provided
    if (sectionId !== undefined && sectionId !== null) {
      const section = await prisma.quizSection.findFirst({
        where: { id: sectionId, quizId: quiz.id },
      })
      if (!section) {
        return next(new ApiError(404, 'Section not found in this quiz'))
      }
    }

    const dataToUpdate: any = {}
    if (questionText !== undefined) dataToUpdate.questionText = questionText
    if (questionType !== undefined) dataToUpdate.questionType = questionType
    if (normalizedOptionsInput !== undefined) {
      dataToUpdate.options = normalizedOptionsInput
    }

    if (effectiveType === 'MULTIPLE_CHOICE' && normalizedMcqCorrectAnswers) {
      dataToUpdate.correctAnswer = normalizedMcqCorrectAnswers.join('||')
      dataToUpdate.correctAnswers = normalizedMcqCorrectAnswers
    } else {
      if (correctAnswer !== undefined) dataToUpdate.correctAnswer = correctAnswer
      if (correctAnswers !== undefined) dataToUpdate.correctAnswers = correctAnswers
    }

    if (effectiveType === 'MULTI_SELECT' && normalizedMultiSelectCorrectAnswers) {
      dataToUpdate.correctAnswers = normalizedMultiSelectCorrectAnswers
    }

    if (explanation !== undefined) dataToUpdate.explanation = explanation
    if (points !== undefined) dataToUpdate.points = points
    if (negativePoints !== undefined) dataToUpdate.negativePoints = negativePoints
    if (partialMarking !== undefined) dataToUpdate.partialMarking = partialMarking
    if (sectionId !== undefined) dataToUpdate.sectionId = sectionId
    if (order !== undefined) dataToUpdate.order = order

    if (Object.keys(dataToUpdate).length === 0) {
      return next(new ApiError(400, 'At least one field is required to update'))
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: dataToUpdate,
    })

    return res.status(200).json(
      new ApiResponse(200, 'Question updated successfully', {
        question: updated,
      })
    )
  } catch (error) {
    console.error('[UPDATE_QUESTION_ERROR]', error)
    next(error)
  }
}

// Delete question
export const deleteQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const { questionId } = req.params

    // Get quiz for this lesson
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    // Verify question belongs to this quiz
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        quizId: quiz.id,
      },
    })

    if (!question) {
      return next(new ApiError(404, 'Question not found in this quiz'))
    }

    await prisma.question.delete({
      where: { id: questionId },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Question deleted successfully', {}))
  } catch (error) {
    console.error('[DELETE_QUESTION_ERROR]', error)
    next(error)
  }
}

// Reorder questions
export const reorderQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const { questionOrders } = req.body // Array of { id, order }

    if (!Array.isArray(questionOrders)) {
      return next(new ApiError(400, 'questionOrders must be an array'))
    }

    // Get quiz for this lesson
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    // Verify all questions belong to this quiz
    const questionIds = questionOrders.map((q) => q.id)
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        quizId: quiz.id,
      },
    })

    if (questions.length !== questionIds.length) {
      return next(
        new ApiError(400, 'Some questions do not belong to this quiz')
      )
    }

    // Update all questions in a transaction
    await prisma.$transaction(
      questionOrders.map(({ id, order }) =>
        prisma.question.update({
          where: { id },
          data: { order },
        })
      )
    )

    return res
      .status(200)
      .json(new ApiResponse(200, 'Questions reordered successfully', {}))
  } catch (error) {
    console.error('[REORDER_QUESTIONS_ERROR]', error)
    next(error)
  }
}

// Get quiz statistics
export const getQuizStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    const [totalAttempts, passedAttempts, averageScore, recentAttempts] =
      await Promise.all([
        prisma.quizAttempt.count({
          where: { quizId: quiz.id, completedAt: { not: null } },
        }),
        prisma.quizAttempt.count({
          where: { quizId: quiz.id, passed: true },
        }),
        prisma.quizAttempt.aggregate({
          where: { quizId: quiz.id, completedAt: { not: null } },
          _avg: { score: true, timeSpent: true },
        }),
        prisma.quizAttempt.findMany({
          where: { quizId: quiz.id, completedAt: { not: null } },
          include: {
            endUser: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        }),
      ])

    const passRate =
      totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0

    return res.status(200).json(
      new ApiResponse(200, 'Quiz statistics fetched successfully', {
        stats: {
          totalAttempts,
          passedAttempts,
          failedAttempts: totalAttempts - passedAttempts,
          passRate: Math.round(passRate * 100) / 100,
          averageScore: Math.round((averageScore._avg.score || 0) * 100) / 100,
          averageTimeSpent: Math.round(averageScore._avg.timeSpent || 0),
          recentAttempts,
        },
      })
    )
  } catch (error) {
    console.error('[GET_QUIZ_STATS_ERROR]', error)
    next(error)
  }
}

// ===== SECTION MANAGEMENT (Mock Tests) =====

// List sections for a quiz
export const listSections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    const sections = await prisma.quizSection.findMany({
      where: { quizId: quiz.id },
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Sections fetched successfully', {
        sections,
      })
    )
  } catch (error) {
    console.error('[LIST_SECTIONS_ERROR]', error)
    next(error)
  }
}

// Create section
export const createSection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const { title } = req.body

    if (!title) {
      return next(new ApiError(400, 'Title is required'))
    }

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    // Get next order number
    const lastSection = await prisma.quizSection.findFirst({
      where: { quizId: quiz.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const order = lastSection ? lastSection.order + 1 : 1

    const section = await prisma.quizSection.create({
      data: {
        quizId: quiz.id,
        title,
        order,
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'Section created successfully', {
        section,
      })
    )
  } catch (error) {
    console.error('[CREATE_SECTION_ERROR]', error)
    next(error)
  }
}

// Update section
export const updateSection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const { sectionId } = req.params
    const { title, order } = req.body

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    const section = await prisma.quizSection.findFirst({
      where: { id: sectionId, quizId: quiz.id },
    })

    if (!section) {
      return next(new ApiError(404, 'Section not found in this quiz'))
    }

    const dataToUpdate: any = {}
    if (title !== undefined) dataToUpdate.title = title
    if (order !== undefined) dataToUpdate.order = order

    if (Object.keys(dataToUpdate).length === 0) {
      return next(new ApiError(400, 'At least one field is required to update'))
    }

    const updated = await prisma.quizSection.update({
      where: { id: sectionId },
      data: dataToUpdate,
    })

    return res.status(200).json(
      new ApiResponse(200, 'Section updated successfully', {
        section: updated,
      })
    )
  } catch (error) {
    console.error('[UPDATE_SECTION_ERROR]', error)
    next(error)
  }
}

// Delete section
export const deleteSection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const { sectionId } = req.params

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!quiz) {
      return next(new ApiError(404, 'Quiz not found for this lesson'))
    }

    const section = await prisma.quizSection.findFirst({
      where: { id: sectionId, quizId: quiz.id },
    })

    if (!section) {
      return next(new ApiError(404, 'Section not found in this quiz'))
    }

    // Unlink questions from this section before deleting
    await prisma.question.updateMany({
      where: { sectionId },
      data: { sectionId: null },
    })

    await prisma.quizSection.delete({
      where: { id: sectionId },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Section deleted successfully', {}))
  } catch (error) {
    console.error('[DELETE_SECTION_ERROR]', error)
    next(error)
  }
}
