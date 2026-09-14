import { CheckCircle2Icon, CircleIcon, PlayCircleIcon } from 'lucide-react'

import { MediaSlot } from '@/components/media-slot'
import {
  academy,
  course,
  currentLesson,
  learner,
  modules,
  progress,
} from '@/content/fixtures/fieldwork-academy'
import { assets } from '@/lib/assets'

import { CourseCover } from './course-cover'

/**
 * The learner's lesson: what an academy looks like to the person learning in it.
 *
 * This is the composition the page is built around, so it is deliberately the
 * most complete one: the academy's own name at the top rather than the platform's,
 * the curriculum beside the lesson, and progress that is a fact about the release
 * rather than a decoration.
 *
 * It is a static composition, not a live component — nothing here is interactive,
 * which is why the buttons in it are rendered as styled spans. A preview that
 * looked clickable and did nothing would be a worse lie than one that plainly is
 * a picture of a screen.
 *
 * Its titles are paragraphs rather than headings, and that is deliberate: a
 * heading inside a picture of a screen would join the page's outline, and a reader
 * navigating by heading would find "The cut as a sentence" as a section of the
 * marketing site.
 */
export function AcademyFrame({ compact = false }: { compact?: boolean }) {
  return (
    <div className="border-border-decorative bg-surface overflow-hidden rounded-[var(--radius-frame)] border">
      <header className="border-border-decorative bg-surface flex items-center justify-between gap-4 border-b px-5 py-3">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-5 rounded-[6px]"
            style={{ backgroundColor: academy.brandingColor }}
          />
          <span className="text-sm font-medium">{academy.name}</span>
        </span>

        <span className="flex items-center gap-3 text-xs text-ink-muted">
          <span>{learner.name}</span>
          <span
            aria-hidden="true"
            className="bg-surface-subtle text-ink flex size-6 items-center justify-center rounded-full text-[0.625rem] font-medium"
          >
            {learner.initials}
          </span>
        </span>
      </header>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article className="flex flex-col gap-5 p-5">
          <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
            <span>{course.title}</span>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span>{currentLesson.moduleTitle}</span>
          </nav>

          <div className="flex flex-col gap-2">
            <p className="font-display text-2xl leading-tight">
              {currentLesson.title}
            </p>
            <p className="text-sm text-ink-muted">
              Lesson {currentLesson.position} of {currentLesson.of} ·{' '}
              {progress.percent}% of the course complete
            </p>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-card)]">
            <MediaSlot
              asset={assets.heroLessonCover}
              sizes="(min-width: 1024px) 40vw, 90vw"
            />
          </div>

          <p className="text-body-lg leading-relaxed text-ink">
            {currentLesson.summary}
          </p>

          {compact ? null : (
            <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-muted">
              {currentLesson.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}

          <div className="border-border-decorative mt-1 flex items-center justify-between gap-4 border-t pt-4">
            <span className="text-xs text-ink-muted">
              Progress is recorded as you go. Nothing is claimed on your behalf.
            </span>
            <span className="bg-brand text-on-brand inline-flex items-center gap-2 rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium">
              <PlayCircleIcon aria-hidden="true" className="size-4" />
              Next lesson
            </span>
          </div>
        </article>

        {/**
         * Source order matters here: the lesson is first, so a phone reads the
         * lesson and then the curriculum, while the large layout puts the
         * curriculum in the second column without moving anything in the DOM.
         */}
        <aside className="border-border-decorative flex flex-col gap-4 border-b p-5 lg:border-b-0 lg:border-l">
          <div className="flex flex-col gap-2">
            <p className="preview-label">Curriculum</p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-label="Course progress"
              className="bg-surface-subtle h-1.5 w-full overflow-hidden rounded-full"
            >
              <span
                className="bg-brand block h-full rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs text-ink-muted tabular-nums">
              {progress.completedLessons} of {progress.requiredLessons} lessons
            </p>
          </div>

          <ol className="flex flex-col gap-3">
            {modules.map((module, moduleIndex) => (
              <li key={module.id} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">
                  <span className="chapter-number mr-2">
                    {String(moduleIndex + 1).padStart(2, '0')}
                  </span>
                  {module.title}
                </span>

                <ol className="flex flex-col gap-1">
                  {module.lessons.map((lesson) => {
                    const current = lesson.id === currentLesson.id

                    return (
                      <li
                        key={lesson.id}
                        className={
                          current
                            ? 'text-brand flex items-start gap-2 text-xs'
                            : 'flex items-start gap-2 text-xs text-ink-muted'
                        }
                      >
                        {lesson.completed ? (
                          <CheckCircle2Icon
                            aria-hidden="true"
                            className="text-success mt-0.5 size-3.5 shrink-0"
                          />
                        ) : (
                          <CircleIcon
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                        )}
                        <span>
                          {lesson.title}
                          <span className="sr-only">
                            {lesson.completed
                              ? ' — completed'
                              : ' — not completed'}
                            {current ? ', current lesson' : ''}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  )
}

/** The catalogue, drawn smaller, for the second chapter of the product story. */
export function CatalogFrame() {
  return (
    <div className="border-border-decorative bg-surface overflow-hidden rounded-[var(--radius-frame)] border">
      <header className="border-border-decorative border-b px-5 py-4">
        <p className="text-sm font-medium">{academy.name}</p>
        <p className="text-xs text-ink-muted">
          Four courses · one enrolment in progress
        </p>
      </header>

      <ul className="grid gap-5 p-5 sm:grid-cols-2">
        <li>
          <CourseCover
            palette="forest"
            eyebrow="In progress"
            title={course.title}
          />
          <p className="mt-2 text-xs text-ink-muted">
            {course.moduleCount} modules · {course.lessonCount} lessons
          </p>
        </li>
        <li>
          <CourseCover
            palette="ochre"
            eyebrow="New"
            title="Field notes: light and shadow"
          />
          <p className="mt-2 text-xs text-ink-muted">2 modules · 4 lessons</p>
        </li>
      </ul>

      <div className="border-border-decorative flex items-center justify-between gap-4 border-t px-5 py-4">
        <span className="text-xs text-ink-muted">
          The catalogue is the academy’s, not the platform’s.
        </span>
        <span className="border-border-control text-ink inline-flex rounded-[var(--radius-control)] border px-4 py-2 text-sm font-medium">
          Enrol
        </span>
      </div>
    </div>
  )
}
