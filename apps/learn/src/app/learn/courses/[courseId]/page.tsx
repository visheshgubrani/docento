import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { apiClient, isNotFound, redirectIfSignedOut } from '@/lib/academy'

export const metadata: Metadata = { title: 'Course' }

/**
 * The course a learner is following.
 *
 * ## The release, not the draft
 *
 * This reads the published release the learner is enrolled on, so an author
 * editing the draft cannot change what somebody is in the middle of. The release
 * version is shown because a support conversation about "the lesson looks
 * different" needs one.
 *
 * ## Access can have lapsed, and the page says so
 *
 * A learner whose grant was revoked still sees the course and their progress,
 * with the lessons marked unavailable. Removing the page would be a lie about
 * what they did; showing the lessons would be a lie about what they may do.
 */
export default async function LearnerCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  const session = await redirectIfSignedOut(`/courses/${courseId}`)

  const api = await apiClient()

  let data

  try {
    data = await api.getLearnerCourse(courseId)
  } catch (error) {
    // Not enrolled, or the course is gone — both are a 404 to this page.
    if (isNotFound(error)) notFound()

    throw error
  }

  const lessons = data.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  )

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl tracking-tight">
          {data.course.title}
        </h1>

        <p className="text-muted-foreground text-sm">
          {data.course.percent}% complete · release v{data.releaseVersion}
        </p>

        {!data.hasAccess ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your access to this course has ended, so the lessons are not
            available. Your progress is kept — if access is restored, you carry
            on where you stopped.
          </p>
        ) : null}
      </header>

      <section className="flex flex-col gap-8">
        {data.modules.map((module) => (
          <div key={module.id} className="flex flex-col gap-3">
            <h2 className="font-display text-lg tracking-tight">
              {module.title}
            </h2>

            <ul className="flex flex-col gap-2">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  {data.hasAccess ? (
                    <Link
                      href={`/learn/courses/${courseId}/lessons/${lesson.id}`}
                      className="border-border hover:border-primary/40 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm transition-colors"
                    >
                      <span>{lesson.title}</span>
                      <span className="text-muted-foreground text-xs uppercase">
                        {lesson.contentType.toLowerCase()}
                      </span>
                    </Link>
                  ) : (
                    <span className="border-border text-muted-foreground flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm opacity-60">
                      <span>{lesson.title}</span>
                      <span className="text-xs uppercase">Locked</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="text-muted-foreground text-sm">
        {lessons.length} lesson{lessons.length === 1 ? '' : 's'} in this course.
      </p>
    </main>
  )
}
