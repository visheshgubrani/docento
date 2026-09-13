// controllers/student.controller.ts
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import { getSignedThumbnailUrl } from '../utils/clipmux'
import {
  getCourseIncludes,
  getCourseIncludesMap,
} from '../utils/course-duration'

// Get my enrolled courses
const getMyCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!

    const enrollments = await prisma.enrollment.findMany({
      where: {
        endUserId: endUser.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            slug: true,
            description: true,
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    })

    const includesMap = await getCourseIncludesMap(
      enrollments.map((enrollment) => enrollment.course.id),
    )

    const courses = enrollments.map((en) => ({
      ...en.course,
      enrollmentId: en.id,
      progress: en.progress,
      enrolledAt: en.enrolledAt,
      thumbnail: getSignedThumbnailUrl(en.course.thumbnail, null),
      completedAt: en.completedAt,
      expiresAt: en.expiresAt,
      includes: includesMap[en.course.id],
    }))

    return res.status(200).json(
      new ApiResponse(200, 'Courses fetched successfully', {
        courses,
      }),
    )
  } catch (error) {
    console.error('[GET_MY_COURSES_ERROR]', error)
    next(error)
  }
}

// Get course content/syllabus
const getCourseContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!
    const { courseId } = req.params

    // Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        endUserId: endUser.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    if (!enrollment) {
      return next(
        new ApiError(
          403,
          'You are not enrolled in this course or your access has expired.',
        ),
      )
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                contentType: true,
                duration: true,
                isFree: true,
                order: true,
              },
            },
            _count: {
              select: {
                lessons: true,
              },
            },
          },
        },
      },
    })

    if (!course) {
      return next(new ApiError(404, 'Course not found'))
    }

    const includes = await getCourseIncludes(course.id)

    // Get progress for all lessons in this course
    const progressData = await prisma.progress.findMany({
      where: {
        endUserId: endUser.id,
        lesson: {
          module: {
            courseId: course.id,
          },
        },
      },
    })

    // ✅ Create a map for easy lookup
    const progressMap = Object.fromEntries(
      progressData.map((p) => [p.lessonId, p]),
    )

    return res.status(200).json(
      new ApiResponse(200, 'Course content fetched successfully', {
        course: {
          ...course,
          includes,
        },
        enrollment,
        progressMap, // ✅ Easier for frontend to use
      }),
    )
  } catch (error) {
    console.error('[GET_COURSE_CONTENT_ERROR]', error)
    next(error)
  }
}

// Get lesson details for playback
const getLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = req.lesson! // From authorizeLessonAccess middleware
    const enrollment = req.enrollment! // From authorizeLessonAccess middleware
    const endUser = req.endUser!

    // ✅ Use upsert pattern (cleaner than find + create)
    const progress: {
      lessonId: string
      endUserId: string
      watchedDuration: number
      isCompleted: boolean
      lastWatchedAt: Date
      completedAt?: Date | null
    } = await prisma.progress.upsert({
      where: {
        lessonId_endUserId: {
          lessonId: lesson.id,
          endUserId: endUser.id,
        },
      },
      update: {
        lastWatchedAt: new Date(), // ✅ Update last watched time
      },
      create: {
        lessonId: lesson.id,
        endUserId: endUser.id,
        watchedDuration: 0,
        isCompleted: false,
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Lesson fetched successfully', {
        lesson,
        progress,
        enrollment,
      }),
    )
  } catch (error) {
    console.error('[GET_LESSON_ERROR]', error)
    next(error)
  }
}

