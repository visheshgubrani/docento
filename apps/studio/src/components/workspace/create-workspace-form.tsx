'use client'

import { useState } from 'react'

import { authClient } from '@/lib/auth'
import { isUsableSlug, slugify } from '@/lib/slug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Create a workspace.
 *
 * ## Through Better Auth, not a domain operation
 *
 * The organization plugin owns the membership row and the session's
 * `activeOrganizationId`. A second way to create a workspace would be a second
 * set of rules about who may and what they become — and the plugin's own path is
 * the one the sign-in flow already assumes.
 *
 * ## The slug is generated, not asked for
 *
 * A staff member creating their first workspace is thinking about their
 * business, not about URL grammar. The slug is derived from the name and can be
 * changed later, which is a better trade than a validation error on a field they
 * did not want to fill in.
 */
export function CreateWorkspaceForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const trimmed = name.trim()

    if (!trimmed) {
      setError('Give your workspace a name.')

      return
    }

    setPending(true)

    const slug = slugify(trimmed)

    if (!isUsableSlug(slug)) {
      setError(
        'That name needs a couple of letters or numbers — the web address is made from it.',
      )
      setPending(false)

      return
    }

    const result = await authClient.organization.create({
      name: trimmed,
      slug,
    })

    if (result.error) {
      setError(
        result.error.message ??
          'That workspace could not be created. A workspace with that address may already exist.',
      )
      setPending(false)

      return
    }

    // A full navigation, so the workspace list is rendered from what the API
    // now holds rather than a cached render from before it existed.
    window.location.assign('/workspaces')
  }

  return (
    <form
      onSubmit={submit}
      className="border-border flex flex-col gap-4 rounded-lg border p-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          required
          placeholder="Acme Training"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Usually your business name. You can rename it later.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create workspace'}
      </Button>
    </form>
  )
}
