'use client'

import { useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Registration.
 *
 * The password rule is the API's — the form enforces only that both fields match
 * and are non-empty, which is a UI concern rather than a security one. A form
 * that enforced a different minimum from the server would reject a password the
 * server would accept, which is the kind of mismatch that produces a support
 * ticket nobody can reproduce.
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
      setError(
        result.error.message ??
          'That account could not be created. If you already have one, sign in instead.',
      )
      setPending(false)

      return
    }

    window.location.assign('/dashboard')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          This is the name that appears on your certificate.
        </p>
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
