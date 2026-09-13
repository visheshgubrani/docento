import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LessonBody } from '@/components/player/lesson-body'
import { ProgressTracker } from '@/components/player/progress-tracker'
import { apiClient, isNotFound, redirectIfSignedOut } from '@/lib/academy'

export const metadata: Metadata = { title: 'Lesson' }

/**
 * A lesson.
 *
 * ## The body is rendered on the server, sanitized
 *
 * Author-supplied content reaches the DOM through one function that sanitizes
 * both of its branches. Rendering here rather than in a client component means a
 * lesson is in the HTML the browser receives, so it reads without waiting for
 * JavaScript.
 *
 * ## Completion is reported, not claimed
 *
 * `ProgressTracker` posts a position and, for a lesson that completes on view, a
 * completion. The API decides what that means against the release's rule — the
 * client's report is input, and a client that claimed completion of a lesson it
 * never opened would be refused by nothing here, which is why the server does not
 * take the client's word for it.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params

  await redirectIfSignedOut(`/learn/courses/${courseId}/lessons/${lessonId}`)

  const api = await apiClient()

  let course

  try {
    course = await api.getLearnerCourse(courseId)
  } catch (error) {
    if (isNotFound(error)) notFound()

    throw error
  }

  const lessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  )

  const index = lessons.findIndex((lesson) => lesson.id === lessonId)

  if (index === -1) notFound()

  const lesson = lessons[index]!

  if (!course.hasAccess) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-3 px-6">
        <h1 className="font-display text-2xl tracking-tight">{lesson.title}</h1>
        <p className="text-muted-foreground text-sm">
          Your access to this course has ended, so this lesson is not available.
        </p>
        <Link
          href={`/learn/courses/${courseId}`}
          className="text-primary text-sm font-medium underline"
        >
          Back to the course
        </Link>
      </main>
    )
  }

  const previous = index > 0 ? lessons[index - 1] : null
  const next = index < lessons.length - 1 ? lessons[index + 1] : null

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link
          href={`/learn/courses/${courseId}`}
          className="hover:text-primary"
        >
          {course.course.title}
        </Link>
        <span aria-hidden>/</span>
        <span>{lesson.moduleTitle}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">{lesson.title}</h1>
        {lesson.summary ? (
          <p className="text-muted-foreground text-sm">{lesson.summary}</p>
        ) : null}
      </header>

      <article className="flex flex-col gap-6">
        {lesson.contentType === 'TEXT' ? (
          <LessonBody content={lesson.body} />
        ) : lesson.contentType === 'VIDEO' && lesson.mediaAssetId ? (
          /**
           * Native video.
           *
           * The API serves the bytes and checks entitlement when they are asked
           * for, so a learner whose access lapses mid-course cannot keep playing
           * from a URL they already hold. Range requests work, so seeking does.
           */
          <video
            controls
            preload="metadata"
            className="w-full rounded-lg"
            src={`/api/v1/media/${lesson.mediaAssetId}`}
          />
        ) : lesson.embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={lesson.embedUrl}
              title={lesson.title}
              allowFullScreen
              className="size-full"
            />
          </div>
        ) : (
          <p className="border-border text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
            This lesson has no content yet.
          </p>
        )}
      </article>

      {lesson.hasQuiz ? (
        <Link
          href={`/learn/courses/${courseId}/lessons/${lessonId}/quiz`}
          className="border-border hover:border-primary/40 rounded-lg border px-4 py-3 text-sm transition-colors"
        >
          Take the quiz for this lesson
        </Link>
      ) : null}

      {lesson.hasAssignment ? (
        <Link
          href={`/learn/courses/${courseId}/lessons/${lessonId}/assignment`}
          className="border-border hover:border-primary/40 rounded-lg border px-4 py-3 text-sm transition-colors"
        >
          Open the assignment for this lesson
        </Link>
      ) : null}

      <ProgressTracker
        lessonId={lesson.id}
        /**
         * Completion is reported once the server has told us the lesson exists
         * and the learner may open it — so a completion cannot be recorded for a
         * lesson somebody is not entitled to.
         */
        completeOnView
      />

      <nav className="border-border flex items-center justify-between gap-4 border-t pt-6 text-sm">
        {previous ? (
          <Link
            href={`/learn/courses/${courseId}/lessons/${previous.id}`}
            className="hover:text-primary"
          >
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            href={`/learn/courses/${courseId}/lessons/${next.id}`}
            className="hover:text-primary text-right"
          >
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </main>
  )
}
