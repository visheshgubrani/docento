'use client'

import { createAuthClient } from 'better-auth/react'

/**
 * The learner authentication client.
 *
 * ## The base path is the realm
 *
 * `/api/auth/learners` is the learner realm — different tables, a different
 * cookie prefix, and a different secret from the staff realm that `apps/studio`
 * uses. A session created here cannot resolve there and vice versa, which is the
 * point: equal email addresses never merge the two.
 *
 * ## No base URL
 *
 * The client talks to its own origin and the rewrite in `next.config.ts`
 * forwards `/api/auth/*` to the API. That keeps the session cookie first-party,
 * which is what makes `SameSite=Lax` sufficient — see the comment there for why
 * a cross-origin client would need `SameSite=None` and therefore HTTPS even in
 * development.
 *
 * ## The cookie prefix is the realm's, not a guess
 *
 * `docento-learner` is what the realm sets. Naming it here means the client
 * reads the right cookie when a staff session is present in the same browser,
 * which is a real case: somebody running an academy is also a learner somewhere.
 */
export const authClient = createAuthClient({
  basePath: '/api/auth/learners',
  fetchOptions: {
    credentials: 'include',
  },
})

export const { signIn, signUp, signOut, useSession } = authClient
