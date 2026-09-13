import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import { dispatchWebhook } from '../utils/webhook'
import { z } from 'zod'
import { logger } from '../utils/logger'

const checkCourseCompletion = async (
  courseId: string,
  endUserId: string,
  projectId: string
) => {
  try {
    // 1. Get ALL lessons
    const allLessons = await prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true },
    })

    if (allLessons.length === 0) return

    // 2. Count COMPLETED lessons
    const completedCount = await prisma.progress.count({
      where: {
        endUserId,
        isCompleted: true,
        lessonId: { in: allLessons.map((l) => l.id) },
      },
    })

    // 3. Calculate Percentage (e.g., 50%)
    const progressPercent = Math.round(
      (completedCount / allLessons.length) * 100
    )

    // 4. Update Enrollment with REAL progress
    const updated = await prisma.enrollment.update({
      where: {
        courseId_endUserId: { courseId, endUserId },
      },
      data: {
        progress: progressPercent, // Now shows 10%, 50%, etc.
        // Only set completedAt if we actually hit 100%
        completedAt: progressPercent === 100 ? new Date() : undefined,
      },
    })

    if (progressPercent === 100) {
      dispatchWebhook(projectId, 'course.completed', {
        courseId,
        endUserId,
        enrollmentId: updated.id,
      }).catch(console.error)
    }
  } catch (error) {
    console.error('Error in checkCourseCompletion:', error)
  }
}

const updateProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lesson = req.lesson!
    const endUser = req.endUser!
    const enrollment = req.enrollment!

    // 1. Validate inputs matching Frontend
    const bodySchema = z.object({
      secondsWatched: z.number().nonnegative(),
      status: z.enum(['COMPLETED', 'WATCHING']).optional(),
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }
    const { secondsWatched, status } = parsed.data

    // 2. Determine Completion
    // We mark complete if:
    // A) Frontend says it ended (status === 'COMPLETED')
    // OR
    // B) They watched > 95% of the duration
    let isCompleted = status === 'COMPLETED'

    if (!isCompleted && lesson.duration) {
      isCompleted = secondsWatched >= lesson.duration * 0.95
    }

    // 3. Check if this is a "New" Completion
    // (We only want to trigger the heavy Course Check if status CHANGED)
    const existingProgress = await prisma.progress.findUnique({
      where: {
        lessonId_endUserId: { lessonId: lesson.id, endUserId: endUser.id },
      },
      select: { isCompleted: true },
    })

    const isNewlyCompleted = isCompleted && !existingProgress?.isCompleted

    // 4. Upsert Progress
    const progress = await prisma.progress.upsert({
      where: {
        lessonId_endUserId: {
          lessonId: lesson.id,
          endUserId: endUser.id,
        },
      },
      update: {
        watchedDuration: secondsWatched, // Map frontend 'secondsWatched' to DB 'watchedDuration'
        isCompleted: isCompleted || existingProgress?.isCompleted, // Never un-complete
        completedAt: isNewlyCompleted ? new Date() : undefined,
        lastWatchedAt: new Date(),
      },
      create: {
        lessonId: lesson.id,
        endUserId: endUser.id,
        watchedDuration: secondsWatched,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    })

    // 5. Update Course Percentage if a lesson was just finished
    if (isNewlyCompleted) {
      dispatchWebhook(endUser.projectId, 'lesson.completed', {
        lessonId: lesson.id,
        courseId: enrollment.courseId,
        endUserId: endUser.id,
      }).catch(console.error)

      logger.info('Lesson completed', {
        lessonId: lesson.id,
        courseId: enrollment.courseId,
        endUserId: endUser.id,
      })

      await checkCourseCompletion(
        enrollment.courseId,
        endUser.id,
        endUser.projectId
      )
    }

    return res
      .status(200)
      .json(new ApiResponse(200, 'Progress updated', { progress }))
  } catch (error) {
    next(error)
  }
}
export { updateProgress }
