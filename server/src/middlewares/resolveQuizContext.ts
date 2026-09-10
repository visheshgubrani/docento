import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'

export const resolveQuizContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId } = req.params
    const lesson = req.lesson

    if (!lesson) {
      return next(
        new ApiError(
          500,
          'Lesson context missing. Ensure resolveLessonContext runs first.'
        )
      )
    }

    if (!quizId) {
      return next(new ApiError(400, 'Quiz ID is required.'))
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        lessonId: lesson.id,
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!quiz) {
      return next(
        new ApiError(404, 'Quiz not found or does not belong to this lesson.')
      )
    }

    req.quiz = quiz
    next()
  } catch (error) {
    console.error('[RESOLVE_QUIZ_CONTEXT_ERROR]', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}
