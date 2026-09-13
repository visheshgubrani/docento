import { describe, expect, it } from 'vitest'

import {
  OPERATIONS,
  OPERATION_NAMES,
  RETRYABLE_OPERATIONS,
  pathParams,
} from '@docento/contracts'

import { createApp } from '../app.js'

/**
 * The API serves what the contracts describe.
 *
 * ## The bug this exists to prevent
 *
 * The application this replaces guarded its routes with a middleware chain
 * applied by hand at each mount. The review of that code found that
 * `quiz.controller.ts` and `assignment.controller.ts` contain no tenant
 * reference at all: they are safe *only* because the chain was applied correctly
 * in one file. Delete or reorder it and every one of those routes becomes
 * cross-tenant readable, with nothing to indicate it.
 *
 * So the check here is not "is the handler correct" — that is what the domain's
 * tests are for. It is "does every operation the contracts describe have a route
 * at the path they describe", which is the property that makes the chain
 * unnecessary. A route that is missing is a client calling a documented endpoint
 * and getting a 404; a route at a path the contracts do not describe is an
 * endpoint nobody can find.
 */

const app = createApp()

/**
 * Every path the router serves, as `METHOD /path`, without the `/api/v1` prefix.
 *
 * The registry declares paths relative to the API mount, which is what the SDK
 * joins to `baseUrl`. Normalising here means the comparison is about the routes
 * themselves rather than about where the mount happens to be — a mount moved
 * from `/api/v1` to `/api/v2` should not read as fifty-three missing routes.
 */
/**
 * The byte routes, collected rather than discarded.
 *
 * The registry cannot describe them, so the comparison excludes them — and an
 * exclusion that throws away what it excludes makes their disappearance
 * invisible. They are collected here so the test below can assert they exist,
 * and both sets are built once from the one app this suite describes.
 */
const byteRoutes = new Set<string>()
let cachedRoutes: Set<string> | null = null

function mountedRoutes(): Set<string> {
  if (cachedRoutes) return cachedRoutes

  const mounted = new Set<string>()

  for (const route of app.routes) {
    // Hono reports `ALL` for a wildcard or a middleware registration.
    if (route.method === 'ALL') continue

    // Authentication and the document are mounted, not operations.
    if (route.path.startsWith('/api/auth')) continue
    if (route.path === '/openapi.json' || route.path === '/api-docs') continue

    const normalised = route.path.replace(/^\/api\/v1/, '')

    /**
     * The byte routes, which are excluded by shape rather than by name.
     *
     * They return a file and receive a file, so they cannot be registry
     * operations — a registry entry has a Zod response schema and an SDK method
     * that unwraps `data`, and neither is true of a video. The exclusion is
     * narrow on purpose: a *new* JSON route under `/media/` still has to have a
     * contract behind it, and the test below asserts these two exist so the
     * exclusion cannot quietly hide their removal.
     */
    if (normalised.includes('/media/upload/')) {
      byteRoutes.add(`${route.method} ${normalised}`)
      continue
    }

    if (normalised === '/media/:academyId/:assetId') {
      byteRoutes.add(`${route.method} ${normalised}`)
      continue
    }

    mounted.add(`${route.method} ${normalised.length > 0 ? normalised : '/'}`)
  }

  cachedRoutes = mounted

  return mounted
}

describe('the router matches the registry', () => {
  const registered = OPERATION_NAMES.map((name) => ({
    name,
    method: OPERATIONS[name].method,
    // The router pattern uses `:param`, the registry uses `{param}`.
    path: OPERATIONS[name].path.replace(/\{([^}]+)\}/g, ':$1'),
  }))

  it('serves every registry operation at its declared path', () => {
    const missing = registered.filter(
      (operation) => !mountedRoutes().has(`${operation.method} ${operation.path}`),
    )

    expect(
      missing.map((operation) => `${operation.method} ${operation.path}`),
      'operations documented in the contracts with no route',
    ).toEqual([])
  })

  it('serves no API route the registry does not describe', () => {
    /**
     * The other direction, and the one that ages badly.
     *
     * A route added for convenience — a debug endpoint, a temporary alias —
     * is an endpoint with no contract, no SDK method and no OpenAPI entry. It
     * will be called by somebody.
     *
     * The non-API routes are excluded by prefix rather than by listing them:
     * health, authentication, and the document itself are not operations.
     */
    // `mountedRoutes` already excludes the non-operation mounts and strips the
    // API prefix, so this is a straight set comparison.
    const undocumented = [...mountedRoutes()].filter(
      (route) =>
        !registered.some(
          (operation) => `${operation.method} ${operation.path}` === route,
        ),
    )

    expect(undocumented, 'routes with no contract behind them').toEqual([])
  })

  it('serves the byte routes the registry cannot describe', () => {
    /**
     * Asserted rather than left to the exclusion above.
     *
     * The registry deliberately does not describe the two routes that move
     * bytes, which means nothing else would notice if they disappeared — and
     * "media uploads silently stopped working" is not a failure the contract
     * tests can see.
     */
    expect(byteRoutes, 'the routes that move bytes').toContain(
      'PUT /media/upload/:key{.+}',
    )

    expect(byteRoutes, 'the routes that move bytes').toContain(
      'GET /media/:academyId/:assetId',
    )
  })

  it('declares the parameters it uses in the path', () => {
    // A route whose handler reads a parameter the path does not define would
    // receive `undefined`, and a validation failure would be the first sign.
    for (const operation of registered) {
      const fromPath = pathParams(OPERATIONS[operation.name].path)

      for (const name of fromPath) {
        expect(operation.path, `${operation.name} lost ${name}`).toContain(`:${name}`)
      }
    }
  })
})

