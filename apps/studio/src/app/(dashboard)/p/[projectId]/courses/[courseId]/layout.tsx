import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import CourseBuilderLayoutClient from './course-builder-layout-client'

type Props = {
  params: Promise<{ projectId: string; courseId: string }>
  children: React.ReactNode
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'

async function fetchCourseForMetadata(projectId: string, courseId: string) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const response = await fetch(
    `${API_BASE_URL}/projects/${projectId}/courses/${courseId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data?.course ?? data?.data?.course ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, courseId } = await params

  try {
    const course = await fetchCourseForMetadata(projectId, courseId)
    if (course?.title) {
      return {
        title: {
          absolute: `${course.title} | Docento`,
        },
      }
    }
  } catch {
    // Fall through to default
  }

  return {
    title: {
      absolute: 'Course | Docento',
    },
  }
}

export default function CourseBuilderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CourseBuilderLayoutClient>{children}</CourseBuilderLayoutClient>
}
