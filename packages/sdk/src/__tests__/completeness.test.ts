import { describe, expect, it } from 'vitest'

import { OPERATION_NAMES } from '@docento/contracts'

import {
  DocentoApi,
  IMPLEMENTED_OPERATIONS,
  STREAMING_OPERATIONS,
  UNIMPLEMENTED_OPERATIONS,
} from '../client'

/**
 * The registry and the client must describe the same API.
 *
 * `as const satisfies Record<OperationName, keyof DocentoApi>` already makes
 * most of this a compile error, which is the strongest form the check can take:
 * adding an operation to the registry without a method fails the build, and
 * naming a method that does not exist on the class fails it too.
 *
 * These tests cover what the type system cannot. The `satisfies` clause proves a
 * *name* exists in the map — not that the class actually has that method, since
 * a typo in the value position would still be a valid `keyof DocentoApi`. And it
 * says nothing about whether an operation was quietly declared un-implementable.
 */
describe('the client implements the registry', () => {
  it('has a method for every operation the registry declares', () => {
    const streaming = new Set<string>(STREAMING_OPERATIONS)
    const missing = OPERATION_NAMES.filter(
      (name) => !streaming.has(name) && !(name in IMPLEMENTED_OPERATIONS),
    )

    expect(
      missing,
      `operations with no SDK method: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('names a method that exists on the class for every operation', () => {
    // The gap `satisfies` leaves: it checks that the *value* is a key of the
    // class, not that the property is callable. A class field shadowing a
    // method would pass the type check and fail at runtime.
    for (const [operation, method] of Object.entries(IMPLEMENTED_OPERATIONS)) {
      const fn = (DocentoApi.prototype as unknown as Record<string, unknown>)[
        method
      ]

      expect(
        typeof fn,
        `${operation} maps to ${method}, which is not a method`,
      ).toBe('function')
    }
  })

  it('declares no method the registry does not have', () => {
    const declared = new Set(Object.values(IMPLEMENTED_OPERATIONS))

    for (const method of declared) {
      expect(
        (DocentoApi.prototype as unknown as Record<string, unknown>)[method],
        `${method} is declared as implemented but is not on the class`,
      ).toBeDefined()
    }
  })

  it('leaves exactly the streaming operations unimplemented', () => {
    // A JSON client cannot serve bytes. Asserted rather than assumed, so an
    // operation added without a method shows up here as the reason.
    expect([...UNIMPLEMENTED_OPERATIONS].sort()).toEqual(
      [...STREAMING_OPERATIONS].sort(),
    )
  })

  it('requires an idempotency key on every retryable operation', () => {
    /**
     * Checked by type, not by reflection.
     *
     * An earlier version tried to infer requiredness from `Function.length` and
     * from whether a call with one fewer argument threw. That does not work:
     * JavaScript cannot distinguish a missing argument from one passed as
     * `undefined`, so the check reported every method as optional — which it
     * did, and which is why it is no longer here.
     *
     * The property is a compile-time one, so it is asserted at compile time.
     * These calls would be type errors if a key became optional, and the
     * `@ts-expect-error` markers assert the opposite: that omitting it *is* an
     * error. A `@ts-expect-error` that stops being an error fails `tsc`, so the
     * assertion cannot rot.
     */
    const keysAreRequired = (api: DocentoApi) => {
      // @ts-expect-error the idempotency key is required.
      void api.createAcademy('w', { name: 'n', slug: 's' })
      // @ts-expect-error the idempotency key is required.
      void api.createCourse('w', 'a', { title: 't', slug: 's' })
      // @ts-expect-error the idempotency key is required.
      void api.publishCourse('w', 'a', 'c')
      // @ts-expect-error the idempotency key is required.
      void api.enrollInCourse('c')
      // @ts-expect-error the idempotency key is required.
      void api.submitQuizAttempt('attempt', [])
      // @ts-expect-error the idempotency key is required.
      void api.requestCertificate('c')
      // @ts-expect-error the idempotency key is required.
      void api.beginUpload('w', {
        filename: 'f',
        mimeType: 'text/plain',
        sizeBytes: 1,
      })
    }

    expect(typeof keysAreRequired).toBe('function')
  })

  it('sends the key as the header the API reads', async () => {
    // The method signatures being right is not the same as the header being
    // right, so this drives one call through a stubbed fetch.
    const seen: { url: string; headers: Record<string, string> }[] = []

    const api = new DocentoApi({
      baseUrl: 'https://api.example.com',
      fetch: (async (url: string, init: RequestInit) => {
        seen.push({
          url,
          headers: (init.headers ?? {}) as Record<string, string>,
        })

        return new Response(
          JSON.stringify({
            success: true,
            data: { enrollment: { id: 'e1' } },
            meta: { requestId: 'req-1' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }) as unknown as typeof globalThis.fetch,
    })

    await api.enrollInCourse('course-1', 'a-key-that-is-long-enough')

    expect(seen).toHaveLength(1)
    expect(seen[0]?.headers['idempotency-key']).toBe(
      'a-key-that-is-long-enough',
    )
    expect(seen[0]?.url).toBe(
      'https://api.example.com/learn/courses/course-1/enrollment',
    )
  })
})
