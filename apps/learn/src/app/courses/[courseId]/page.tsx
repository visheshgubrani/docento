import type { Metadata } from 'next'
import Link from 'next/link'

import { EnrollButton } from '@/components/catalog/enroll-button'
import { CurriculumOutline } from '@/components/common/course-card'
import {
  apiClient,
  catalogCourse,
  getLearnerSession,
  resolveAcademy,
} from '@/lib/academy'

/**
 * A published course.
 *
 * ## Readable without an account, openable only with one
 *
 * The overview and outline are public — that is what a catalogue is for — and
 * the lessons are not. The outline deliberately carries titles and free-preview
 * flags only, so "public" cannot mean "the whole course": the shape the contract
 * returns has nowhere to put a body or a media reference.
 *
 * ## Enrolment has three states, and they are different
 *
 * Not signed in: sign in to enrol. Signed in and not enrolled: enrol. Enrolled:
 * go to the course. A page that showed "Enrol" to somebody already enrolled is
 * how a learner ends up wondering whether they lost their progress.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>
}): Promise<Metadata> {
  const { courseId } = await params
  const academy = await resolveAcademy()

  if (!academy) return { title: 'Course' }

  const found = await catalogCourse(academy.id, courseId)

  return {
    title: found?.course.title ?? 'Course',
    description: found?.course.description ?? undefined,
  }
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  const [academy, session] = await Promise.all([
    resolveAcademy(),
    getLearnerSession(),
  ])

  if (!academy) return null

  const found = await catalogCourse(academy.id, courseId)

  if (!found) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-3 px-6">
        <h1 className="font-display text-2xl tracking-tight">
          Course not found
        </h1>
        <p className="text-muted-foreground text-sm">
          This course does not exist here, or it is not published.
        </p>
        <Link
          href="/courses"
          className="text-primary text-sm font-medium underline"
        >
          Back to the catalogue
        </Link>
      </main>
    )
  }

  const { course, curriculum } = found

  /**
   * Whether the learner is already enrolled.
   *
   * From their own course list rather than a separate operation: the list is
   * what the dashboard uses, and a second endpoint answering "am I enrolled"
   * would be a second answer that could disagree.
   */
  const enrolled = session
    ? (await apiClient())
        .listLearnerCourses()
        .then(({ courses }) =>
          courses.find((entry) => entry.courseId === courseId),
        )
        .catch(() => undefined)
    : undefined

  const lessonCount = curriculum.reduce(
    (total, module) => total + module.lessons.length,
    0,
  )

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl/[1.1] tracking-tight">
          {course.title}
        </h1>

        <p className="text-muted-foreground text-sm">
          {curriculum.length} module{curriculum.length === 1 ? '' : 's'} ·{' '}
          {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
        </p>

        {course.description ? (
          <p className="max-w-2xl text-lg/8 text-foreground/80">
            {course.description}
          </p>
        ) : null}

        <div className="mt-2">
          {enrolled ? (
            <Link
              href={`/learn/courses/${courseId}`}
              className="bg-foreground text-background inline-flex rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Go to your course
            </Link>
          ) : session ? (
            <EnrollButton courseId={courseId} academySlug={academy.slug} />
          ) : (
            <Link
              href={`/login?next=/courses/${courseId}`}
              className="bg-foreground text-background inline-flex rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Sign in to enrol
            </Link>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-xl tracking-tight">
          What is in this course
        </h2>
        <CurriculumOutline modules={curriculum} />
      </section>
    </main>
  )
}
