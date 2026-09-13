import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'

export const resolveCourseContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const mwStart = process.hrtime.bigint()
  const recordTiming = () => {
    if ((req as any).__mwTimings) {
      const ms = Number(process.hrtime.bigint() - mwStart) / 1_000_000
        ; (req as any).__mwTimings.push({ name: 'resolveCourse', ms })
    }
  }
  try {
    const { courseId, moduleId } = req.params
    const project = req.project

    if (!project) {
      recordTiming()
      return next(
        new ApiError(
          500,
          'Project context missing. Ensure authorizeProjectAccess runs first.'
        )
      )
    }

    if (!courseId) {
      recordTiming()
      return next(new ApiError(400, 'Course ID is required.'))
    }

    // Optimization: for nested module/lesson routes, resolveModuleContext will
    // validate course linkage in one query and attach req.course.
    if (moduleId) {
      recordTiming()
      return next()
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        projectId: project.id,
      },
    })

    if (!course) {
      recordTiming()
      return next(
        new ApiError(
          404,
          'Course not found or does not belong to this project.'
        )
      )
    }

    req.course = course
    recordTiming()
    next()
  } catch (error) {
    console.error('[RESOLVE_COURSE_CONTEXT_ERROR]', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}
