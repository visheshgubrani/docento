'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { SubmissionSummary } from '@docento/sdk'

import { browserApiClient, messageFor } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * Submit work.
 *
 * ## The key is stable across retries of one submission
 *
 * Submission is retryable, so the API requires an idempotency key. It is minted
 * when the learner first presses submit and reused if they press again, which is
 * what makes a double-click one submission rather than two. A key generated per
 * attempt would be a random string rather than an idempotency key.
 *
 * ## A past-due assignment says so rather than failing on submit
 *
 * The API refuses it, and the form knows that from what the server already
 * reported — so the learner is told before they write an essay rather than after.
 */
export function AssignmentForm({
  lessonId,
  initialContent,
  pastDue,
}: {
  lessonId: string
  initialContent: string
  pastDue: boolean
}) {
  const router = useRouter()

  const [content, setContent] = useState(initialContent)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SubmissionSummary | null>(null)
  const [key, setKey] = useState<string | null>(null)

  if (pastDue) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This assignment is past its due date, so it cannot be submitted any
        more.
      </p>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    const idempotencyKey =
      key ?? `assignment-${lessonId}-${crypto.randomUUID()}`
    if (!key) setKey(idempotencyKey)

    try {
      const api = browserApiClient()
      const { submission } = await api.submitAssignment(
        lessonId,
        { content },
        idempotencyKey,
      )

      setSaved(submission)
      router.refresh()
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Your work</Label>
        <Textarea
          id="content"
          rows={12}
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="text-primary text-sm">
          Submitted. You can submit again until it is graded.
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : saved ? 'Submit again' : 'Submit'}
      </Button>
    </form>
  )
}
