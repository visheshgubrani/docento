import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'

const paramsSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
})

const extractNameFromMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined
  }

  const value = (metadata as Record<string, unknown>).name
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const issueCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!
    const parsed = paramsSchema.safeParse(req.params)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { courseId } = parsed.data

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        endUserId: endUser.id,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
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
                metadata: true,
              },
            },
          },
        },
      },
    })

    if (!enrollment || !enrollment.course) {
      return next(new ApiError(404, 'Enrollment not found for this course.'))
    }

    const completedAt = enrollment.completedAt
    const isCompleted = Boolean(completedAt) || enrollment.progress >= 100

    if (!isCompleted) {
      return next(
        new ApiError(403, 'Course is not completed yet. Finish all lessons.'),
      )
    }

    const delegatedName = extractNameFromMetadata(
      enrollment.endUser.delegatedUser?.metadata,
    )

    const recipientName =
      enrollment.endUser.managedUser?.name ||
      delegatedName ||
      enrollment.endUser.email ||
      enrollment.endUser.externalId ||
      'Student'

    let issuedAt = completedAt
    if (!issuedAt && enrollment.progress >= 100) {
      const updated = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { completedAt: new Date() },
        select: { completedAt: true },
      })
      issuedAt = updated.completedAt
    }

    const certificate = {
      id: `cert_${enrollment.id}`,
      enrollmentId: enrollment.id,
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      courseSlug: enrollment.course.slug,
      recipientId: enrollment.endUser.id,
      recipientName,
      recipientEmail: enrollment.endUser.email,
      issuedAt,
    }

    return res
      .status(200)
      .json(new ApiResponse(200, 'Certificate issued', { certificate }))
  } catch (error) {
    next(error)
  }
}

export { issueCertificate }
