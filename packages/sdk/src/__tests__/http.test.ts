import { describe, expect, it, vi } from 'vitest'

import { DocentoApi, DocentoApiError, DocentoTransportError } from '../index.js'

/**
 * The transport's job is to turn HTTP into something a caller can branch on.
 *
 * The tests are about the three cases that are easy to get subtly wrong: a
 * failure the API described, a failure that never reached the API, and a
 * response that looks successful but is not an envelope.
 */

function jsonResponse(
  body: unknown,
  init: { status?: number; requestId?: string } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...(init.requestId ? { 'x-request-id': init.requestId } : {}),
    },
  })
}

const clientWith = (
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
) =>
  new DocentoApi({
    baseUrl: 'https://api.example.com',
    fetch: handler as unknown as typeof globalThis.fetch,
  })

describe('unwrapping the envelope', () => {
  it('returns data, not the envelope', async () => {
    const api = clientWith(() =>
      jsonResponse({
        success: true,
        data: { courses: [{ id: 'c1' }] },
        meta: { requestId: 'r1' },
      }),
    )

    const result = await api.listLearnerCourses()

    expect(result).toEqual({ courses: [{ id: 'c1' }] })
  })

  it('includes query parameters and skips empty ones', async () => {
    let seen = ''

    const api = clientWith((url) => {
      seen = url

      return jsonResponse({
        success: true,
        data: { courses: [] },
        meta: { requestId: 'r' },
      })
    })

    await api.listCatalogCourses('academy-1', { limit: 10, cursor: '' })

    expect(seen).toContain('limit=10')
    expect(seen).not.toContain('cursor')
  })

  it('refuses a 200 that is not an envelope', async () => {
    // A proxy error page or a misconfigured rewrite answers 200 with HTML. Left
    // alone, a caller receives `undefined` and fails somewhere unrelated.
    const api = clientWith(() => jsonResponse({ message: 'Not the API' }))

    await expect(api.listLearnerCourses()).rejects.toBeInstanceOf(
      DocentoTransportError,
    )
  })

  it('explains what a non-envelope response usually means', async () => {
    const api = clientWith(() => jsonResponse({ ok: true }))

    await expect(api.listLearnerCourses()).rejects.toThrow(
      /baseUrl points at the API/,
    )
  })
})

describe('failures the API described', () => {
  it('raises a typed error carrying the code', async () => {
    const api = clientWith(() =>
      jsonResponse(
        {
          success: false,
          error: {
            code: 'forbidden',
            message: 'The resource belongs to a different workspace.',
          },
          meta: { requestId: 'r-42' },
        },
        { status: 403, requestId: 'r-42' },
      ),
    )

    const error = await api
      .listLearnerCourses()
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(DocentoApiError)
    expect((error as DocentoApiError).code).toBe('forbidden')
    expect((error as DocentoApiError).status).toBe(403)
    expect((error as DocentoApiError).requestId).toBe('r-42')
  })

  it('carries field-level detail for a validation failure', async () => {
    // The detail is what lets a form mark the field that was wrong rather than
    // showing one sentence for the whole request.
    const api = clientWith(() =>
      jsonResponse(
        {
          success: false,
          error: {
            code: 'validation_failed',
            message: 'This course is not ready to publish.',
            details: [
              { path: 'lessons.l1', message: 'is a quiz with no questions' },
            ],
          },
          meta: { requestId: 'r-1' },
        },
        { status: 422 },
      ),
    )

    const error = (await api
      .publishCourse('w', 'a', 'c', 'a-key-long-enough')
      .catch((caught: unknown) => caught)) as DocentoApiError

    expect(error.details).toEqual([
      { path: 'lessons.l1', message: 'is a quiz with no questions' },
    ])
  })

  it('guesses a code when the envelope is missing, and says so by status', async () => {
    // A 401 from a proxy is a different situation from a 500, and a caller may
    // reasonably act on the difference.
    const api = clientWith(() => new Response('nope', { status: 401 }))

    const error = (await api
      .listLearnerCourses()
      .catch((caught: unknown) => caught)) as DocentoApiError

    expect(error).toBeInstanceOf(DocentoApiError)
    expect(error.code).toBe('unauthorized')
    expect(error.message).toContain('status 401')
  })

  it('knows which failures are worth retrying', async () => {
    const forbidden = clientWith(() =>
      jsonResponse(
        {
          success: false,
          error: { code: 'forbidden', message: 'no' },
          meta: { requestId: 'r' },
        },
        { status: 403 },
      ),
    )

    const rateLimited = clientWith(() =>
      jsonResponse(
        {
          success: false,
          error: { code: 'rate_limited', message: 'slow down' },
          meta: { requestId: 'r' },
        },
        { status: 429 },
      ),
    )

    const a = (await forbidden
      .listLearnerCourses()
      .catch((caught: unknown) => caught)) as DocentoApiError

    const b = (await rateLimited
      .listLearnerCourses()
      .catch((caught: unknown) => caught)) as DocentoApiError

    // Retrying a refusal turns one problem into a request storm.
    expect(a.isRetryable).toBe(false)
    expect(b.isRetryable).toBe(true)
  })
})

