import { afterEach, describe, expect, it, vi } from 'vitest'

import { browserApiClient } from '../client-api'

/**
 * The browser client, which every write in this application goes through.
 *
 * ## Why this is a test
 *
 * The studio's forms — creating an academy, a course, a module, a lesson,
 * publishing, editing a quiz — all reach the API through `browserApiClient`,
 * which issues a same-origin `/api/v1/…` request that `next.config.ts` rewrites
 * to the API. It is load-bearing for every write in the application, and for a
 * while it could not be built at all: the SDK refused an empty `baseUrl`, so the
 * client threw before a request was sent. The operator saw "Something went
 * wrong. Please try again.", the API's log showed nothing, and the browser's
 * network tab showed nothing — a failure that left no evidence anywhere.
 *
 * The SDK's own suite covers the empty base URL. This covers what *this*
 * application does with it: the mount, the workspace header, and the cookie.
 */

const okEnvelope = (data: unknown): Response =>
  new Response(
    JSON.stringify({ success: true, data, meta: { requestId: 'r1' } }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the browser client', () => {
  it('can be built, which is where every write starts', () => {
    expect(() => browserApiClient('ws_1')).not.toThrow()
  })

  it('writes to the API mount on this origin, naming the workspace', async () => {
    const seen: { url: string; init: RequestInit }[] = []

    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      seen.push({ url, init })

      return Promise.resolve(okEnvelope({ academy: { id: 'a1' } }))
    })

    await browserApiClient('ws_1').createAcademy(
      'ws_1',
      { name: 'Acme Academy', slug: 'acme-academy' },
      'academy-create-1',
    )

    // Relative, so the request stays first-party and the rewrite can catch it.
    // An absolute origin here would be a different deployment's API.
    expect(seen[0]?.url).toBe('/api/v1/workspaces/ws_1/academies')
    expect(seen[0]?.init.method).toBe('POST')
    expect(seen[0]?.init.credentials).toBe('include')

    const headers = seen[0]?.init.headers as Record<string, string>

    // The API checks this against the membership table rather than trusting it.
    expect(headers['x-workspace-id']).toBe('ws_1')
    // A retryable operation refuses a request without one.
    expect(headers['idempotency-key']).toBe('academy-create-1')
  })
})
