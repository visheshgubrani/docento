import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { APIError, fetchAPI } from '@/lib/fetch-api'
import type {
  StorefrontCourseDetail,
  StudentCourseContent,
} from '@/lib/lms-api-client'

type StudentCourseContentResponse = {
  data: StudentCourseContent
}

type StorefrontCourseResponse = {
  data?: {
    course?: StorefrontCourseDetail
  }
}

function resolveLessonId(
  content: StudentCourseContent,
  requestedLessonId?: string | null,
) {
  const allLessons = content.course.modules.flatMap((module) => module.lessons)
  if (allLessons.length < 1) return null

  const normalizedRequested = requestedLessonId?.trim() || null
  const hasRequestedLesson = normalizedRequested
    ? allLessons.some((lesson) => lesson.id === normalizedRequested)
    : false
  if (hasRequestedLesson && normalizedRequested) {
    return normalizedRequested
  }

  const lastWatched = Object.entries(content.progressMap)
    .filter(([, progress]) => Boolean(progress?.lastWatchedAt))
    .sort((a, b) => {
      const aTime = new Date(a[1]?.lastWatchedAt || 0).getTime()
      const bTime = new Date(b[1]?.lastWatchedAt || 0).getTime()
      return bTime - aTime
    })[0]?.[0]

  if (lastWatched && allLessons.some((lesson) => lesson.id === lastWatched)) {
    return lastWatched
  }

  return allLessons[0]?.id ?? null
}

export const metadata: Metadata = {
  title: 'Course Player',
  description: 'Redirecting to the course player.',
}

export default async function DashboardCourseRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ lesson?: string }>
}) {
  const { courseId } = await params
  const { lesson } = await searchParams

  try {
    const response = await fetchAPI<StudentCourseContentResponse>(
      `/student/courses/${courseId}`,
      {
        requireAuth: true,
      },
    )

    const lessonId = resolveLessonId(response.data, lesson)
    if (!lessonId) {
      redirect(`/courses/${courseId}`)
    }

    redirect(`/courses/${courseId}/${lessonId}`)
  } catch (error) {
    if (
      error instanceof APIError &&
      (error.status === 401 || error.status === 403)
    ) {
      redirect(`/courses/${courseId}`)
    }

    try {
      const courseResponse = await fetchAPI<StorefrontCourseResponse>(
        `/storefront/courses/${courseId}`,
      )
      const firstLessonId = courseResponse.data?.course?.modules.flatMap(
        (module) => module.lessons,
      )[0]?.id

      if (firstLessonId) {
        redirect(`/courses/${courseId}/${firstLessonId}`)
      }
    } catch {
      // Fall back to public course page below.
    }

    redirect(`/courses/${courseId}`)
  }
}
