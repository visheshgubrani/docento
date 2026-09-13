import { describe, expect, it } from 'vitest'

import nextConfig from '../../../next.config'

/**
 * The learner application can reach the API from a browser.
 *
 * ## Why this is a test and not a comment
 *
 * `browserApiClient` uses `baseUrl: ''`, so every client component issues a
 * relative `/api/v1/...` request that only works because this application
 * proxies that prefix to the API. For a while it did not: `apiOrigin` was
 * computed and never used, there was no `rewrites()` at all, and Next answered
 * every one of those requests itself with a `404`.
 *
 * Nothing caught it. The pages render — their data comes from server-side calls,
 * which use an absolute URL — so the failure looked like a broken button rather
 * than a missing route, and the only tests in this package covered HTML
 * sanitising. The lesson is that the proxy is a load-bearing part of the
 * browser's half of the loop, and a load-bearing part needs an assertion.
 *
 * ## What it can and cannot check
 *
 * It checks the rules exist and point where they must. It cannot check that a
 * deployment's `API_INTERNAL_URL` is correct — that is configuration, and this
 * is about the code that consumes it.
 */

async function rewriteRules() {
  const rewrites = nextConfig.rewrites

  expect(rewrites, 'the application declares rewrites').toBeDefined()

  const resolved = await rewrites?.()

  /**
   * `rewrites` may be an array or the `{beforeFiles, afterFiles, fallback}`
   * object. Only the array form is used here, and asserting that keeps a future
   * change to the other shape from silently making this test vacuous.
   */
  expect(Array.isArray(resolved), 'rewrites are a plain list').toBe(true)

  return resolved as { source: string; destination: string }[]
}

describe('proxying the API', () => {
  it('rewrites the API mount the SDK builds', async () => {
    const rules = await rewriteRules()

    const api = rules.find((rule) => rule.source === '/api/v1/:path*')

    /**
     * The source has to be `/api/v1/:path*`, not `/api/:path*` and not
     * `/api/v1` — the SDK appends `API_MOUNT` to every path, and the registry's
     * paths are relative to it.
     */
    expect(api, 'the API mount is rewritten').toBeDefined()
    expect(api?.destination).toMatch(/\/api\/v1\/:path\*$/)
  })

  it('rewrites the auth mounts, so session cookies stay first-party', async () => {
    const rules = await rewriteRules()

    const auth = rules.find((rule) => rule.source === '/api/auth/:path*')

    expect(auth, 'the auth mount is rewritten').toBeDefined()
    expect(auth?.destination).toMatch(/\/api\/auth\/:path\*$/)
  })

  it('sends both to the same origin', async () => {
    /**
     * Derived from one value on purpose. Two independently configured origins
     * would let a deployment proxy the API to one install and the sessions to
     * another, which fails as a sign-in loop rather than as an error.
     */
    const rules = await rewriteRules()

    const origins = new Set(
      rules.map((rule) =>
        rule.destination.replace(/\/api\/(v1|auth)\/:path\*$/, ''),
      ),
    )

    expect(origins.size).toBe(1)
  })
})
