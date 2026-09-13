import Link from 'next/link'

import type { LearnerCourse } from '@docento/sdk'

/**
 * One enrolled course, with progress.
 *
 * Progress is shown as a bar and a count rather than a percentage alone, because
 * "3 of 12 lessons" is what tells a learner how much is left and "25%" is what
 * tells them how they are doing. Both, or the number is ambiguous.
 *
 * Access is shown when it has lapsed. A card that looked openable and then
 * refused on click would be the worst of both answers, so the state is on the
 * card and the link goes to the course page that explains it.
 */
export function CourseProgressCard({ course }: { course: LearnerCourse }) {
  return (
    <Link
      href={`/learn/courses/${course.courseId}`}
      className="border-border bg-card hover:border-primary/40 flex flex-col gap-4 rounded-lg border p-6 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-foreground text-lg tracking-tight">
          {course.title}
        </h2>

        {course.isComplete ? (
          <p className="text-primary text-xs font-medium tracking-wide uppercase">
            Complete
          </p>
        ) : course.hasAccess ? null : (
          <p className="text-xs font-medium tracking-wide text-amber-600 uppercase">
            Access ended
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div
          /**
           * A real progress element rather than a styled div.
           *
           * A screen reader announces it, and the value is what a browser draws
           * — so the bar and the number cannot disagree.
           */
          role="progressbar"
          aria-valuenow={course.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${course.title} progress`}
          className="bg-muted h-2 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${course.percent}%` }}
          />
        </div>

        <p className="text-muted-foreground text-sm">
          {course.percent}% complete
        </p>
      </div>
    </Link>
  )
}
