import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { QuizRunner } from '@/components/player/quiz-runner'
import { apiClient, isNotFound, redirectIfSignedOut } from '@/lib/academy'

export const metadata: Metadata = { title: 'Quiz' }

/**
 * A quiz.
 *
 * ## What arrives here, and what does not
 *
 * The API returns the questions without their keys — the response shape has no
 * field that could hold one, which is a stronger guarantee than remembering to
 * strip it. Explanations arrive after an attempt, which is what makes a wrong
 * answer instructive without making the quiz answerable in advance.
 *
 * ## The window and the limit are the server's
 *
 * Whether the quiz is open, how many attempts remain, and when an attempt runs
 * out of time are all decided by the API. This page displays them. A client that
 * enforced them would be enforcing something it could also be talked out of.
 */
export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params

  await redirectIfSignedOut(
    `/learn/courses/${courseId}/lessons/${lessonId}/quiz`,
  )

  const api = await apiClient()

  let quiz

  try {
    const { quiz: loaded } = await api.getLearnerQuiz(lessonId)
    quiz = loaded
  } catch (error) {
    if (isNotFound(error)) notFound()

    throw error
  }

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

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">{quiz.title}</h1>

        <p className="text-muted-foreground text-sm">
          {quiz.questions.length} question
          {quiz.questions.length === 1 ? '' : 's'} · {quiz.passingPercent}% to
          pass
          {quiz.maxAttempts === null
            ? ''
            : ` · ${quiz.attemptsRemaining ?? 0} attempt${
                quiz.attemptsRemaining === 1 ? '' : 's'
              } remaining`}
          {quiz.timeLimitMinutes === null
            ? ''
            : ` · ${quiz.timeLimitMinutes} minute time limit`}
        </p>

        {quiz.description ? (
          <p className="text-muted-foreground text-sm">{quiz.description}</p>
        ) : null}
      </header>

      <QuizRunner
        lessonId={lessonId}
        questions={quiz.questions}
        attempts={quiz.attempts}
        openAttempt={quiz.openAttempt}
        attemptsRemaining={quiz.attemptsRemaining}
      />
    </main>
  )
}
