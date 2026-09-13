import Link from 'next/link'

import { getLearnerSession, resolveAcademy } from '@/lib/academy'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * The header.
 *
 * A server component: it reads the session and renders the right links, so a
 * signed-in visitor never sees a "Sign in" button flash before hydration — which
 * is what a client-side session read produces, and which reads as though the
 * application had forgotten them.
 *
 * The academy's name is the home link, because that is what a learner is
 * navigating within. The software's name is not on this page: a student of an
 * academy should never see the platform's brand.
 */
export async function SiteHeader() {
  const [academy, session] = await Promise.all([
    resolveAcademy(),
    getLearnerSession(),
  ])

  const name = academy?.branding?.displayName ?? academy?.name ?? 'Courses'

  return (
    <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <Link href="/" className="font-display text-lg tracking-tight">
          {name}
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {session ? (
            <>
              <Link href="/dashboard" className="hover:text-primary">
                My courses
              </Link>
              <Link href="/profile" className="hover:text-primary">
                Profile
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-primary">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-foreground text-background rounded-full px-4 py-1.5 font-medium"
              >
                Create account
              </Link>
            </>
          )}

          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
