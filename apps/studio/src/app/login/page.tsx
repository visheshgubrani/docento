import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { POST_SIGN_IN_PATH } from '@/lib/auth'
import { SignInForm } from '@/components/auth/sign-in-form'
import { getStaffSession } from '@/lib/studio-api'

export const metadata: Metadata = { title: 'Sign in' }

/**
 * Staff sign-in.
 *
 * No academy resolution here, unlike the learner application: a staff identity
 * spans workspaces, so there is no tenant to resolve before the form can render.
 * The applications differ on exactly this point, which is why they are two
 * applications rather than one with a mode.
 */
export default async function LoginPage() {
  /**
   * A staff member who is already signed in is sent on.
   *
   * Asked of the API, so it is the same answer the application's other gates
   * give. It also makes this page render per request rather than being
   * prerendered: the form reads `?next=` and decides where to land from it, and
   * a page whose output depends on a query parameter has no static version to
   * serve.
   */
  const session = await getStaffSession()

  if (session) redirect(POST_SIGN_IN_PATH)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          Staff accounts work across workspaces.
        </p>
      </header>

      <SignInForm />
    </main>
  )
}
