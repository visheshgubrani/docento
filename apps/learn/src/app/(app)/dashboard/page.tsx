import type { Metadata } from 'next'
import Link from 'next/link'

import { CourseProgressCard } from '@/components/dashboard/course-progress-card'
import { apiClient, getLearnerSession, resolveAcademy } from '@/lib/academy'

export const metadata: Metadata = { title: 'Dashboard' }

/**
 * The learner's courses.
 *
 * ## Where the progress comes from
 *
 * The courses list returns progress alongside each course, computed server-side
 * from the release the learner follows. The dashboard does not compute anything:
 * a percentage derived here would be a second implementation of the completion
 * rule, and it would disagree with the certificate endpoint the first time a
 * release changed.
 *
 * ## Access is reported, not assumed
 *
 * A course whose grant has lapsed still appears, marked. Removing it would leave
 * a learner wondering where their course went, and a progress record that
 * survives is the point of separating permission from learning.
 */
export default async function DashboardPage() {
  const [academy, session] = await Promise.all([
    resolveAcademy(),
    getLearnerSession(),
  ])

  // The layout redirects when there is no session, so this is for the type.
  if (!session || !academy) return null

  const api = await apiClient()
  const { courses } = await api.listLearnerCourses()

  const inProgress = courses.filter((course) => !course.isComplete)
  const complete = courses.filter((course) => course.isComplete)

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">
          Hello, {session.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {courses.length === 0
            ? 'You are not enrolled in anything yet.'
            : `${courses.length} course${courses.length === 1 ? '' : 's'}.`}
        </p>
      </header>

      {courses.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center">
          Nothing here yet.{' '}
          <Link href="/" className="text-primary font-medium underline">
            Browse the catalogue
          </Link>
          .
        </p>
      ) : (
        <>
          {inProgress.length > 0 ? (
            <section className="flex flex-col gap-6">
              <h2 className="font-display text-xl tracking-tight">
                Continue learning
              </h2>
              <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((course) => (
                  <li key={course.courseId}>
                    <CourseProgressCard course={course} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {complete.length > 0 ? (
            <section className="flex flex-col gap-6">
              <h2 className="font-display text-xl tracking-tight">Completed</h2>
              <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {complete.map((course) => (
                  <li key={course.courseId}>
                    <CourseProgressCard course={course} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  )
}
