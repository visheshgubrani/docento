'use server'

import { getProfile } from '@/actions/auth'
import { fetchAPI } from '@/lib/fetch-api'

type StudentOrder = {
  id: string
  amount: number
  currency: string
  status: string
  provider: string
  providerTxId?: string | null
  receiptUrl?: string | null
  createdAt: string
  isFreeEnrollment?: boolean
  course: {
    id: string
    title: string
    thumbnail?: string | null
    slug?: string
    price?: number | null
  }
}

type StudentOrdersResponse = {
  data: {
    orders: StudentOrder[]
  }
}

type StorefrontCatalogResponse = {
  data?: {
    courses?: StorefrontCatalogCourse[]
  }
}

type StorefrontCatalogCourse = {
  id: string
  title: string
  thumbnail?: string | null
  slug?: string
  price?: number | null
}

type StudentCoursesResponse = {
  data?: {
    courses?: Array<{
      id: string
      progress?: number
    }>
  }
}

type StudentCourseContentSummaryResponse = {
  data?: {
    course?: {
      modules?: Array<{
        lessons?: Array<{
          id: string
        }>
      }>
    }
    progressMap?: Record<
      string,
      {
        isCompleted?: boolean
        lastWatchedAt?: string
      }
    >
  }
}

function resolveResumeLessonId(
  content?: StudentCourseContentSummaryResponse['data'],
) {
  const allLessons =
    content?.course?.modules?.flatMap((module) => module.lessons ?? []) ?? []

  if (allLessons.length < 1) {
    return null
  }

  const progressMap = content?.progressMap ?? {}

  const lastWatched = Object.entries(progressMap)
    .filter(([, progress]) => Boolean(progress?.lastWatchedAt))
    .sort((a, b) => {
      const aTime = new Date(a[1]?.lastWatchedAt || 0).getTime()
      const bTime = new Date(b[1]?.lastWatchedAt || 0).getTime()
      return bTime - aTime
    })[0]?.[0]

  if (lastWatched && allLessons.some((lesson) => lesson.id === lastWatched)) {
    return lastWatched
  }

  const firstIncomplete = allLessons.find(
    (lesson) => !progressMap[lesson.id]?.isCompleted,
  )
  if (firstIncomplete?.id) {
    return firstIncomplete.id
  }

  return allLessons[0]?.id ?? null
}

export async function getDashboardData() {
  try {
    const profile = await getProfile()

    if (!profile) {
      return { success: false as const, error: 'Not authenticated' }
    }

    let progressByCourseId = new Map<string, number>()
    let resumeLessonIdByCourseId = new Map<string, string | null>()
    try {
      const studentCoursesResponse = await fetchAPI<StudentCoursesResponse>(
        '/student/courses',
        {
          requireAuth: true,
        },
      )

      const studentCourses = studentCoursesResponse.data?.courses ?? []

      progressByCourseId = new Map(
        studentCourses.map((course) => [
          course.id,
          typeof course.progress === 'number' ? course.progress : 0,
        ]),
      )

      const resumeEntries = await Promise.all(
        studentCourses.map(async (course) => {
          try {
            const contentResponse =
              await fetchAPI<StudentCourseContentSummaryResponse>(
                `/student/courses/${course.id}`,
                { requireAuth: true },
              )
            return [
              course.id,
              resolveResumeLessonId(contentResponse.data),
            ] as const
          } catch {
            return [course.id, null] as const
          }
        }),
      )

      resumeLessonIdByCourseId = new Map(resumeEntries)
    } catch (error) {
      console.error('Dashboard student courses fetch error:', error)
    }

    const enrollments = profile.profile.enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      progress: Math.max(
        0,
        Math.min(100, progressByCourseId.get(enrollment.course.id) ?? 0),
      ),
      resumeLessonId:
        resumeLessonIdByCourseId.get(enrollment.course.id) ?? null,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        thumbnail: enrollment.course.thumbnail,
        slug: enrollment.course.slug,
      },
    }))

    const userName =
      profile.profile.managedUser?.name || profile.profile.email.split('@')[0]

    return {
      success: true as const,
      data: {
        userName,
        email: profile.profile.email,
        enrollments,
      },
    }
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return { success: false as const, error: 'Failed to load dashboard data' }
  }
}