// Update lesson progress
const updateProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const endUser = req.endUser!
    const { watchedDuration, isCompleted } = req.body

    if (watchedDuration === undefined) {
      return next(new ApiError(400, 'watchedDuration is required'))
    }

    // ✅ Validate watchedDuration
    if (typeof watchedDuration !== 'number' || watchedDuration < 0) {
      return next(
        new ApiError(400, 'watchedDuration must be a positive number'),
      )
    }

    // First, fetch the existing progress to check completedAt
    const existingProgress = await prisma.progress.findUnique({
      where: {
        lessonId_endUserId: {
          lessonId: lesson.id,
          endUserId: endUser.id,
        },
      },
    })

    const progress = await prisma.progress.upsert({
      where: {
        lessonId_endUserId: {
          lessonId: lesson.id,
          endUserId: endUser.id,
        },
      },
      update: {
        watchedDuration,
        isCompleted: isCompleted || false,
        lastWatchedAt: new Date(),
        ...(isCompleted &&
          !existingProgress?.completedAt && { completedAt: new Date() }), // ✅ Only set completedAt once
      },
      create: {
        lessonId: lesson.id,
        endUserId: endUser.id,
        watchedDuration,
        isCompleted: isCompleted || false,
        lastWatchedAt: new Date(),
        ...(isCompleted && { completedAt: new Date() }),
      },
    })

    // Update enrollment progress percentage (async, don't wait)
    updateEnrollmentProgress(endUser.id, lesson.id).catch((err) =>
      console.error('[UPDATE_ENROLLMENT_PROGRESS_ERROR]', err),
    )

    return res.status(200).json(
      new ApiResponse(200, 'Progress updated successfully', {
        progress,
      }),
    )
  } catch (error) {
    console.error('[UPDATE_PROGRESS_ERROR]', error)
    next(error)
  }
}

// Update managed user profile (name/email)
const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!
    const { name, email } = req.body

    if (name === undefined && email === undefined) {
      return next(
        new ApiError(400, 'Please provide a name or email to update.'),
      )
    }

    const managedUser = await prisma.managedUser.findUnique({
      where: { endUserId: endUser.id },
    })

    if (!managedUser) {
      return next(
        new ApiError(
          400,
          'Profile updates are only available for managed users.',
        ),
      )
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return next(new ApiError(400, 'Invalid email format'))
      }

      // Enforce project-level uniqueness
      const existing = await prisma.endUser.findFirst({
        where: {
          projectId: endUser.projectId,
          email,
          NOT: { id: endUser.id },
        },
      })

      if (existing) {
        return next(new ApiError(409, 'A user with this email already exists.'))
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedEndUser =
        email !== undefined
          ? await tx.endUser.update({
              where: { id: endUser.id },
              data: { email },
            })
          : endUser

      const updatedManagedUser =
        name !== undefined
          ? await tx.managedUser.update({
              where: { endUserId: endUser.id },
              data: { name },
            })
          : managedUser

      return { updatedEndUser, updatedManagedUser }
    })

    return res.status(200).json(
      new ApiResponse(200, 'Profile updated successfully', {
        profile: {
          id: updated.updatedEndUser.id,
          email: updated.updatedEndUser.email,
          name: updated.updatedManagedUser.name,
          projectId: updated.updatedEndUser.projectId,
        },
      }),
    )
  } catch (error) {
    console.error('[UPDATE_PROFILE_ERROR]', error)
    next(error)
  }
}

// List orders for the current student
const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const endUser = req.endUser!
    const orders = await prisma.order.findMany({
      where: { endUserId: endUser.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            slug: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Orders fetched successfully', {
        orders,
      }),
    )
  } catch (error) {
    console.error('[GET_ORDERS_ERROR]', error)
    next(error)
  }
}

// Helper function to calculate enrollment progress
async function updateEnrollmentProgress(endUserId: string, lessonId: string) {
  try {
    // Get the course from the lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    })

    if (!lesson) return

    const courseId = lesson.module.course.id

    // Count total lessons in the course
    const totalLessons = await prisma.lesson.count({
      where: {
        module: {
          courseId,
        },
      },
    })

    if (totalLessons === 0) return // ✅ Avoid division by zero

    // Count completed lessons by this user
    const completedLessons = await prisma.progress.count({
      where: {
        endUserId,
        isCompleted: true,
        lesson: {
          module: {
            courseId,
          },
        },
      },
    })

    const progressPercentage = Math.round(
      (completedLessons / totalLessons) * 100,
    ) // ✅ Round to whole number

    // Update enrollment
    await prisma.enrollment.updateMany({
      where: {
        courseId,
        endUserId,
      },
      data: {
        progress: progressPercentage,
        ...(progressPercentage === 100 && { completedAt: new Date() }),
      },
    })
  } catch (error) {
    console.error('[UPDATE_ENROLLMENT_PROGRESS_HELPER_ERROR]', error)
    throw error
  }
}

export {
  getMyCourses,
  getCourseContent,
  getLesson,
  updateProgress,
  updateMyProfile,
  getMyOrders,
}
