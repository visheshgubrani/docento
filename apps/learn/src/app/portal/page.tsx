import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import { cachedAcademy, catalogCourses, resolveAcademy } from '@/lib/academy'
import { CourseCard } from '@/components/common/course-card'

/**
 * The academy's front page.
 *
 * ## Why this is not a marketing page
 *
 * A learner arriving here wants the catalogue, and everything a marketing page
 * would say is either the academy's own copy — which belongs in
 * `Academy.branding` and on the academy's site, not in this application's source
 * — or the software's, which belongs in the documentation. What is left is a
 * name, a logo and the courses, which is what this renders.
 *
 * ## The academy is resolved, not configured
 *
 * `resolveAcademy` asks the API which academy this host is about. A host that
 * resolves nothing gets a page saying so, rather than a default academy: on a
 * multi-tenant install, guessing is a cross-tenant read.
 */
export async function generateMetadata(): Promise<Metadata> {
  const academy = await resolveAcademy()

  if (!academy) {
    return { title: 'Academy not found' }
  }

  return {
    title: academy.branding?.displayName ?? academy.name,
    description: `Courses from ${academy.name}.`,
  }
}

export default async function PortalPage() {
  const academy = await cachedAcademy()

  if (!academy) return <UnknownAcademy />

  const { courses, failed } = await catalogCourses(academy.id)

  const displayName = academy.branding?.displayName ?? academy.name

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-10">
      <header className="flex flex-col gap-4">
        {academy.logo ? (
          <Image
            src={academy.logo}
            alt=""
            width={48}
            height={48}
            className="size-12 rounded-md object-contain"
          />
        ) : null}

        <h1 className="font-display text-4xl/[1.1] tracking-tight text-foreground sm:text-5xl/[1.1]">
          {displayName}
        </h1>

        <p className="max-w-2xl text-lg/8 text-foreground/75">
          {courses.length > 0
            ? `${courses.length} course${courses.length === 1 ? '' : 's'} available.`
            : 'Courses will appear here once they are published.'}
        </p>
      </header>

      {failed ? (
        /**
         * A catalogue that could not be read is not the same as an academy with
         * no courses, and saying "no courses" here would send an operator
         * looking at their content rather than at their API.
         */
        <p className="mt-12 rounded-lg border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
          The course catalogue could not be loaded. If you run this academy,
          check that the API is reachable.
        </p>
      ) : courses.length === 0 ? (
        <p className="mt-12 rounded-lg border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
          No courses are published yet.
        </p>
      ) : (
        <section className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              href={`/courses/${course.id}`}
              title={course.title}
              description={course.description}
              thumbnail={course.thumbnail}
              meta={`${course.lessonCount} lesson${
                course.lessonCount === 1 ? '' : 's'
              }`}
            />
          ))}
        </section>
      )}

      <p className="mt-12 text-sm text-foreground/60">
        Already enrolled?{' '}
        <Link href="/dashboard" className="font-medium text-primary underline">
          Go to your dashboard
        </Link>
      </p>
    </main>
  )
}

/**
 * What a host that resolves nothing gets.
 *
 * A plain page rather than a `404`: the host is real and reachable, it just does
 * not serve an academy, and a visitor who typed the address should be told that
 * rather than shown a generic error.
 */
function UnknownAcademy() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        No academy at this address
      </h1>

      <p className="text-foreground/75">
        This address is not configured for an academy. If you are setting one
        up, add this hostname to it and verify ownership — an unverified
        hostname resolves nothing, so that pointing DNS here cannot claim an
        academy.
      </p>
    </main>
  )
}
