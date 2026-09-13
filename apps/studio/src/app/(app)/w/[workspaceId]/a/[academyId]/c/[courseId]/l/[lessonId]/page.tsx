import type { Metadata } from 'next'
import Link from 'next/link'

import { AssignmentEditor } from '@/components/course/assignment-editor'
import { DeleteLessonButton } from '@/components/course/delete-lesson-button'
import { LessonForm } from '@/components/course/lesson-form'
import { QuizEditor } from '@/components/course/quiz-editor'
import { apiClient, requireLessonAccess } from '@/lib/studio-api'

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
 *
 * ## Why the quiz and the assignment are read here
 *
 * Each editor needs to show what is already stored — an assignment's brief, and
 * a quiz's settings, sections and answer keys. Reading them in the server
 * component means the page arrives complete rather than filling in, and it means
 * the browser never has to call the API just to render a form it is about to
 * submit anyway.
 *
 * Only one of the two is read, and only for a lesson that has one: a text lesson
 * should not pay for two requests it will not use.
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

  const api = await apiClient(workspaceId)

  const quiz =
    lesson.contentType === 'QUIZ'
      ? (await api.getQuiz(workspaceId, academyId, courseId, lessonId)).quiz
      : null

  const assignment =
    lesson.contentType === 'ASSIGNMENT'
      ? (await api.getAssignment(workspaceId, academyId, courseId, lessonId))
          .assignment
      : null

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

      {lesson.contentType === 'QUIZ' ? (
        <section className="border-border flex flex-col gap-3 border-t pt-8">
          <QuizEditor
            workspaceId={workspaceId}
            academyId={academyId}
            courseId={courseId}
            lessonId={lesson.id}
            initialQuiz={quiz}
          />
        </section>
      ) : null}

      {lesson.contentType === 'ASSIGNMENT' ? (
        <section className="border-border border-t pt-8">
          <AssignmentEditor
            workspaceId={workspaceId}
            academyId={academyId}
            courseId={courseId}
            lessonId={lesson.id}
            initialAssignment={assignment}
          />
        </section>
      ) : null}

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
