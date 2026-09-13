import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiResponse from '../utils/ApiResponse'
import ApiError from '../utils/ApiError'

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

const toMajorAmount = (amount: number | null | undefined, currency = 'INR') => {
  const minorAmount = amount ?? 0
  const divisor = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100
  return Number((minorAmount / divisor).toFixed(2))
}

const getDelegatedUserName = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const name = (metadata as Record<string, unknown>).name
  if (typeof name !== 'string') {
    return null
  }

  const trimmed = name.trim()
  return trimmed || null
}

const getEndUserDisplayName = (endUser: {
  managedUser?: { name?: string | null } | null
  delegatedUser?: { metadata?: unknown } | null
  email?: string | null
  externalId?: string | null
}) => {
  return (
    endUser.managedUser?.name?.trim() ||
    getDelegatedUserName(endUser.delegatedUser?.metadata) ||
    endUser.email?.split('@')[0] ||
    endUser.externalId ||
    'Student'
  )
}

// High-level KPIs for a project
const getOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = req.project!

    const [
      enrollmentAggregate,
      totalStudents,
      activeCourses,
      rawRevenueByCurrency,
    ] = await Promise.all([
      prisma.enrollment.aggregate({
        where: { course: { projectId: project.id } },
        _count: { _all: true },
        _avg: { progress: true },
      }),
      prisma.endUser.count({ where: { projectId: project.id } }),
      prisma.course.count({
        where: { projectId: project.id, isPublished: true },
      }),
      prisma.order.groupBy({
        by: ['currency'],
        where: { projectId: project.id, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ])

    const revenueByCurrency = rawRevenueByCurrency.map((entry) => ({
      currency: entry.currency,
      amount: toMajorAmount(entry._sum.amount, entry.currency),
    }))

    const totalRevenue = revenueByCurrency.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

    return res.status(200).json(
      new ApiResponse(200, 'Analytics overview fetched', {
        overview: {
          totalRevenue,
          revenueByCurrency,
          totalStudents,
          activeCourses,
          totalEnrollments: enrollmentAggregate._count?._all ?? 0,
          averageProgress: Math.round(enrollmentAggregate._avg.progress ?? 0),
        },
      }),
    )
  } catch (error) {
    console.error('[ANALYTICS_OVERVIEW_ERROR]', error)
    next(error)
  }
}

// Recent transaction feed (latest 100 for analytics views; client can trim further)
const getRecentSales = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!

    const orders = await prisma.order.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        course: { select: { id: true, title: true } },
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

    return res.status(200).json(
      new ApiResponse(200, 'Recent transactions fetched', {
        transactions: orders.map((order) => ({
          id: order.id,
          amount: toMajorAmount(order.amount, order.currency),
          currency: order.currency,
          status: order.status,
          provider: order.provider,
          providerTxId: order.providerTxId,
          createdAt: order.createdAt,
          receiptUrl: order.receiptUrl,
          course: order.course,
          student: {
            id: order.endUser.id,
            name: getEndUserDisplayName(order.endUser),
            email: order.endUser.email,
            externalId: order.endUser.externalId,
          },
        })),
      }),
    )
  } catch (error) {
    console.error('[ANALYTICS_RECENT_SALES_ERROR]', error)
    next(error)
  }
}

// Course-level insight: enrollment + progress
const getCourseInsights = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!
    const { courseId } = req.params

    const course = await prisma.course.findFirst({
      where: { id: courseId, projectId: project.id },
      select: {
        id: true,
        title: true,
        price: true,
        isPublished: true,
        createdAt: true,
      },
    })

    if (!course) {
      return next(new ApiError(404, 'Course not found'))
    }

    const [enrollmentsAggregate, completedEnrollments, revenueByCurrency] =
      await Promise.all([
        prisma.enrollment.aggregate({
          where: { courseId: course.id },
          _count: { _all: true },
          _avg: { progress: true },
        }),
        prisma.enrollment.count({
          where: { courseId: course.id, progress: 100 },
        }),
        prisma.order.groupBy({
          by: ['currency'],
          where: {
            courseId: course.id,
            projectId: project.id,
            status: 'COMPLETED',
          },
          _sum: { amount: true },
        }),
      ])

    const totalEnrollments = enrollmentsAggregate._count?._all ?? 0
    const averageProgress = Math.round(enrollmentsAggregate._avg.progress ?? 0)
    const completionRate = totalEnrollments
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0
    const revenue = revenueByCurrency.reduce(
      (sum, entry) => sum + toMajorAmount(entry._sum.amount, entry.currency),
      0,
    )

    return res.status(200).json(
      new ApiResponse(200, 'Course insights fetched', {
        course,
        metrics: {
          totalEnrollments,
          averageProgress,
          completionRate,
          revenue,
        },
      }),
    )
  } catch (error) {
    console.error('[ANALYTICS_COURSE_INSIGHT_ERROR]', error)
    next(error)
  }
}

