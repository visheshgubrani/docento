'use client'

import { useState } from 'react'

import type { AuthorAssignment } from '@docento/sdk'

import { browserApiClient } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * Author a lesson's assignment.
 *
 * ## Why this one can live in props and the quiz cannot
 *
 * An assignment has no children. `assignment.upsert` is keyed by the lesson, and
 * the form needs no id it cannot already see, so there is nothing to re-read
 * after a save — the settings are whatever was just submitted. The quiz editor
 * has to re-read because a section or question created a moment ago is only
 * addressable once the API has told it the new id.
 *
 * Its read still exists and still matters: an edit form that only writes resets
 * whatever it did not read back, so the brief, the due date and the points are
 * loaded from the API and the counts come with them.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): Date | null {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function AssignmentEditor({
  workspaceId,
  academyId,
  courseId,
  lessonId,
  initialAssignment,
}: {
  workspaceId: string
  academyId: string
  courseId: string
  lessonId: string
  initialAssignment: AuthorAssignment | null
}) {
  const [assignment, setAssignment] = useState<AuthorAssignment | null>(
    initialAssignment,
  )
  const [notice, setNotice] = useState<string | null>(null)

  const save = useAsyncAction({
    onSuccess: async () => {
      const { assignment: fresh } = await browserApiClient(
        workspaceId,
      ).getAssignment(workspaceId, academyId, courseId, lessonId)

      setAssignment(fresh)
      setNotice('Assignment saved.')
    },
  })

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)

    const form = new FormData(event.currentTarget)

    const title = String(form.get('title') ?? '').trim()

    if (!title) return

    await save.run(async () => {
      await browserApiClient(workspaceId).upsertAssignment(
        workspaceId,
        academyId,
        courseId,
        lessonId,
        {
          title,
          instructions: String(form.get('instructions') ?? '').trim() || null,
          dueAt: fromLocalInput(String(form.get('dueAt') ?? '')),
          totalPoints: Number(form.get('totalPoints') ?? 100),
        },
      )
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg tracking-tight">Assignment</h2>
        <p className="text-muted-foreground text-sm">
          {assignment
            ? `${assignment.submissionCount} submission${assignment.submissionCount === 1 ? '' : 's'}, ${assignment.gradedCount} graded.`
            : 'This lesson has no assignment yet. Saving these details creates one.'}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignment-title">Title</Label>
          <Input
            id="assignment-title"
            name="title"
            required
            defaultValue={assignment?.title ?? ''}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="assignment-instructions">Instructions</Label>
          <Textarea
            id="assignment-instructions"
            name="instructions"
            rows={10}
            defaultValue={assignment?.instructions ?? ''}
          />
          <p className="text-muted-foreground text-xs">
            The brief the learner reads before submitting. Markdown.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="assignment-due">Due</Label>
            <Input
              id="assignment-due"
              name="dueAt"
              type="datetime-local"
              defaultValue={toLocalInput(assignment?.dueAt ?? null)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="assignment-points">Total points</Label>
            <Input
              id="assignment-points"
              name="totalPoints"
              type="number"
              min={1}
              defaultValue={assignment?.totalPoints ?? 100}
            />
          </div>
        </div>

        {save.error ? (
          <p role="alert" className="text-sm text-red-600">
            {save.error}
          </p>
        ) : null}

        {notice ? <p className="text-primary text-sm">{notice}</p> : null}

        <div>
          <Button type="submit" disabled={save.pending}>
            {save.pending
              ? 'Saving…'
              : assignment
                ? 'Save assignment'
                : 'Create assignment'}
          </Button>
        </div>
      </form>
    </section>
  )
}
