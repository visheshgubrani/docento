import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import { dispatchWebhook } from '../utils/webhook'
import { z } from 'zod'
import { logger } from '../utils/logger'
import {
  computeEnrollmentExpiresAt,
  resolveEnrollmentDurationInDays,
} from '../utils/enrollment-validity'

const createEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project!
    const course = req.course! // Use from resolveCourseContext middleware
    const bodySchema = z.object({
      endUserId: z.string().min(1, 'endUserId is required'),
      durationInDays: z
        .number()
        .int()
        .positive()
        .optional(),
    })

    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { endUserId, durationInDays } = parsed.data

    // Only need to validate endUser now (course already validated by middleware)
    const endUser = await prisma.endUser.findFirst({
      where: {
        id: endUserId,
        projectId: project.id,
      },
    })

    if (!endUser) {
      return next(
        new ApiError(
          404,
          'EndUser not found or does not belong to this project.'
        )
      )
    }

    // Check for existing enrollment to prevent duplicates
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_endUserId: {
          courseId: course.id,
          endUserId: endUser.id,
        },
      },
    })

    if (existingEnrollment) {
      // Idempotent: Return existing enrollment without error
      return res.status(200).json(
        new ApiResponse(200, 'User is already enrolled.', {
          enrollment: existingEnrollment,
        })
      )
    }

    const resolvedDurationInDays = resolveEnrollmentDurationInDays({
      requestedDurationInDays: durationInDays,
      courseEnrollmentValidityDays: course.enrollmentValidityDays,
    })
    const enrolledAt = new Date()
    const expiresAt = computeEnrollmentExpiresAt(
      enrolledAt,
      resolvedDurationInDays
    )

    // Create enrollment
    const newEnrollment = await prisma.enrollment.create({
      data: {
        courseId: course.id,
        endUserId: endUser.id,
        enrolledAt,
        expiresAt,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
        endUser: {
          select: {
            id: true,
            email: true,
            externalId: true,
          },
        },
      },
    })

    // Fire-and-forget webhook
    dispatchWebhook(project.id, 'enrollment.created', {
      enrollmentId: newEnrollment.id,
      courseId: course.id,
      endUserId: endUser.id,
      expiresAt,
    }).catch(console.error)

    logger.info('Enrollment created', {
      enrollmentId: newEnrollment.id,
      courseId: course.id,
      endUserId: endUser.id,
      projectId: project.id,
    })

    return res.status(201).json(
      new ApiResponse(201, 'Enrollment created successfully.', {
        enrollment: newEnrollment,
      })
    )
  } catch (error) {
    console.error('[CREATE_ENROLLMENT_ERROR]', error)
    next(error)
  }
}

const listEnrollments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const course = req.course! //  Use from resolveCourseContext middleware

    // Pagination params from query string
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100) //  Cap at 100
    const skip = (page - 1) * limit

    // Optional filters
    const { status } = req.query // 'active' | 'expired' | 'all'

    // Build where clause
    const where: any = {
      courseId: course.id,
    }

    // Add status filter
    if (status === 'active') {
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    } else if (status === 'expired') {
      where.expiresAt = { lte: new Date() }
    }

    const [enrollments, totalEnrollments] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          endUser: {
            select: {
              id: true,
              email: true,
              externalId: true,
              managedUser: {
                select: {
                  name: true,
                },
              },
              delegatedUser: {
                select: {
                  lastSeenAt: true,
                },
              },
            },
          },
        },
        orderBy: {
          enrolledAt: 'desc',
        },
        take: limit,
        skip: skip,
      }),
      prisma.enrollment.count({ where }),
    ])

    return res.status(200).json(
      new ApiResponse(200, 'Enrollments fetched successfully', {
        enrollments, //
        pagination: {
          total: totalEnrollments,
          page,
          limit,
          totalPages: Math.ceil(totalEnrollments / limit),
          hasMore: page * limit < totalEnrollments,
        },
      })
    )
  } catch (error) {
    console.error('[LIST_ENROLLMENTS_ERROR]', error)
    next(error)
  }
}

// Delete/revoke enrollment
const deleteEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const course = req.course!
    const { enrollmentId } = req.params

    // Verify enrollment belongs to this course
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        courseId: course.id,
      },
    })

    if (!enrollment) {
      return next(new ApiError(404, 'Enrollment not found in this course.'))
    }

    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Enrollment deleted successfully', {}))
  } catch (error) {
    console.error('[DELETE_ENROLLMENT_ERROR]', error)
    next(error)
  }
}

//Update enrollment (extend expiration)
const updateEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const course = req.course!
    const { enrollmentId } = req.params
    const bodySchema = z.object({
      durationInDays: z.number().int().positive().optional(),
      expiresAt: z.string().datetime().optional(),
    })

    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { durationInDays, expiresAt } = parsed.data

    // Verify enrollment belongs to this course
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        courseId: course.id,
      },
    })

    if (!enrollment) {
      return next(new ApiError(404, 'Enrollment not found in this course.'))
    }

    let newExpiresAt: Date | null = null

    if (expiresAt) {
      // Direct date provided
      newExpiresAt = new Date(expiresAt)
    } else if (durationInDays) {
      // Extend from current expiry or now
      const baseDate = enrollment.expiresAt || new Date()
      newExpiresAt = new Date(baseDate)
      newExpiresAt.setDate(newExpiresAt.getDate() + durationInDays)
    }

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        expiresAt: newExpiresAt,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        endUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Enrollment updated successfully', {
        enrollment: updated,
      })
    )
  } catch (error) {
    console.error('[UPDATE_ENROLLMENT_ERROR]', error)
    next(error)
  }
}

export { createEnrollment, listEnrollments, deleteEnrollment, updateEnrollment }
