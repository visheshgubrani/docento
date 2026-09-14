import { DocentoApi, DocentoApiError } from '@docento/sdk'

/**
 * The browser's API client, and the error helpers client components need.
 *
 * ## Why this is separate from `studio-api.ts`
 *
 * `studio-api.ts` reads cookies, which is server-only, and a module that does
 * that cannot be imported by a client component at all — Next fails the build
 * rather than the request, which is the right time to find out but reads as a
 * confusing message about the Pages Router.
 *
 * Splitting the client-safe surface out means a client component imports a
 * module that imports the SDK and nothing else.
 *
 * ## Why the workspace is a parameter here too
 *
 * The server client can read the workspace from a route parameter; a client
 * component has it as a prop, passed down from the page that read the URL. Either
 * way it ends up in the same header and is checked by the API against the
 * membership table — a client cannot widen its own access by passing a different
 * id, it can only be refused.
 */

/**
 * A client for a browser call, where the cookie travels by itself.
 *
 * The request goes to this application's own origin and is rewritten to the API,
 * so the session cookie is first-party and no token is ever handled in the
 * browser — which is what lets `SameSite=Lax` be sufficient and keeps the
 * application free of anything worth stealing from `localStorage`.
 */
export const browserApiClient = (workspaceId?: string): DocentoApi =>
  new DocentoApi({
    baseUrl: '',
    credentials: 'include',
    ...(workspaceId ? { workspaceId } : {}),
  })

/**
 * Whether an error means "not signed in", as opposed to anything else.
 *
 * Worth a helper because the two are handled differently everywhere: a missing
 * session is a redirect to sign-in, and every other failure is a message.
 */
export function isUnauthenticated(error: unknown): boolean {
  return error instanceof DocentoApiError && error.code === 'unauthorized'
}

export function isForbidden(error: unknown): boolean {
  return error instanceof DocentoApiError && error.code === 'forbidden'
}

export function isNotFound(error: unknown): boolean {
  return error instanceof DocentoApiError && error.code === 'not_found'
}

/**
 * The message from a failure, for a form that has to say something.
 *
 * `DocentoApiError`'s message is written for a person. Anything else is a bug
 * whose text should not reach an operator, so it is replaced rather than shown —
 * but it is logged, because a failure reported nowhere is a failure nobody can
 * diagnose. The one that prompted this left nothing in the API's log, nothing in
 * the network tab, and only the sentence below on screen.
 */
export function messageFor(error: unknown): string {
  if (error instanceof DocentoApiError) return error.message

  console.error(error)

  return 'Something went wrong. Please try again.'
}

export { DocentoApiError }
