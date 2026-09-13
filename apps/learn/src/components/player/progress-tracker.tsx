'use client'

import { useEffect, useRef } from 'react'

import { browserApiClient } from '@/lib/client-api'

/**
 * Reports that a lesson was opened, and completes it.
 *
 * ## What this is, and is not
 *
 * It is a report, not a claim. The API decides whether the lesson is complete
 * against the release's rule; this says "the learner opened this". A client that
 * lied would be lying about something the server checks anyway.
 *
 * ## Once, not on every render
 *
 * A ref guards the report, so React's development-mode double render and a
 * re-render from a parent do not post twice. The completion itself is idempotent
 * in the API — `completedAt` is set once — but a duplicate request per render is
 * still a request per render.
 *
 * ## Failures are silent, deliberately
 *
 * A progress report that fails is not something to interrupt a learner with: the
 * lesson is on screen and readable, and the next lesson they open reports again.
 * An error banner over the content would be worse than the missing record.
 */
export function ProgressTracker({
  lessonId,
  completeOnView = false,
}: {
  lessonId: string
  completeOnView?: boolean
}) {
  const reported = useRef(false)

  useEffect(() => {
    if (reported.current) return
    reported.current = true

    const api = browserApiClient()

    const report = async () => {
      try {
        await api.recordProgress(lessonId, { positionSeconds: 0 })

        if (completeOnView) {
          await api.completeLesson(
            lessonId,
            `complete-${lessonId}-${crypto.randomUUID()}`,
          )
        }
      } catch {
        // See above: the learner is reading the lesson, and the next navigation
        // reports again.
      }
    }

    void report()
  }, [lessonId, completeOnView])

  return null
}
