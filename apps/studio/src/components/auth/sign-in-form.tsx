'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { authClient, safeNextPath } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Sign-in.
 *
 * The uniform message is deliberate: "that email and password do not match"
 * rather than "no such account". Distinguishing them turns the form into a way
 * to find out who has an account. The API already refuses to distinguish, and
 * this does not add the distinction back.
 */
export function SignInForm() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const next = safeNextPath(searchParams.get('next'))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await authClient.signIn.email({ email, password })

    if (result.error) {
      setError('That email and password do not match.')
      setPending(false)

      return
    }

    // A full navigation: the session is a cookie the server reads on the next
    // request, and a client transition can render a cached signed-out shell.
    window.location.assign(next)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          required
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
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-muted-foreground text-sm">
        No account?{' '}
        <a href="/signup" className="text-primary font-medium underline">
          Create one
        </a>
      </p>
    </form>
  )
}
