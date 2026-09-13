'use client'

import { useState } from 'react'

import type { QuizAttemptSummary } from '@docento/sdk'

import { browserApiClient, messageFor } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Question = {
  id: string
  prompt: string
  questionType: string
  options: string[]
  points: number
}

type AttemptResult = {
  attempt: QuizAttemptSummary
  percent: number
  questions: {
    questionId: string
    prompt: string
    submitted: { answer: string; answers: string[] }
    isCorrect: boolean
    pointsEarned: number
    points: number
    explanation: string | null
  }[]
}

/**
 * Taking a quiz.
 *
 * ## The attempt belongs to the server
 *
 * Starting an attempt stores a snapshot of the quiz as it stood — so an edit
 * published mid-attempt cannot regrade it — and returns an id. Answers are sent
 * against that id, and the score comes back from the server. Nothing here
 * computes a mark: a client that scored its own paper would disagree with the
 * certificate endpoint the first time the two were compared.
 *
 * ## Resuming
 *
 * An attempt that is still open is resumed rather than restarted, which is why
 * the component takes the open attempt rather than always starting one. A
 * learner who closed a tab should not lose a slot to it.
 *
 * ## Negative marks are shown per question
 *
 * The attempt score is never negative, and individual questions can be. That
 * difference is deliberate and the results view shows both, because "you lost a
 * mark here" is useful and "your score is -3" is not.
 */
export function QuizRunner({
  lessonId,
  questions,
  attempts,
  openAttempt,
  attemptsRemaining,
}: {
  lessonId: string
  questions: Question[]
  attempts: QuizAttemptSummary[]
  openAttempt: {
    id: string
    startedAt: string
    remainingSeconds: number | null
  } | null
  attemptsRemaining: number | null
}) {
  const [attemptId, setAttemptId] = useState<string | null>(
    openAttempt?.id ?? null,
  )
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const exhausted =
    attemptsRemaining !== null && attemptsRemaining <= 0 && !attemptId

  const start = async () => {
    setPending(true)
    setError(null)

    try {
      const api = browserApiClient()
      const response = await api.startQuizAttempt(
        lessonId,
        `attempt-${lessonId}-${crypto.randomUUID()}`,
      )

      setAttemptId(response.attempt.id)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setPending(false)
    }
  }

  const submit = async () => {
    if (!attemptId) return

    setPending(true)
    setError(null)

    try {
      const api = browserApiClient()

      const { result: submitted } = await api.submitQuizAttempt(
        attemptId,
        questions.map((question) => {
          const selected = answers[question.id] ?? []

          return question.questionType === 'MULTI_SELECT'
            ? { questionId: question.id, answers: selected }
            : { questionId: question.id, answer: selected[0] ?? '' }
        }),
        `submit-${attemptId}`,
      )

      setResult(submitted as AttemptResult)
      setAttemptId(null)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setPending(false)
    }
  }

  // --- Results -------------------------------------------------------------

  if (result) {
    return (
      <section className="flex flex-col gap-6">
        <div className="border-border flex flex-col gap-2 rounded-lg border p-6">
          <p className="font-display text-2xl tracking-tight">
            {Math.round(result.percent)}%
          </p>
          <p className="text-muted-foreground text-sm">
            {result.attempt.passed ? 'Passed' : 'Not passed'} ·{' '}
            {result.attempt.score} of {result.attempt.totalPoints} points
          </p>
        </div>

        <ol className="flex flex-col gap-4">
          {result.questions.map((question) => (
            <li
              key={question.questionId}
              className="border-border flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium">{question.prompt}</p>
                <span
                  className={
                    question.isCorrect
                      ? 'text-primary shrink-0 text-xs font-medium'
                      : 'shrink-0 text-xs font-medium text-red-600'
                  }
                >
                  {question.pointsEarned > 0 ? '+' : ''}
                  {question.pointsEarned} / {question.points}
                </span>
              </div>

              {question.explanation ? (
                <p className="text-muted-foreground text-sm">
                  {question.explanation}
                </p>
              ) : null}
            </li>
          ))}
        </ol>

        {attemptsRemaining !== 0 ? (
          <Button
            onClick={() => {
              setResult(null)
              setAnswers({})
            }}
          >
            Try again
          </Button>
        ) : null}
      </section>
    )
  }

  // --- Not started ---------------------------------------------------------

  if (!attemptId) {
    return (
      <section className="flex flex-col gap-4">
        {attempts.length > 0 ? (
          <div className="border-border flex flex-col gap-2 rounded-lg border p-4 text-sm">
            <p className="font-medium">Your attempts</p>
            <ul className="text-muted-foreground flex flex-col gap-1">
              {attempts.map((attempt) => (
                <li key={attempt.id}>
                  Attempt {attempt.attemptNumber}: {Math.round(attempt.score)}{' '}
                  of {attempt.totalPoints}
                  {attempt.passed ? ' (passed)' : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {exhausted ? (
          <p className="text-muted-foreground text-sm">
            You have used every attempt at this quiz.
          </p>
        ) : (
          <Button onClick={start} disabled={pending}>
            {pending
              ? 'Starting…'
              : attempts.length > 0
                ? 'Try again'
                : 'Start the quiz'}
          </Button>
        )}

        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </section>
    )
  }

  // --- In progress ---------------------------------------------------------

  return (
    <section className="flex flex-col gap-8">
      <ol className="flex flex-col gap-6">
        {questions.map((question, index) => (
          <li key={question.id} className="flex flex-col gap-3">
            <p className="font-medium">
              {index + 1}. {question.prompt}
            </p>

            {question.questionType === 'INTEGER' ||
            question.questionType === 'SHORT_ANSWER' ? (
              <Input
                aria-label={question.prompt}
                value={answers[question.id]?.[0] ?? ''}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: [event.target.value],
                  }))
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {question.options.map((option) => {
                  const selected = (answers[question.id] ?? []).includes(option)
                  const multi = question.questionType === 'MULTI_SELECT'

                  return (
                    <li key={option}>
                      <label className="flex cursor-pointer items-center gap-3 text-sm">
                        <input
                          type={multi ? 'checkbox' : 'radio'}
                          name={question.id}
                          checked={selected}
                          onChange={() =>
                            setAnswers((current) => {
                              const existing = current[question.id] ?? []

                              return {
                                ...current,
                                [question.id]: multi
                                  ? selected
                                    ? existing.filter(
                                        (entry) => entry !== option,
                                      )
                                    : [...existing, option]
                                  : [option],
                              }
                            })
                          }
                        />
                        <span>{option}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={pending}>
        {pending ? 'Submitting…' : 'Submit your answers'}
      </Button>

      <p className="text-muted-foreground text-xs">
        The score is calculated on the server. A question you leave blank is not
        penalised.
      </p>
    </section>
  )
}
