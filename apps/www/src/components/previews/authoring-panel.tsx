import { FileTextIcon, LockIcon } from 'lucide-react'

import {
  course,
  currentLesson,
  modules,
} from '@/content/fixtures/fieldwork-academy'

/**
 * The authoring experience: what a course looks like from the inside.
 *
 * Two things this composition is careful about, because they are the two things
 * a mockup of an authoring tool usually gets wrong:
 *
 * - **It shows the state the product actually tracks.** Draft, unpublished
 *   changes, and the fact that publishing creates a release rather than saving.
 *   An author who believes an edit has reached learners when it has not is the
 *   failure this screen exists to prevent.
 * - **It shows only affordances that exist.** There is no drag handle, because
 *   reordering modules and lessons through the interface is not built yet — it is
 *   on the roadmap, and a preview is not the place to promise it.
 */
export function AuthoringPanel() {
  return (
    <div className="border-border-decorative bg-surface overflow-hidden rounded-[var(--radius-frame)] border">
      <header className="border-border-decorative flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-ink-muted">
            Fieldwork Academy
            <span aria-hidden="true" className="px-2">
              /
            </span>
            Courses
          </p>
          <p className="font-display text-xl leading-tight">{course.title}</p>
          <p className="text-xs text-ink-muted">
            <span className="text-success">Version 3 is live</span> — published
            8 March 2026. Changes below are a draft and are not visible to
            learners yet.
          </p>
        </div>

        <span className="bg-brand text-on-brand inline-flex items-center rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium">
          Publish draft
        </span>
      </header>

      <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="border-border-decorative flex flex-col gap-4 border-b p-5 lg:border-r lg:border-b-0">
          <p className="preview-label">Outline</p>

          <ol className="flex flex-col gap-4">
            {modules.map((module, moduleIndex) => (
              <li key={module.id} className="flex flex-col gap-1.5">
                <span className="flex items-baseline gap-2 text-sm font-medium">
                  <span className="chapter-number">
                    {String(moduleIndex + 1).padStart(2, '0')}
                  </span>
                  {module.title}
                </span>

                <ol className="border-border-decorative ml-3 flex flex-col gap-1 border-l pl-3">
                  {module.lessons.map((lesson) => {
                    const current = lesson.id === currentLesson.id

                    return (
                      <li
                        key={lesson.id}
                        className={
                          current
                            ? 'text-brand flex items-center gap-2 text-xs font-medium'
                            : 'text-ink-muted flex items-center gap-2 text-xs'
                        }
                      >
                        <FileTextIcon
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span>{lesson.title}</span>
                        {current ? (
                          <span className="border-brand/40 text-brand rounded-full border px-1.5 text-[0.625rem]">
                            Editing
                          </span>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="preview-label">Lesson</p>
            <span className="text-xs text-ink-muted">Saved just now</span>
          </div>

          <div className="border-border-decorative flex flex-col gap-2 rounded-[var(--radius-card)] border p-4">
            <span className="text-xs text-ink-muted">Title</span>
            <span className="font-display text-lg">{currentLesson.title}</span>
          </div>

          <div className="border-border-decorative flex min-h-32 flex-col gap-3 rounded-[var(--radius-card)] border p-4 text-sm leading-relaxed">
            <span className="text-xs text-ink-muted">Body</span>
            {/**
             * One paragraph rather than the whole lesson: this panel is a third of
             * the hero's width, and a preview that shows the editor is doing its job
             * without also being a wall of prose beside the lesson it mirrors.
             */}
            <p className="text-ink-muted">{currentLesson.body[0]}</p>
            <span
              className="bg-brand text-on-brand h-0.5 w-24"
              aria-hidden="true"
            />
          </div>

          <p className="text-ink-muted flex items-center gap-2 text-xs">
            <LockIcon aria-hidden="true" className="size-3.5" />
            Learners see version 3 until this draft is published.
          </p>
        </div>
      </div>
    </div>
  )
}