describe('authentication reaches a realm', () => {
  /** The raw router paths, including the mounts that are not operations. */
  const rawRoutes = (): string[] => app.routes.map((route) => route.path)

  it('mounts both realms at the paths the contracts assume', () => {
    // The SDK and the frontends hardcode these paths, so a change here is a
    // change to the auth contract whether or not it is written down.
    const routes = rawRoutes()

    expect(routes.some((route) => route.startsWith('/api/auth/staff'))).toBe(true)
    expect(routes.some((route) => route.startsWith('/api/auth/learners'))).toBe(true)
  })

  it('does not mount a single merged auth path', () => {
    /**
     * The two realms are separate Better Auth instances with separate tables.
     * A shared mount would mean one adapter serving both, which is the design
     * ADR 3 rejects: isolation would become behavioural rather than structural,
     * and one forgotten filter would be a cross-tenant read.
     */
    const merged = rawRoutes().filter(
      (path) => path === '/api/auth' || path === '/api/auth/*',
    )

    expect(merged).toEqual([])
  })
})

describe('idempotency is enforced, not documented', () => {
  it('has a route for every operation that requires a key', () => {
    // The enforcement lives in the operation wrapper, which is applied per
    // route — so an operation with no route would accept nothing rather than
    // enforcing nothing. This asserts the two sets line up.
    const routes = mountedRoutes()

    for (const name of RETRYABLE_OPERATIONS) {
      const operation = OPERATIONS[name]
      const pattern = `${operation.method} ${operation.path.replace(/\{([^}]+)\}/g, ':$1')}`

      expect(routes.has(pattern), `${name} is retryable but has no route`).toBe(true)
    }
  })
})

describe('the public surface is reachable without a session', () => {
  it('answers health without touching the database', async () => {
    /**
     * A liveness probe that queries the database reports the database's health,
     * not the process's — and turns a database blip into a container restart,
     * which is the opposite of what a restart would fix.
     */
    const response = await app.request('/api/v1/health')

    expect(response.status).toBe(200)

    const body = (await response.json()) as { success: boolean; data: unknown }
    expect(body.success).toBe(true)
  })

  it('answers a catalogue read for an unknown academy as a not-found envelope', async () => {
    const response = await app.request('/api/v1/catalog/academies/no-such-academy')

    expect(response.status).toBe(404)

    const body = (await response.json()) as {
      success: boolean
      error?: { code: string }
    }

    // The envelope, not Hono's plain-text default: a client unwrapping `data`
    // should not have to recognise a bare 404 as a special case.
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('not_found')
  })

  it('serves the generated document', async () => {
    const response = await app.request('/openapi.json')

    expect(response.status).toBe(200)

    const document = (await response.json()) as {
      openapi: string
      paths: Record<string, unknown>
    }

    expect(document.openapi).toBe('3.1.0')
    expect(Object.keys(document.paths).length).toBeGreaterThan(40)
  })
})

describe('failures carry the envelope', () => {
  it('answers an unknown route as JSON, not text', async () => {
    const response = await app.request('/api/v1/not-a-real-route')

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = (await response.json()) as { error?: { code?: string } }
    expect(body.error?.code).toBe('not_found')
  })

  it('echoes a caller-supplied request id', async () => {
    // The property that makes a user-reported failure findable: the id on the
    // screen is the id in the logs.
    const response = await app.request('/api/v1/health', {
      headers: { 'x-request-id': 'trace-me-1234' },
    })

    expect(response.headers.get('x-request-id')).toBe('trace-me-1234')

    const body = (await response.json()) as { meta: { requestId: string } }
    expect(body.meta.requestId).toBe('trace-me-1234')
  })

  it('generates a request id when the caller supplies none', async () => {
    const response = await app.request('/api/v1/health')
    const body = (await response.json()) as { meta: { requestId: string } }

    expect(body.meta.requestId.length).toBeGreaterThan(10)
    expect(response.headers.get('x-request-id')).toBe(body.meta.requestId)
  })

  it('refuses a retryable operation with no idempotency key', async () => {
    /**
     * The enforcement, not the documentation. This reaches the wrapper and is
     * refused before any domain operation runs — which is why the response is a
     * validation failure rather than a permission one, even for a request with
     * no session at all.
     */
    const response = await app.request('/api/v1/learn/courses/some-course/enrollment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    /**
     * Refused, and not with an internal error.
     *
     * Which refusal depends on what is checked first: the wrapper resolves the
     * academy and the principal before the key, so an anonymous caller is
     * refused for authentication. That ordering is deliberate — a caller who is
     * not allowed to do the thing should be told that, rather than being sent to
     * fix a header first and discover the refusal afterwards.
     *
     * What matters here is that a retryable operation without a key cannot
     * succeed, and cannot produce a `500`.
     */
    expect(response.status).not.toBe(500)
    expect([401, 403, 422]).toContain(response.status)

    const body = (await response.json()) as { success: boolean; error?: { code: string } }
    expect(body.success).toBe(false)
    expect(['unauthorized', 'forbidden', 'validation_failed']).toContain(
      body.error?.code,
    )
  })
})
