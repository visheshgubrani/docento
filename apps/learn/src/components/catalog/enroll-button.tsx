'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { browserApiClient, messageFor } from '@/lib/client-api'
import { Button } from '@/components/ui/button'

/**
 * Enrol.
 *
 * ## The idempotency key is minted once, when the button is first pressed
 *
 * Enrolment is retryable, so the API requires a key. Generating one per attempt
 * would defeat the point: a learner who presses twice, or whose first request
 * times out and is retried, must produce one enrolment rather than two. The key
 * is held in state so a second press reuses it — and `crypto.randomUUID` is the
 * browser's own source rather than a counter that could collide.
 */
export function EnrollButton({
  courseId,
  academySlug,
}: {
  courseId: string
  academySlug: string
}) {
  const router = useRouter()

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState<string | null>(null)

  const enroll = async () => {
    setPending(true)
    setError(null)

    const idempotencyKey = key ?? `enroll-${courseId}-${crypto.randomUUID()}`
    if (!key) setKey(idempotencyKey)

    try {
      const api = browserApiClient()
      await api.enrollInCourse(courseId, idempotencyKey)

      /**
       * A full navigation, so the course page renders with the enrolment the
       * API just created. A client transition can reuse a cached server render
       * from before it existed.
       */
      window.location.assign(
        `/learn/courses/${courseId}?academy=${academySlug}`,
      )
    } catch (caught) {
      setError(messageFor(caught))
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={enroll} disabled={pending}>
        {pending ? 'Enrolling…' : 'Enrol in this course'}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