// Student rollup: enrollment and progress snapshot
const getStudentsProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!

    const [students, activity] = await Promise.all([
      prisma.endUser.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          externalId: true,
          status: true,
          createdAt: true,
          enrollments: {
            select: {
              courseId: true,
              progress: true,
              completedAt: true,
              course: { select: { title: true } },
            },
            orderBy: { enrolledAt: 'desc' },
          },
        },
      }),
      prisma.progress.groupBy({
        by: ['endUserId'],
        where: {
          endUser: { projectId: project.id },
        },
        _max: { lastWatchedAt: true },
      }),
    ])

    const activityMap = new Map(
      activity.map((entry) => [entry.endUserId, entry._max.lastWatchedAt]),
    )

    const studentsWithProgress = students.map((student) => {
      const totalEnrollments = student.enrollments.length
      const averageProgress =
        totalEnrollments > 0
          ? Math.round(
              student.enrollments.reduce(
                (sum, enrollment) => sum + (enrollment.progress ?? 0),
                0,
              ) / totalEnrollments,
            )
          : 0

      return {
        id: student.id,
        email: student.email,
        externalId: student.externalId,
        status: student.status,
        createdAt: student.createdAt,
        averageProgress,
        totalEnrollments,
        lastActiveAt: activityMap.get(student.id) ?? null,
        enrollments: student.enrollments.map((enrollment) => ({
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          progress: enrollment.progress,
          completedAt: enrollment.completedAt,
        })),
      }
    })

    return res.status(200).json(
      new ApiResponse(200, 'Student analytics fetched', {
        students: studentsWithProgress,
      }),
    )
  } catch (error) {
    console.error('[ANALYTICS_STUDENTS_ERROR]', error)
    next(error)
  }
}

// Extra: short-term engagement trends for dashboards
const getEngagementInsights = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      activeStudents,
      lessonsCompleted,
      newEnrollments,
      rawRevenueLastWeek,
      averageProgress,
    ] = await Promise.all([
      prisma.progress.groupBy({
        by: ['endUserId'],
        where: {
          endUser: { projectId: project.id },
          lastWatchedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.progress.count({
        where: {
          endUser: { projectId: project.id },
          completedAt: { gte: sevenDaysAgo },
          isCompleted: true,
        },
      }),
      prisma.enrollment.count({
        where: {
          enrolledAt: { gte: sevenDaysAgo },
          course: { projectId: project.id },
        },
      }),
      prisma.order.groupBy({
        by: ['currency'],
        where: {
          projectId: project.id,
          status: 'COMPLETED',
          createdAt: { gte: sevenDaysAgo },
        },
        _sum: { amount: true },
      }),
      prisma.enrollment.aggregate({
        where: { course: { projectId: project.id } },
        _avg: { progress: true },
      }),
    ])

    const revenueByCurrency7d = rawRevenueLastWeek.map((entry) => ({
      currency: entry.currency,
      amount: toMajorAmount(entry._sum.amount, entry.currency),
    }))

    const revenue7d = revenueByCurrency7d.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

    return res.status(200).json(
      new ApiResponse(200, 'Engagement insights fetched', {
        windowStart: sevenDaysAgo,
        metrics: {
          activeStudents7d: activeStudents.length,
          lessonsCompleted7d: lessonsCompleted,
          newEnrollments7d: newEnrollments,
          revenue7d,
          revenueByCurrency7d,
          averageProgress: Math.round(averageProgress._avg.progress ?? 0),
        },
      }),
    )
  } catch (error) {
    console.error('[ANALYTICS_ENGAGEMENT_ERROR]', error)
    next(error)
  }
}

export {
  getOverview,
  getRecentSales,
  getCourseInsights,
  getStudentsProgress,
  getEngagementInsights,
}
