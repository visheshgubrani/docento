import type { Metadata } from 'next'
import Link from 'next/link'

import { DeleteLessonButton } from '@/components/course/delete-lesson-button'
import { LessonForm } from '@/components/course/lesson-form'
import { requireLessonAccess } from '@/lib/studio-api'

export const metadata: Metadata = { title: 'Lesson' }

type PageProps = {
  params: Promise<{
    workspaceId: string
    academyId: string
    courseId: string
    lessonId: string
  }>
}

/**
 * One lesson of a course's draft.
 *
 * The lesson's type is fixed at creation and shown rather than offered: changing
 * a lesson from a video to a quiz would leave the quiz, its questions and its
 * attempts attached to a lesson that no longer presents itself as one, and the
 * honest way to make that change is to add the lesson you actually want.
 */
export default async function LessonPage({ params }: PageProps) {
  const { workspaceId, academyId, courseId, lessonId } = await params

  const coursePath = `/w/${workspaceId}/a/${academyId}/c/${courseId}`

  const { moduleTitle, lesson } = await requireLessonAccess(
    workspaceId,
    academyId,
    courseId,
    lessonId,
    `${coursePath}/l/${lessonId}`,
  )

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link href="/workspaces" className="hover:text-foreground">
          Workspaces
        </Link>
        <span aria-hidden>/</span>
        <Link href={coursePath} className="hover:text-foreground">
          Course
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{lesson.title}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">{lesson.title}</h1>
        <p className="text-muted-foreground text-sm">
          In <strong>{moduleTitle}</strong> · {lesson.contentType.toLowerCase()}
          {lesson.isFree ? ' · free preview' : ''}
        </p>
      </header>

      <LessonForm
        workspaceId={workspaceId}
        academyId={academyId}
        courseId={courseId}
        lesson={lesson}
      />

      <section className="border-border flex flex-col gap-3 border-t pt-8">
        <h2 className="font-display text-lg tracking-tight">Delete</h2>
        <p className="text-muted-foreground text-sm">
          A lesson that a published version carries cannot be deleted, because
          learners may already have progress against it. Archive the course
          instead.
        </p>
        <DeleteLessonButton
          workspaceId={workspaceId}
          academyId={academyId}
          courseId={courseId}
          lessonId={lesson.id}
          redirectTo={coursePath}
        />
      </section>
    </main>
  )
}
