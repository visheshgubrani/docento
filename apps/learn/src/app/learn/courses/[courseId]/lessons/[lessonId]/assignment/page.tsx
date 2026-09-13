import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AssignmentForm } from '@/components/player/assignment-form'
import { apiClient, isNotFound, redirectIfSignedOut } from '@/lib/academy'

export const metadata: Metadata = { title: 'Assignment' }

/**
 * An assignment.
 *
 * The learner sees their own submission and its grade, if a marker has given one.
 * Whether they may still submit is the API's answer — a due date and a graded
 * state both close it — so this page reports rather than decides, and the form's
 * disabled state is a courtesy rather than the enforcement.
 */
export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params

  await redirectIfSignedOut(
    `/learn/courses/${courseId}/lessons/${lessonId}/assignment`,
  )

  const api = await apiClient()

  let data

  try {
    data = await api.getLearnerAssignment(lessonId)
  } catch (error) {
    if (isNotFound(error)) notFound()

    throw error
  }

  const { assignment, submission } = data

  const graded = submission?.gradedAt != null
  const pastDue = assignment.dueAt
    ? new Date(assignment.dueAt) < new Date()
    : false

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <nav className="text-muted-foreground text-sm">
        <Link
          href={`/learn/courses/${courseId}/lessons/${lessonId}`}
          className="hover:text-primary"
        >
          ← Back to the lesson
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl tracking-tight">
          {assignment.title}
        </h1>

        <p className="text-muted-foreground text-sm">
          Worth {assignment.totalPoints} points
          {assignment.dueAt
            ? ` · due ${new Intl.DateTimeFormat('en', {
                dateStyle: 'long',
              }).format(new Date(assignment.dueAt))}`
            : ''}
        </p>

        {assignment.instructions ? (
          <p className="whitespace-pre-wrap text-foreground/80">
            {assignment.instructions}
          </p>
        ) : null}
      </header>

      {graded ? (
        <section className="border-border flex flex-col gap-2 rounded-lg border p-6">
          <p className="font-display text-2xl tracking-tight">
            {submission.grade} / {assignment.totalPoints}
          </p>
          <p className="text-muted-foreground text-sm font-medium">Feedback</p>
          <p className="text-sm whitespace-pre-wrap">
            {submission.feedback ?? 'No feedback was given.'}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            A graded submission cannot be replaced. Ask your instructor to
            reopen it if you need to submit again.
          </p>
        </section>
      ) : (
        <AssignmentForm
          lessonId={lessonId}
          initialContent={submission?.content ?? ''}
          pastDue={pastDue}
        />
      )}
    </main>
  )
}
