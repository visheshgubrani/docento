import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/actions/dashboard'
import { CourseCard } from '@/components/common/course-card'
import { fetchAPI } from '@/lib/fetch-api'
import type { StorefrontCourse } from '@/lib/lms-api-client'
import type { Metadata } from 'next'
import { ImBooks } from 'react-icons/im'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your enrolled courses and learning progress.',
}

type StorefrontCatalogResponse = {
  data?: {
    courses?: StorefrontCourse[]
  }
}

export default async function DashboardPage() {
  const result = await getDashboardData()

  if (!result.success) {
    redirect('/login')
  }

  const { userName, enrollments } = result.data
  const enrolledCourseIds = new Set(
    enrollments.map((enrollment) => enrollment.course.id),
  )
  let catalogCourses: StorefrontCourse[] = []
  let latestCourses: StorefrontCourse[] = []

  try {
    const catalogResponse = await fetchAPI<StorefrontCatalogResponse>(
      '/storefront/courses',
    )
    catalogCourses = catalogResponse.data?.courses ?? []
    latestCourses = catalogCourses
      .filter((course) => !enrolledCourseIds.has(course.id))
      .slice(0, 3)
  } catch {
    catalogCourses = []
    latestCourses = []
  }

  const catalogCourseById = new Map(
    catalogCourses.map((course) => [course.id, course]),
  )

  return (
    <>
      {/* ── Main Content ── */}
      <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Welcome back, {userName}
          </h1>
          <p className="mt-3 text-lg text-foreground/70">
            {enrollments.length > 0
              ? 'Continue where you left off.'
              : 'Start your learning journey today.'}
          </p>
        </div>

        {enrollments.length > 0 ? (
          /* ── Enrolled Courses ── */
          <section className="bg-muted dark:bg-muted/40 p-6 rounded-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-wide font-light text-foreground">
                My Courses
              </h2>
              <span className="text-sm bg-muted-foreground/15 dark:bg-muted px-4 py-1 rounded-full text-foreground/70">
                {enrollments.length}{' '}
                {enrollments.length === 1 ? 'course' : 'courses'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment, index) => {
                const enrolledDate = new Date(
                  enrollment.enrolledAt,
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                const catalogCourse = catalogCourseById.get(
                  enrollment.course.id,
                )

                return (
                  <CourseCard
                    key={enrollment.id}
                    index={index}
                    resumeHref={
                      enrollment.resumeLessonId
                        ? `/courses/${enrollment.course.id}/${enrollment.resumeLessonId}`
                        : `/courses/${enrollment.course.id}`
                    }
                    viewHref={`/courses/${enrollment.course.id}`}
                    ctaLabel="Continue Learning"
                    isEnrolled
                    progressPercent={enrollment.progress}
                    metaLabel={`Enrolled ${enrolledDate}`}
                    course={{
                      id: enrollment.course.id,
                      title: enrollment.course.title,
                      description: catalogCourse?.description ?? null,
                      thumbnail:
                        enrollment.course.thumbnail ??
                        catalogCourse?.thumbnail ??
                        null,
                      slug: enrollment.course.slug ?? catalogCourse?.slug,
                      price: catalogCourse?.price ?? null,
                      category: catalogCourse?.category ?? [],
                      instructors: catalogCourse?.instructors ?? [],
                    }}
                  />
                )
              })}
            </div>
          </section>
        ) : (
          /* ── Empty State ── */
          <section className="flex flex-col items-center bg-muted dark:bg-muted/60 justify-center rounded-xl border border-dashed border-muted-foreground/50 dark:border-muted-foreground/30 px-6 py-12 text-center">
            <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-background">
              <ImBooks className="size-7 text-primary" />
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground">
              You&apos;re not enrolled in any courses
            </h2>
            <p className="mt-3 max-w-sm text-base text-foreground/80">
              Browse our course catalog and enroll in a class to begin building
              new skills today.
            </p>

            {/* <Link
              href="/courses"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Browse Courses
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link> */}
          </section>
        )}

        <section className="w-full my-16 lg:mt-24">
          <div className="mb-8 flex md:flex-row flex-col items-center justify-between gap-4">
            <h2 className="font-display text-3xl font-medium text-foreground">
              Explore Additional Courses
            </h2>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Browse Courses
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>

          {latestCourses.length > 0 ? (
            <div className="mx-auto grid grid-cols-1 gap-6 md:grid-cols-3">
              {latestCourses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-foreground/65">
              No additional courses available right now.
            </div>
          )}
        </section>
      </main>
    </>
  )
}
