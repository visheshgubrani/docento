'use client'

import { useMemo, useState } from 'react'
import { HiMagnifyingGlass, HiXMark } from 'react-icons/hi2'

import type { CatalogCourse } from '@docento/sdk'

import { CourseCard } from '@/components/common/course-card'

/**
 * The catalogue's search box.
 *
 * ## Why this is the only client component in the catalogue
 *
 * The courses are fetched on the server and rendered on the server, so a visitor
 * receives HTML rather than a skeleton. Only the filter is interactive, so only
 * the filter is a client component — which is why the previous version's 200
 * lines of `useEffect`-driven fetching, an enrolment cross-reference and a
 * category facet set have gone. The categories were a field on a type that no
 * longer exists, and nothing populated them.
 *
 * Search filters what is already on the page rather than making a request: a
 * catalogue for one academy is small enough to hold, and a search that hit the
 * network per keystroke would need debouncing, cancellation and a loading state
 * to be honest about what it was doing.
 */
export function CourseCatalogue({ courses }: { courses: CatalogCourse[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (!needle) return courses

    return courses.filter((course) =>
      [course.title, course.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [courses, query])

  return (
    <section className="flex w-full flex-col gap-8">
      <div className="relative max-w-xl">
        <HiMagnifyingGlass className="text-foreground/55 pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2" />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search courses"
          aria-label="Search courses"
          className="border-muted-foreground/40 bg-background text-foreground placeholder:text-foreground/55 focus:border-primary/55 h-11 w-full rounded-full border pr-10 pl-10 text-sm outline-none transition-colors"
        />

        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="text-foreground/60 hover:bg-muted hover:text-foreground absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
          >
            <HiXMark className="size-4.5" />
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="border-border text-foreground/70 rounded-lg border border-dashed px-6 py-12 text-center">
          {courses.length === 0
            ? 'No courses are published yet.'
            : 'No courses match that search.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <li key={course.id}>
              <CourseCard
                href={`/courses/${course.id}`}
                title={course.title}
                description={course.description}
                thumbnail={course.thumbnail}
                meta={`${course.lessonCount} lesson${
                  course.lessonCount === 1 ? '' : 's'
                }`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
