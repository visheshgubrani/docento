'use client'

import { useState } from 'react'

import { Button, Input, Label } from '@docento/ui'

import { browserApiClient } from '@/lib/client-api'
import { isUsableSlug, slugify } from '@/lib/slug'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * Create a draft course.
 *
 * Only the title is required. The slug is derived from it and shown, because it
 * appears in the learner-facing address, and a description is prose the operator
 * has not written yet — asking for it here is asking somebody to write a summary
 * of a course they have not built.
 */
export function CreateCourseForm({
  workspaceId,
  academyId,
}: {
  workspaceId: string
  academyId: string
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  const { run, pending, error } = useAsyncAction({ keyPrefix: 'course-create' })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = title.trim()

    if (!trimmed || !isUsableSlug(slug)) return

    await run((idempotencyKey) =>
      browserApiClient(workspaceId).createCourse(
        workspaceId,
        academyId,
        { title: trimmed, slug },
        idempotencyKey,
      ),
    )

    setTitle('')
    setSlug('')
    setSlugEdited(false)
  }

  return (
    <form
      onSubmit={submit}
      className="border-border flex flex-col gap-4 rounded-lg border p-6"
    >
      <h2 className="font-display text-lg tracking-tight">New course</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="course-title">Title</Label>
        <Input
          id="course-title"
          required
          placeholder="Introduction to Widgets"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (!slugEdited) setSlug(slugify(event.target.value))
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="course-slug">Web address</Label>
        <Input
          id="course-slug"
          required
          value={slug}
          onChange={(event) => {
            setSlugEdited(true)
            setSlug(slugify(event.target.value))
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || !isUsableSlug(slug)}>
        {pending ? 'Creating…' : 'Create course'}
      </Button>
    </form>
  )
}
