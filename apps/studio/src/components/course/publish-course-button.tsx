'use client'

import { useState } from 'react'

import { Button } from '@docento/ui'

import { browserApiClient } from '@/lib/client-api'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * Publish the draft, or say that it already matches the release.
 *
 * ## Why the button reports `unchanged`
 *
 * Publishing is idempotent: pressing it twice with an unedited draft returns the
 * existing release rather than creating a second version. The API says which of
 * the two happened, and the button repeats it — because "published" after a
 * no-op press would suggest a new version exists when none does, and an operator
 * who cannot tell will press it again.
 *
 * ## Why it is not disabled on a published course
 *
 * A published course with an edited draft is the normal state, and publishing is
 * how the edit goes live. There is no "already done" to disable.
 */
export function PublishCourseButton({
  workspaceId,
  academyId,
  courseId,
}: {
  workspaceId: string
  academyId: string
  courseId: string
}) {
  const [outcome, setOutcome] = useState<string | null>(null)

  const { run, pending, error } = useAsyncAction({
    keyPrefix: 'course-publish',
    onSuccess: (result) => {
      /**
       * Narrowed here rather than typed on the hook: this is the one place that
       * knows the shape is the message the callback below built, and a check
       * that cannot fail is cheaper than a generic threaded through the hook.
       */
      if (typeof result === 'string') setOutcome(result)
    },
  })

  const publish = async () => {
    setOutcome(null)

    await run(async (idempotencyKey) => {
      const api = browserApiClient(workspaceId)
      const { release, unchanged } = await api.publishCourse(
        workspaceId,
        academyId,
        courseId,
        idempotencyKey,
      )

      /**
       * `unchanged` is reported rather than hidden: a no-op press and a real
       * publication look identical otherwise, and an operator who cannot tell
       * them apart presses again.
       */
      return unchanged
        ? `The draft had not changed. Version ${release.version} is still live.`
        : `Published. Learners now see version ${release.version}.`
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={publish} disabled={pending}>
        {pending ? 'Publishing…' : 'Publish'}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {outcome ? (
        <p className="text-muted-foreground text-sm">{outcome}</p>
      ) : null}
    </div>
  )
}
