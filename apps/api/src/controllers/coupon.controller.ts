import { NextFunction, Request, Response } from 'express'
import { CouponStatus, Prisma } from '../generated/prisma'

import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'

const DISCOUNT_TYPES = ['PERCENTAGE', 'FLAT'] as const
const COUPON_STATUSES = ['ACTIVE', 'PAUSED'] as const

type CouponDiscountType = (typeof DISCOUNT_TYPES)[number]
type CouponWithRelations = Prisma.CouponGetPayload<{
  include: {
    couponCourses: {
      include: {
        course: {
          select: {
            id: true
            title: true
          }
        }
      }
    }
  }
}>

const normalizeDiscountType = (value: unknown): CouponDiscountType | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return DISCOUNT_TYPES.find((entry) => entry === normalized) ?? null
}

const normalizeCouponStatus = (value: unknown): CouponStatus | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return COUPON_STATUSES.find((entry) => entry === normalized) ?? null
}

const parsePositiveNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const parseOptionalPositiveInt = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null

  const parsed = parsePositiveNumber(value)
  if (parsed === null) return null
  if (!Number.isInteger(parsed)) return null
  return parsed
}

const parseOptionalDate = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const sanitizeCourseIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  const ids = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return [...new Set(ids)]
}

const mapCoupon = (coupon: CouponWithRelations) => ({
  id: coupon.id,
  projectId: coupon.projectId,
  code: coupon.code,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  appliesToAll: coupon.appliesToAll,
  usageLimit: coupon.usageLimit,
  usageCount: coupon.usageCount,
  expiresAt: coupon.expiresAt,
  status: coupon.status,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
  courseIds: coupon.couponCourses.map((entry) => entry.courseId),
  courses: coupon.couponCourses.map((entry) => ({
    id: entry.course.id,
    title: entry.course.title,
  })),
})

export const listCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project
    if (!project) {
      return next(new ApiError(401, 'Unauthorized'))
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        projectId: project.id,
      },
      include: {
        couponCourses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Coupons fetched successfully', {
        coupons: coupons.map(mapCoupon),
      })
    )
  } catch (error) {
    console.error('[LIST_COUPONS_ERROR]', error)
    return next(new ApiError(500, 'Failed to fetch coupons'))
  }
}

export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project
    if (!project) {
      return next(new ApiError(401, 'Unauthorized'))
    }

    const codeInput = typeof req.body?.code === 'string' ? req.body.code : ''
    const code = codeInput.trim().toUpperCase().replace(/\s+/g, '')
    const discountType = normalizeDiscountType(req.body?.discountType)
    const discountValue = parsePositiveNumber(req.body?.discountValue)
    const usageLimit = parseOptionalPositiveInt(req.body?.usageLimit)
    const expiresAt = parseOptionalDate(req.body?.expiresAt)
    const appliesToAll =
      req.body?.appliesToAll === undefined ? true : req.body.appliesToAll
    const courseIds = sanitizeCourseIds(req.body?.courseIds)

    if (!code) {
      return next(new ApiError(400, 'Coupon code is required'))
    }

    if (code.length > 64) {
      return next(new ApiError(400, 'Coupon code must be 64 characters or less'))
    }

    if (!discountType) {
      return next(
        new ApiError(400, 'discountType must be either PERCENTAGE or FLAT')
      )
    }

    if (discountValue === null || discountValue <= 0) {
      return next(new ApiError(400, 'discountValue must be greater than 0'))
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return next(
        new ApiError(400, 'Percentage discount cannot be greater than 100')
      )
    }

    if (
      req.body?.usageLimit !== undefined &&
      req.body?.usageLimit !== null &&
      usageLimit === null
    ) {
      return next(new ApiError(400, 'usageLimit must be a positive integer'))
    }

    if (usageLimit !== null && usageLimit <= 0) {
      return next(new ApiError(400, 'usageLimit must be a positive integer'))
    }

    if (
      req.body?.expiresAt !== undefined &&
      req.body?.expiresAt !== null &&
      req.body?.expiresAt !== '' &&
      !expiresAt
    ) {
      return next(new ApiError(400, 'expiresAt must be a valid date'))
    }

    if (typeof appliesToAll !== 'boolean') {
      return next(new ApiError(400, 'appliesToAll must be a boolean'))
    }

    if (!appliesToAll && courseIds.length === 0) {
      return next(
        new ApiError(400, 'Select at least one course or set appliesToAll')
      )
    }

    if (!appliesToAll) {
      const matchedCourses = await prisma.course.findMany({
        where: {
          projectId: project.id,
          id: {
            in: courseIds,
          },
        },
        select: {
          id: true,
        },
      })

      if (matchedCourses.length !== courseIds.length) {
        return next(
          new ApiError(400, 'One or more selected courses do not belong to this project')
        )
      }
    }

    const created = await prisma.coupon.create({
      data: {
        projectId: project.id,
        code,
        discountType,
        discountValue,
        appliesToAll,
        usageLimit,
        expiresAt,
        status: 'ACTIVE',
        couponCourses:
          !appliesToAll && courseIds.length > 0
            ? {
                createMany: {
                  data: courseIds.map((courseId) => ({ courseId })),
                },
              }
            : undefined,
      },
      include: {
        couponCourses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'Coupon created successfully', {
        coupon: mapCoupon(created),
      })
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return next(new ApiError(409, 'Coupon code already exists in this project'))
    }

    console.error('[CREATE_COUPON_ERROR]', error)
    return next(new ApiError(500, 'Failed to create coupon'))
  }
}

export const updateCouponStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project
    if (!project) {
      return next(new ApiError(401, 'Unauthorized'))
    }

    const { couponId } = req.params
    const status = normalizeCouponStatus(req.body?.status)

    if (!couponId) {
      return next(new ApiError(400, 'couponId is required'))
    }

    if (!status) {
      return next(new ApiError(400, 'status must be either ACTIVE or PAUSED'))
    }

    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        id: couponId,
        projectId: project.id,
      },
      select: {
        id: true,
      },
    })

    if (!existingCoupon) {
      return next(new ApiError(404, 'Coupon not found'))
    }

    const updated = await prisma.coupon.update({
      where: {
        id: existingCoupon.id,
      },
      data: {
        status,
      },
      include: {
        couponCourses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Coupon status updated successfully', {
        coupon: mapCoupon(updated),
      })
    )
  } catch (error) {
    console.error('[UPDATE_COUPON_STATUS_ERROR]', error)
    return next(new ApiError(500, 'Failed to update coupon status'))
  }
}
