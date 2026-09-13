'use client'

import { authClient } from '@/lib/auth-client'

/**
 * Sign out.
 *
 * A full navigation afterwards, so the next request is served with the cleared
 * cookie. A client transition can render a cached server component that still
 * believes there is a session, which shows a signed-in header to somebody who
 * just signed out.
 */
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut()
        window.location.assign('/')
      }}
      className="hover:text-primary"
    >
      Sign out
    </button>
  )
}
