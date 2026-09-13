import Link from 'next/link'

import { SignOutButton } from '@/components/auth/sign-out-button'
import { getStaffSession } from '@/lib/studio-api'

/**
 * The signed-in shell.
 *
 * A server component that reads the session and renders nothing when there is
 * none — but it does not redirect. Redirecting here would break the sign-in page
 * if it ever landed in this group, and the pages that need a session ask for one
 * through `requireStaffSession`, which knows where to send somebody back to.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getStaffSession()

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link
            href="/workspaces"
            className="font-display text-lg tracking-tight"
          >
            Docento
          </Link>

          {session ? <SignOutButton /> : null}
        </nav>
      </header>

      {children}
    </div>
  )
}
