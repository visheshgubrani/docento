'use client'

import { useState } from 'react'

import { browserApiClient } from '@/lib/client-api'
import { isUsableSlug, slugify } from '@/lib/slug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAsyncAction } from '@/hooks/use-async-action'

/**
 * Create an academy in a workspace.
 *
 * ## Why the slug is shown but not asked for
 *
 * Unlike a workspace, an academy's slug is part of a public address —
 * `acme.docento.example` or the path a learner visits — so the operator should
 * see what they are getting. It is *derived* from the name and then offered for
 * editing, which is the difference between a field to fill in and a value to
 * correct.
 *
 * ## Why only the name is required
 *
 * An academy needs a name and an address. Branding, a custom domain, and the
 * auth mode are all editable afterwards, and asking for them before there is an
 * academy to attach them to is how a first-run form becomes a setup wizard
 * nobody finishes.
 */
export function CreateAcademyForm({ workspaceId }: { workspaceId: string }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  const { run, pending, error } = useAsyncAction({
    keyPrefix: 'academy-create',
  })

  /**
   * The slug follows the name until the operator touches it.
   *
   * Tracked with a flag rather than by comparing the two values: an operator who
   * deliberately sets a slug equal to the derived one should still stop having
   * it overwritten when they edit the name again.
   */
  const onNameChange = (value: string) => {
    setName(value)

    if (!slugEdited) setSlug(slugify(value))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = name.trim()

    if (!trimmed || !isUsableSlug(slug)) return

    await run((idempotencyKey) =>
      browserApiClient(workspaceId).createAcademy(
        workspaceId,
        { name: trimmed, slug },
        idempotencyKey,
      ),
    )

    setName('')
    setSlug('')
    setSlugEdited(false)
  }

  return (
    <form
      onSubmit={submit}
      className="border-border flex flex-col gap-4 rounded-lg border p-6"
    >
      <h2 className="font-display text-lg tracking-tight">New academy</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="academy-name">Name</Label>
        <Input
          id="academy-name"
          required
          placeholder="Acme Training"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="academy-slug">Web address</Label>
        <Input
          id="academy-slug"
          required
          value={slug}
          onChange={(event) => {
            setSlugEdited(true)
            setSlug(slugify(event.target.value))
          }}
        />
        <p className="text-muted-foreground text-xs">
          Where learners find this academy. Letters, numbers and hyphens.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || !isUsableSlug(slug)}>
        {pending ? 'Creating…' : 'Create academy'}
      </Button>
    </form>
  )
}
