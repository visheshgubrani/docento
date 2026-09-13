'use client'

import { useState } from 'react'

import { authClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Registration.
 *
 * The password rule is the API's. This enforces the same minimum the server
 * does, so a password the form accepts cannot then be refused — a mismatch there
 * produces a support ticket nobody can reproduce.
 */
export function SignUpForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Use at least 8 characters.')

      return
    }

    setPending(true)

    const result = await authClient.signUp.email({ email, password, name })

    if (result.error) {
      setError(result.error.message ?? 'That account could not be created.')
      setPending(false)

      return
    }

    window.location.assign('/workspaces')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating your account…' : 'Create account'}
      </Button>

      <p className="text-muted-foreground text-sm">
        Already have one?{' '}
        <a href="/login" className="text-primary font-medium underline">
          Sign in
        </a>
      </p>
    </form>
  )
}
