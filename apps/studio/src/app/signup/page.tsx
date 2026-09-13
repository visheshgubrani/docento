import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { POST_SIGN_IN_PATH } from '@/lib/auth'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { getStaffSession } from '@/lib/studio-api'

export const metadata: Metadata = { title: 'Create an account' }

/**
 * Staff sign-up.
 *
 * No academy resolution, unlike the learner application: a staff identity spans
 * workspaces, so there is no tenant to resolve before the form renders. The two
 * applications differ on exactly this point, which is why they are two
 * applications rather than one with a mode.
 */
export default async function SignUpPage() {
  // A staff member who is already signed in is sent on, rather than being shown
  // a second form for an account they have.
  const session = await getStaffSession()

  if (session) redirect(POST_SIGN_IN_PATH)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">
          Create an account
        </h1>
        <p className="text-muted-foreground text-sm">
          You will create a workspace, and an academy inside it.
        </p>
      </header>

      <SignUpForm />
    </main>
  )
}
