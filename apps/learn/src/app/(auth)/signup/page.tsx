import type { Metadata } from 'next'

import { resolveAcademy } from '@/lib/academy'
import { SignUpForm } from '@/components/auth/sign-up-form'

export const metadata: Metadata = { title: 'Create an account' }

export default async function SignUpPage() {
  const academy = await resolveAcademy()

  if (!academy) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-3 px-6">
        <h1 className="font-display text-2xl tracking-tight">
          No academy here
        </h1>
        <p className="text-muted-foreground text-sm">
          This address does not serve an academy, so there is nothing to sign up
          to.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">
          Create your {academy.branding?.displayName ?? academy.name} account
        </h1>
        <p className="text-muted-foreground text-sm">
          This account works here and nowhere else.
        </p>
      </header>

      <SignUpForm />
    </main>
  )
}
