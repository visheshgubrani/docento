import { describe, expect, it } from 'vitest'

import { OPERATIONS, OPERATION_NAMES } from '../operations.js'
import { buildOpenApiDocument } from '../openapi.js'

/**
 * The OpenAPI document is generated, so these tests are about whether the
 * generation is complete rather than whether it is correct by eye. A path in
 * the registry that does not appear in the document is an endpoint an
 * integrator cannot discover.
 */

const document = buildOpenApiDocument({ apiUrl: 'https://api.example.com' })
const paths = document.paths as Record<string, Record<string, unknown>>

describe('the generated document', () => {
  it('is OpenAPI 3.1', () => {
    // 3.1 is JSON Schema-compatible, so Zod's output needs no translation —
    // and every translation is a place for the document to say something the
    // schema does not.
    expect(document.openapi).toBe('3.1.0')
  })

  it('declares the server it was built for', () => {
    expect(document.servers).toEqual([{ url: 'https://api.example.com' }])
  })

  it('documents every operation in the registry', () => {
    for (const name of OPERATION_NAMES) {
      const operation = OPERATIONS[name]
      const entry = paths[operation.path]?.[operation.method.toLowerCase()]

      expect(entry, `${name} is missing from the document`).toBeDefined()
      expect((entry as { operationId?: string }).operationId).toBe(name)
    }
  })

  it('documents no path that is not in the registry', () => {
    // The other direction. A hand-edited document that grew a path the API does
    // not serve would send integrators to a 404.
    const documented = new Set(
      Object.entries(paths).flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
      ),
    )
    const registered = new Set(
      OPERATION_NAMES.map(
        (name) => `${OPERATIONS[name].method} ${OPERATIONS[name].path}`,
      ),
    )

    expect([...documented].sort()).toEqual([...registered].sort())
  })

  it('carries the summary from the registry', () => {
    const entry =
      paths['/catalog/courses'] ??
      paths['/catalog/academies/{academyId}/courses']

    expect((entry?.get as { summary?: string })?.summary).toBe(
      'Published courses in an academy',
    )
  })

  it('documents the credentials it accepts', () => {
    const schemes = (
      document.components as { securitySchemes: Record<string, unknown> }
    ).securitySchemes

    expect(Object.keys(schemes).sort()).toEqual([
      'learnerSession',
      'publishableKey',
      'serviceKey',
      'staffSession',
    ])
  })

  it('leaves public operations unauthenticated', () => {
    // The most consequential thing this document could get wrong: telling an
    // integrator to authenticate a request that needs no credential is
    // harmless, and the reverse is not.
    for (const path of [
      '/catalog/academies/{academyId}',
      '/catalog/academies/{academyId}/courses',
      '/verify/{verificationId}',
      '/health',
    ]) {
      const entry = paths[path]?.get as { security?: unknown[] } | undefined

      expect(entry?.security, path).toEqual([])
    }
  })

  it('requires a session for learner operations', () => {
    const entry = paths['/learn/courses']?.get as
      { security?: Record<string, string[]>[] } | undefined

    expect(entry?.security).toEqual([{ learnerSession: [] }])
  })

  it('offers both a session and a key for workspace operations', () => {
    const entry = paths['/workspaces/{workspaceId}/academies']?.get as
      { security?: Record<string, string[]>[] } | undefined

    expect(entry?.security).toEqual([{ staffSession: [] }, { serviceKey: [] }])
  })

  it('marks the idempotency header required on retryable operations', () => {
    const entry = paths['/learn/courses/{courseId}/enrollment']?.post as
      { parameters?: { name: string; required?: boolean }[] } | undefined

    const header = entry?.parameters?.find(
      (parameter) => parameter.name === 'idempotency-key',
    )

    expect(header?.required).toBe(true)
  })

  it('does not mention the idempotency header on reads', () => {
    const entry = paths['/learn/courses']?.get as
      { parameters?: { name: string }[] } | undefined

    expect(
      entry?.parameters?.some(
        (parameter) => parameter.name === 'idempotency-key',
      ),
    ).toBe(false)
  })

  it('documents the error envelope once, with the codes', () => {
    const entry = paths['/learn/courses']?.get as
      { responses?: Record<string, { description?: string }> } | undefined

    expect(entry?.responses?.default?.description).toContain(
      'validation_failed',
    )
    expect(entry?.responses?.default?.description).toContain('forbidden')
  })

  it('is reproducible: building twice yields the same document', () => {
    // A document that changed between builds would make every CI diff of it
    // noise, and a checked-in artifact would churn.
    const first = buildOpenApiDocument({ apiUrl: 'https://api.example.com' })
    const second = buildOpenApiDocument({ apiUrl: 'https://api.example.com' })

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('never puts an answer key in a response, including in generated clients', () => {
    /**
     * The distinction that matters, and the first version of this test got it
     * wrong by asserting on the whole document.
     *
     * `correctAnswer` legitimately appears in a *request*: an author sending a
     * question necessarily sends its key, and a route that could not accept one
     * could not be used to author a quiz. What must never appear is the key in a
     * *response*, because that is what every generated client would then model
     * as receivable — and what an integrator would reasonably display.
     *
     * So this walks each operation's success response only.
     */
    const responseSchemas: Record<string, unknown> = {}

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const responses = (operation as { responses?: Record<string, unknown> })
          .responses

        if (responses?.['200']) {
          responseSchemas[`${method.toUpperCase()} ${path}`] = responses['200']
        }
      }
    }

    // Every operation documents a success response, so this is not vacuous.
    expect(Object.keys(responseSchemas).length).toBe(OPERATION_NAMES.length)

    const serialised = JSON.stringify(responseSchemas)

    expect(serialised).not.toContain('correctAnswer')
    expect(serialised).not.toContain('correctAnswers')
  })

  it('does allow an author to send a key when writing a question', () => {
    // The other half of the same distinction, asserted so a future reader does
    // not "fix" the request shape by removing the field and break authoring.
    const entry = paths[
      '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/quizzes/{quizId}/questions'
    ]?.put as { requestBody?: unknown } | undefined

    expect(JSON.stringify(entry?.requestBody)).toContain('correctAnswer')
  })
})
