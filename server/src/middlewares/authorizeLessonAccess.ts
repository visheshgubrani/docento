// middleware/authorizeLessonAccess.ts
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'

export const authorizeLessonAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params
    // We don't know if we have a user yet!

    if (!lessonId) {
      return next(new ApiError(400, 'Lesson ID is required.'))
    }

    // 1. Fetch the Lesson FIRST
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        contentType: true,
        textContent: true,
        duration: true,
        isFree: true,
        videoUrl: true,
        videoStatus: true,
        videoId: true,
        module: { select: { courseId: true } },
      },
    })

    if (!lesson || !lesson.module) {
      return next(new ApiError(404, 'Lesson not found.'))
    }

    // 2. CHECK FREE STATUS (The "Fast Pass")
    if (lesson.isFree) {
      req.lesson = lesson
      // EXIT EARLY: We don't care if they are logged in
      return next()
    }

    // -----------------------------------------------
    // PAHO GATE: Only logged-in users pass this line
    // -----------------------------------------------

    // 3. Now we check for the user
    if (!req.endUser) {
      return next(
        new ApiError(401, 'Unauthorized: Login required for this lesson.')
      )
    }

    const endUser = req.endUser // Now we know it exists

    // 4. Check Enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: lesson.module.courseId,
        endUserId: endUser.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    if (!enrollment) {
      return next(
        new ApiError(403, 'Forbidden: Purchase required to view this lesson.')
      )
    }

    req.lesson = lesson
    req.enrollment = enrollment
    next()
  } catch (error) {
    next(error)
  }
}
