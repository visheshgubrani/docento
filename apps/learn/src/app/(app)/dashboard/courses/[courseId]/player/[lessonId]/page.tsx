import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Lesson',
  description: 'Redirecting to your lesson.',
}

export default async function LegacyPlayerRoute({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  redirect(`/courses/${courseId}/${lessonId}`)
}
