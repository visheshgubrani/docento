import type { Metadata } from 'next'

import { resolveAcademy } from '@/lib/academy'
import { SignInForm } from '@/components/auth/sign-in-form'

export const metadata: Metadata = { title: 'Sign in' }

/**
 * Sign-in.
 *
 * ## The academy is resolved before the form renders
 *
 * The learner realm is built per academy and its tables carry `academyId`, so
 * there is no realm to authenticate against until an academy is resolved. On an
 * unknown host this renders the explanation rather than a form that would fail
 * — a form that cannot work is worse than no form.
 */
export default async function LoginPage() {
  const academy = await resolveAcademy()

  if (!academy) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-3 px-6">
        <h1 className="font-display text-2xl tracking-tight">
          No academy here
        </h1>
        <p className="text-muted-foreground text-sm">
          This address does not serve an academy, so there is nothing to sign in
          to.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">
          Sign in to {academy.branding?.displayName ?? academy.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          Your account belongs to this academy only. The same email address at
          another academy is a different account with separate credentials.
        </p>
      </header>

      <SignInForm />
    </main>
  )
}