export async function getPurchaseHistoryData() {
  try {
    const profile = await getProfile()

    if (!profile) {
      return { success: false as const, error: 'Not authenticated' }
    }

    const ordersResponse = await fetchAPI<StudentOrdersResponse>(
      '/student/orders',
      {
        requireAuth: true,
      },
    )

    let catalogCourses: StorefrontCatalogCourse[] = []
    try {
      const catalogResponse = await fetchAPI<StorefrontCatalogResponse>(
        '/storefront/courses',
      )
      catalogCourses = catalogResponse.data?.courses ?? []
    } catch (error) {
      console.error('Purchase history catalog fetch error:', error)
    }

    const paidOrders = ordersResponse.data.orders ?? []
    const paidOrderCourseIds = new Set(
      paidOrders.map((order) => order.course.id),
    )
    const catalogByCourseId = new Map<string, StorefrontCatalogCourse>(
      catalogCourses.map((course) => [course.id, course]),
    )

    const freeEnrollmentOrders: StudentOrder[] = profile.profile.enrollments
      .filter((enrollment) => !paidOrderCourseIds.has(enrollment.course.id))
      .filter((enrollment) => {
        const course = catalogByCourseId.get(enrollment.course.id)
        return Boolean(course && (!course.price || course.price <= 0))
      })
      .map((enrollment) => {
        const catalogCourse = catalogByCourseId.get(enrollment.course.id)
        return {
          id: `free-enrollment-${enrollment.id}`,
          amount: 0,
          currency: 'INR',
          status: 'COMPLETED',
          provider: 'FREE_ENROLLMENT',
          providerTxId: null,
          receiptUrl: null,
          createdAt: enrollment.enrolledAt,
          isFreeEnrollment: true,
          course: {
            id: enrollment.course.id,
            title: enrollment.course.title || catalogCourse?.title || 'Course',
            thumbnail:
              enrollment.course.thumbnail ?? catalogCourse?.thumbnail ?? null,
            slug: enrollment.course.slug || catalogCourse?.slug,
            price: catalogCourse?.price ?? 0,
          },
        }
      })

    const historyOrders = [...paidOrders, ...freeEnrollmentOrders].sort(
      (a, b) => {
        const aTime = new Date(a.createdAt).getTime()
        const bTime = new Date(b.createdAt).getTime()
        return bTime - aTime
      },
    )

    const userName =
      profile.profile.managedUser?.name || profile.profile.email.split('@')[0]

    return {
      success: true as const,
      data: {
        userName,
        email: profile.profile.email,
        enrollments: profile.profile.enrollments,
        orders: historyOrders,
      },
    }
  } catch (error) {
    console.error('Purchase history fetch error:', error)
    return { success: false as const, error: 'Failed to load purchase history' }
  }
}

export type OrderDocumentResponse = {
  order: {
    id: string
    providerTxId?: string | null
    amount: number
    currency: string
    status: string
    provider: string
    createdAt: string
    metadata?: any
  }
  course: {
    title: string
  }
  tenant: {
    name: string
    branding?: any
  }
  student: {
    name: string
    email: string
  }
}

export async function getOrderReceipt(orderId: string) {
  try {
    const profile = await getProfile()
    if (!profile) return { success: false as const, error: 'Not authenticated' }
    const res = await fetchAPI<{ data?: OrderDocumentResponse }>(
      `/commerce/orders/${orderId}/receipt`,
      { requireAuth: true },
    )
    if (!res.data)
      return { success: false as const, error: 'Failed to fetch receipt' }
    return { success: true as const, data: res.data }
  } catch (error) {
    console.error('Receipt fetch error:', error)
    return { success: false as const, error: 'Failed to load receipt data' }
  }
}

export async function getOrderInvoice(orderId: string) {
  try {
    const profile = await getProfile()
    if (!profile) return { success: false as const, error: 'Not authenticated' }
    const res = await fetchAPI<{ data?: OrderDocumentResponse }>(
      `/commerce/orders/${orderId}/invoice`,
      { requireAuth: true },
    )
    if (!res.data)
      return { success: false as const, error: 'Failed to fetch invoice' }
    return { success: true as const, data: res.data }
  } catch (error) {
    console.error('Invoice fetch error:', error)
    return { success: false as const, error: 'Failed to load invoice data' }
  }
}
