'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Sign-in.
 *
 * ## What the form does not decide
 *
 * Whether the credentials are correct, whether the account is active, and which
 * academy the account belongs to. All three are the API's answers: the form
 * sends what was typed and reports what came back. A frontend that checked any
 * of them would be a second implementation of an authentication rule.
 *
 * ## The error message is deliberately uniform
 *
 * "That email and password do not match" rather than "no such account", because
 * distinguishing them turns the sign-in form into a way to enumerate who has an
 * account here. The API already refuses to distinguish; this is the part the
 * frontend controls, and it does not add the distinction back.
 */
export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  /**
   * Where to go afterwards.
   *
   * Only a path is honoured, never an absolute URL: a `next` parameter that
   * accepted `https://evil.example` would make the sign-in page an open
   * redirect, which is a phishing primitive.
   */
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

    /**
     * A full navigation rather than a client one.
     *
     * The session is a cookie the server reads on the next request, and a client
     * transition can render a server component from a cache that predates it —
     * which shows a signed-out header on a signed-in page until a refresh.
     */
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

/**
 * A relative path from the `next` parameter, or the dashboard.
 *
 * Rejects anything that is not a same-site path: `//evil.example` is
 * scheme-relative and would leave the site, which is the open-redirect case this
 * exists to prevent.
 */
export function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/')) return '/dashboard'
  if (value.startsWith('//')) return '/dashboard'

  return value
}
