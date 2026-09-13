import type { Metadata } from 'next'
import { fetchAPI } from '@/lib/fetch-api'
import { siteConfig } from '@/config/site'

type StorefrontCourseResponse = {
  data?: {
    course?: {
      title?: string | null
    }
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>
}): Promise<Metadata> {
  const fallback: Metadata = {
    title: 'Lesson',
    description: `Watch course lessons and continue learning on ${siteConfig.name}.`,
  }

  try {
    const { courseId } = await params
    const response = await fetchAPI<StorefrontCourseResponse>(
      `/storefront/courses/${courseId}`,
    )
    const courseTitle = response?.data?.course?.title?.trim()

    if (!courseTitle) return fallback

    return {
      title: courseTitle,
      description: `Watch lessons from ${courseTitle} on ${siteConfig.name}.`,
    }
  } catch {
    return fallback
  }
}

export default function CoursePlayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-background [&+footer]:hidden">
      {children}
    </div>
  )
}
