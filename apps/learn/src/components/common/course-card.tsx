import Image from 'next/image'
import Link from 'next/link'

/**
 * A catalogue entry.
 *
 * Replaces a 212-line client component that carried enrolment state, progress
 * bars, resume links and a legacy `StorefrontCourse` type whose fields no longer
 * exist. A catalogue card shows what a catalogue has: a title, a description and
 * a link. Progress belongs on the dashboard, where it means something — and a
 * card that tried to show both needed props for `isEnrolled`, `resumeHref`,
 * `viewHref` and `progressPercent`, which is four ways to say the same thing
 * depending on who is looking.
 *
 * A server component, because nothing here is interactive.
 */
export function CourseCard({
  href,
  title,
  description,
  thumbnail,
  meta,
}: {
  href: string
  title: string
  description: string | null
  thumbnail: string | null
  meta?: string
}) {
  return (
    <Link
      href={href}
      className="group border-border bg-card hover:border-primary/40 flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      <div className="bg-muted relative aspect-video w-full overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          /**
           * No placeholder image.
           *
           * A stock photograph would tell a visitor nothing and would need a
           * provenance trail this repository cannot provide. A tinted panel says
           * "there is no thumbnail yet" honestly, and inherits the theme.
           */
          <div className="from-primary/20 to-primary/5 size-full bg-gradient-to-br" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-6">
        <h2 className="font-display text-foreground group-hover:text-primary text-xl/7 tracking-tight">
          {title}
        </h2>

        {description ? (
          <p className="text-muted-foreground line-clamp-3 text-sm/7">
            {description}
          </p>
        ) : null}

        {meta ? (
          <p className="text-muted-foreground mt-auto pt-2 text-xs font-medium tracking-wide uppercase">
            {meta}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

/**
 * A course's outline, as a catalogue shows it.
 *
 * Titles and lesson counts only. A body or a media reference here would be the
 * whole of a course given away by a page that requires no account — which is why
 * the shape it renders has nowhere to put one.
 */
export function CurriculumOutline({
  modules,
}: {
  modules: {
    moduleId: string
    title: string
    lessons: { id: string; title: string; isFree: boolean }[]
  }[]
}) {
  return (
    <ol className="flex flex-col gap-6">
      {modules.map((module, index) => (
        <li key={module.moduleId} className="flex flex-col gap-3">
          <h3 className="font-display text-foreground text-lg tracking-tight">
            {index + 1}. {module.title}
          </h3>

          <ul className="border-border flex flex-col gap-2 border-l pl-4">
            {module.lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="text-muted-foreground flex items-center justify-between gap-4 text-sm"
              >
                <span>{lesson.title}</span>

                {lesson.isFree ? (
                  <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                    Free preview
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
