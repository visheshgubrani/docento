import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * The staff authentication client.
 *
 * ## Its own realm
 *
 * Staff and learners are separate realms with separate cookie prefixes
 * (`docento-staff` and `docento-learner`). The split is not cosmetic: a learner
 * is scoped to exactly one academy, so their session has to carry an academy,
 * while a staff identity spans every workspace they are a member of. One shared
 * session table would have to be permissive enough for both, and the permissive
 * version is the one that would be used by mistake.
 *
 * ## `basePath`, not an absolute URL
 *
 * The requests are same-origin relative paths, proxied to the API by the
 * `rewrites()` in `next.config.ts`. First-party cookies, no CORS, and no local
 * TLS — because a `SameSite=Lax` cookie between two origins would need all three.
 *
 * ## Why the organization plugin is configured here
 *
 * Creating a workspace goes through Better Auth rather than a domain operation
 * of ours, because the plugin owns the membership row and the session's
 * `activeOrganizationId`. A second way to create one would be a second set of
 * rules about who may and what they become — and the plugin's own path is the
 * one the sign-in flow already assumes.
 */
export const authClient = createAuthClient({
  basePath: '/api/auth/staff',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [organizationClient()],
})

export type StaffAuthSession = typeof authClient.$Infer.Session

/** Where a staff member lands once they are signed in. */
export const POST_SIGN_IN_PATH = '/workspaces'

/**
 * A safe post-sign-in destination from a `next` query parameter.
 *
 * Only a path inside this application is usable, and only an absolute path —
 * `//evil.example` is a protocol-relative URL that a browser reads as another
 * origin, so it is rejected explicitly rather than by hoping the caller checks.
 * Anything else becomes the default, which is why this returns a value instead
 * of throwing: a bad `next` is a mistyped link, not an error worth a page.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return POST_SIGN_IN_PATH
  if (!next.startsWith('/')) return POST_SIGN_IN_PATH
  if (next.startsWith('//')) return POST_SIGN_IN_PATH
  if (next.startsWith('/\\')) return POST_SIGN_IN_PATH

  return next
}
