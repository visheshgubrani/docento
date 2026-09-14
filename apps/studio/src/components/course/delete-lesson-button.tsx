'use client'

import { useState } from 'react'

import { Button } from '@docento/ui'

import { browserApiClient } from '@/lib/client-api'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * Delete a draft lesson.
 *
 * ## Why the confirmation is a second press
 *
 * `window.confirm` interrupts with a browser dialog that cannot be styled and is
 * suppressed by some browsers; a second press in the same place is the same
 * affordance without either problem. Deletion is immediate and the API forbids it
 * for any lesson a release already carries, so the refusal, when it comes, is the
 * API's — arriving as a message rather than as a silent no-op.
 */
export function DeleteLessonButton({
  workspaceId,
  academyId,
  courseId,
  lessonId,
  redirectTo,
}: {
  workspaceId: string
  academyId: string
  courseId: string
  lessonId: string
  redirectTo: string
}) {
  const [confirming, setConfirming] = useState(false)

  const { run, pending, error } = useAsyncAction({
    keyPrefix: 'lesson-delete',
    redirectTo,
  })

  const remove = async () => {
    if (!confirming) {
      setConfirming(true)

      return
    }

    await run(() =>
      browserApiClient(workspaceId).deleteLesson(
        workspaceId,
        academyId,
        courseId,
        lessonId,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="destructive"
        onClick={remove}
        disabled={pending}
      >
        {pending
          ? 'Deleting…'
          : confirming
            ? 'Press again to delete'
            : 'Delete lesson'}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
