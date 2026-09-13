import type { Metadata } from 'next'

import { CourseCatalogue } from '@/components/catalog/course-catalogue'
import { catalogCourses, resolveAcademy } from '@/lib/academy'

export const metadata: Metadata = { title: 'Courses' }

/**
 * The catalogue.
 *
 * ## Public, and narrow
 *
 * No account is needed — a course catalogue is a shop window — and the operation
 * that serves it returns titles, descriptions and counts. Lesson bodies, media
 * references and answer keys are not in the shape, which is what keeps "public"
 * from meaning "the whole course".
 *
 * ## The academy is resolved first
 *
 * An unknown host gets an explanation rather than an empty catalogue, because
 * "this address serves no academy" and "this academy has no courses" are
 * different situations that an operator would otherwise confuse.
 */
export default async function CoursesPage() {
  const academy = await resolveAcademy()

  if (!academy) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-3 px-6">
        <h1 className="font-display text-2xl tracking-tight">
          No academy at this address
        </h1>
        <p className="text-muted-foreground text-sm">
          This address is not configured for an academy. If you are setting one
          up, add this hostname to it and verify ownership — an unverified
          hostname resolves nothing, so that pointing DNS here cannot claim an
          academy.
        </p>
      </main>
    )
  }

  const { courses, failed } = await catalogCourses(academy.id)

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl/[1.1] tracking-tight">
          {academy.branding?.displayName ?? academy.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {failed
            ? 'The catalogue could not be loaded.'
            : courses.length === 0
              ? 'No courses are published yet.'
              : `${courses.length} course${courses.length === 1 ? '' : 's'} available.`}
        </p>
      </header>

      {failed ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center">
          The API is not reachable, so the catalogue could not be read.
        </p>
      ) : (
        <CourseCatalogue courses={courses} />
      )}
    </main>
  )
}