describe('failures that never reached the API', () => {
  it('raises a transport error rather than leaking a TypeError', async () => {
    const api = clientWith(() => {
      throw new TypeError('fetch failed')
    })

    const error = await api
      .listLearnerCourses()
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(DocentoTransportError)
    expect((error as Error).message).toContain('listLearnerCourses')
    // The original is preserved for a caller that wants to inspect it.
    expect((error as Error).cause).toBeInstanceOf(TypeError)
  })
})

describe('credentials', () => {
  it('sends a publishable key in its own header', async () => {
    let headers: Record<string, string> = {}

    const api = new DocentoApi({
      baseUrl: 'https://api.example.com',
      apiKey: 'pk_test_abc',
      fetch: ((_url: string, init: RequestInit) => {
        headers = (init.headers ?? {}) as Record<string, string>

        return jsonResponse({
          success: true,
          data: {},
          meta: { requestId: 'r' },
        })
      }) as unknown as typeof globalThis.fetch,
    })

    await api.health()

    // Not `x-api-key`: a publishable key is an identifier, and sending it as a
    // credential would invite the API to treat it as one.
    expect(headers['x-publishable-key']).toBe('pk_test_abc')
    expect(headers['x-api-key']).toBeUndefined()
  })

  it('sends a service key as an API key', async () => {
    let headers: Record<string, string> = {}

    const api = new DocentoApi({
      baseUrl: 'https://api.example.com',
      apiKey: 'sk_live_abc',
      fetch: ((_url: string, init: RequestInit) => {
        headers = (init.headers ?? {}) as Record<string, string>

        return jsonResponse({
          success: true,
          data: {},
          meta: { requestId: 'r' },
        })
      }) as unknown as typeof globalThis.fetch,
    })

    await api.health()

    expect(headers['x-api-key']).toBe('sk_live_abc')
  })

  it('prefers a learner token over a key', async () => {
    let headers: Record<string, string> = {}

    const api = new DocentoApi({
      baseUrl: 'https://api.example.com',
      apiKey: 'sk_live_abc',
      learnerToken: 'learner-token',
      fetch: ((_url: string, init: RequestInit) => {
        headers = (init.headers ?? {}) as Record<string, string>

        return jsonResponse({
          success: true,
          data: {},
          meta: { requestId: 'r' },
        })
      }) as unknown as typeof globalThis.fetch,
    })

    await api.health()

    expect(headers.Authorization).toBe('Bearer learner-token')
    expect(headers['x-api-key']).toBeUndefined()
  })

  it('does not send cookies unless asked', async () => {
    // A server-side integration using a service key should not forward whatever
    // cookies its process happens to hold.
    let credentials: RequestCredentials | undefined

    const api = new DocentoApi({
      baseUrl: 'https://api.example.com',
      fetch: ((_url: string, init: RequestInit) => {
        credentials = init.credentials

        return jsonResponse({
          success: true,
          data: {},
          meta: { requestId: 'r' },
        })
      }) as unknown as typeof globalThis.fetch,
    })

    await api.health()

    expect(credentials).toBe('omit')
  })
})

describe('validation on demand', () => {
  it('accepts a response that matches the contract', async () => {
    const api = clientWith(() =>
      jsonResponse({
        success: true,
        data: {
          courses: [
            {
              courseId: 'c1',
              title: 'T',
              slug: 't',
              description: null,
              thumbnail: null,
              percent: 0,
              isComplete: false,
              hasAccess: true,
              lastSeenAt: null,
            },
          ],
        },
        meta: { requestId: 'r' },
      }),
    )

    await expect(api.callValidated('learner.courses')).resolves.toBeDefined()
  })

  it('rejects a response that does not', async () => {
    // The check that catches drift between what the API returns and what the
    // contract promises — which is the whole reason this package exists.
    const api = clientWith(() =>
      jsonResponse({
        success: true,
        data: { courses: [{ courseId: 'c1', percent: 'lots' }] },
        meta: { requestId: 'r' },
      }),
    )

    await expect(api.callValidated('learner.courses')).rejects.toThrow(
      /does not match its contract/,
    )
  })
})

describe('the response observer', () => {
  it('reports the operation, status and request id', async () => {
    const onResponse = vi.fn()

    const api = new DocentoApi({
      baseUrl: 'https://api.example.com',
      onResponse,
      fetch: (() =>
        jsonResponse(
          {
            success: true,
            data: { status: 'ok', version: '0.1.0' },
            meta: { requestId: 'r' },
          },
          { requestId: 'req-7' },
        )) as unknown as typeof globalThis.fetch,
    })

    await api.health()

    expect(onResponse).toHaveBeenCalledWith({
      operation: 'health',
      requestId: 'req-7',
      status: 200,
    })
  })

  it('reports failures too, since those are what need tracing', async () => {
    const onResponse = vi.fn()

    const api = new DocentoApi({
      baseUrl: 'https://api.example.com',
      onResponse,
      fetch: (() =>
        jsonResponse(
          {
            success: false,
            error: { code: 'not_found', message: 'no' },
            meta: { requestId: 'r' },
          },
          { status: 404, requestId: 'req-8' },
        )) as unknown as typeof globalThis.fetch,
    })

    await api.health().catch(() => undefined)

    expect(onResponse).toHaveBeenCalledWith({
      operation: 'health',
      requestId: 'req-8',
      status: 404,
    })
  })
})
