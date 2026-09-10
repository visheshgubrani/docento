import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'

export const resolveLessonContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params
    const module = req.module

    if (!module) {
      return next(
        new ApiError(
          500,
          'Module context missing. Ensure resolveModuleContext runs first.'
        )
      )
    }

    if (!lessonId) {
      return next(new ApiError(400, 'Lesson ID is required.'))
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        moduleId: module.id,
      },
    })

    if (!lesson) {
      return next(
        new ApiError(404, 'Lesson not found or does not belong to this module.')
      )
    }

    req.lesson = lesson
    next()
  } catch (error) {
    console.error('[RESOLVE_LESSON_CONTEXT_ERROR]', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}
