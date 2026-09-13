import { describe, expect, it } from 'vitest'

import {
  IDEMPOTENCY_HEADER,
  OPERATIONS,
  OPERATION_NAMES,
  PUBLIC_OPERATIONS,
  RETRYABLE_OPERATIONS,
  buildPath,
  parsePath,
  pathParams,
  toRoutePattern,
} from '../index.js'

/**
 * The registry is the API's description of itself. These tests assert the
 * properties that make it trustworthy as a description: that paths are
 * unambiguous, that a path's parameters are the ones it declares, and that
 * every operation has decided who may call it.
 *
 * None of this proves the API implements the registry — that is the API's own
 * test. What it proves is that the registry is internally consistent, so a
 * disagreement between the API and the SDK is a disagreement about one
 * document rather than between three.
 */

describe('the registry', () => {
  it('declares at least the operations the free loop needs', () => {
    // A floor rather than an exact count: the point is that a refactor cannot
    // quietly empty the registry, not that the number never changes.
    expect(OPERATION_NAMES.length).toBeGreaterThan(40)
  })

  it('has a unique method and path for every operation', () => {
    // Two operations at one method and path is an API where a request reaches
    // whichever handler was registered last, which is a bug that only shows up
    // in production.
    const seen = new Map<string, string>()

    for (const name of OPERATION_NAMES) {
      const operation = OPERATIONS[name]
      const key = `${operation.method} ${operation.path}`

      expect(
        seen.has(key),
        `${key} is claimed by ${seen.get(key)} and ${name}`,
      ).toBe(false)
      seen.set(key, name)
    }
  })

  it('declares every path parameter it uses', () => {
    for (const name of OPERATION_NAMES) {
      const operation = OPERATIONS[name]
      const fromPath = pathParams(operation.path).sort()
      const declared = Object.keys(
        (operation as { params?: { shape?: Record<string, unknown> } }).params
          ?.shape ?? {},
      ).sort()

      expect(
        declared,
        `${name} declares parameters that do not match its path`,
      ).toEqual(fromPath)
    }
  })

  it('starts every path with a slash and does not end with one', () => {
    for (const name of OPERATION_NAMES) {
      const path: string = OPERATIONS[name].path

      expect(path.startsWith('/'), `${name}: ${path}`).toBe(true)
      expect(path.length > 1 && path.endsWith('/'), `${name}: ${path}`).toBe(
        false,
      )
      expect(path.includes('//'), `${name}: ${path}`).toBe(false)
    }
  })

  it('decides who may call every operation', () => {
    // Not a formality: an operation with no action recorded is one nobody
    // decided about, and the API asserts against it at startup.
    for (const name of OPERATION_NAMES) {
      const { action } = OPERATIONS[name]

      expect(action.length, `${name} has no action`).toBeGreaterThan(0)
    }
  })

  it('gives every operation a summary', () => {
    // These become the OpenAPI summaries. An endpoint documented as nothing is
    // an endpoint an integrator has to read the source to use.
    for (const name of OPERATION_NAMES) {
      expect(OPERATIONS[name].summary.trim().length, name).toBeGreaterThan(0)
    }
  })

  it('names operations after the resource they act on', () => {
    for (const name of OPERATION_NAMES) {
      expect(name, name).toMatch(/^[a-z][a-zA-Z]*(\.[a-zA-Z]+)*$/)
    }
  })
})

describe('the public surface', () => {
  it('is small, and every member is a read or a verification', () => {
    // An unauthenticated write would be the most consequential mistake this
    // registry could contain, so the list is asserted rather than reviewed.
    expect([...PUBLIC_OPERATIONS].sort()).toEqual([
      'catalog.academy',
      'catalog.course',
      'catalog.courses',
      'certificate.verify',
      'health',
    ])

    for (const name of PUBLIC_OPERATIONS) {
      expect(['GET'], `${name} is public and not a read`).toContain(
        OPERATIONS[name].method,
      )
    }
  })
})

describe('idempotency', () => {
  it('is required by every operation that creates something', () => {
    // A retried create must not produce two of the thing. The list is derived
    // from the registry, so this asserts the registry marked the right ones.
    for (const name of [
      'course.create',
      'academy.create',
      'learner.enroll',
      'learner.certificate.issue',
      'learner.quiz.start',
      'learner.quiz.submit',
      'media.upload',
      'module.create',
      'lesson.create',
    ]) {
      expect(RETRYABLE_OPERATIONS, `${name} should be retryable`).toContain(
        name,
      )
    }
  })

  it('is not required by reads', () => {
    for (const name of RETRYABLE_OPERATIONS) {
      expect(
        OPERATIONS[name].method,
        `${name} is a read marked retryable`,
      ).not.toBe('GET')
    }
  })

  it('names the header the API looks for', () => {
    expect(IDEMPOTENCY_HEADER).toBe('idempotency-key')
  })
})

describe('path handling', () => {
  it('splits a template into literals and parameters', () => {
    expect(parsePath('/workspaces/{workspaceId}/academies')).toEqual([
      { kind: 'literal', value: 'workspaces' },
      { kind: 'param', name: 'workspaceId' },
      { kind: 'literal', value: 'academies' },
    ])
  })

  it('lists parameters in order', () => {
    expect(pathParams('/a/{first}/b/{second}')).toEqual(['first', 'second'])
  })

  it('translates to the router pattern the API registers', () => {
    // One translation, in one place. A route registered at a path the SDK
    // cannot build is the failure this prevents.
    expect(toRoutePattern('/catalog/academies/{academyId}/courses')).toBe(
      '/catalog/academies/:academyId/courses',
    )
  })

  it('builds a concrete path, encoding values', () => {
    expect(
      buildPath('/catalog/academies/{academyId}', { academyId: 'abc' }),
    ).toBe('/catalog/academies/abc')

    // A value with a slash must not become an extra path segment.
    expect(buildPath('/a/{id}', { id: 'x/y' })).toBe('/a/x%2Fy')
  })

  it('refuses to build a path with a missing parameter', () => {
    expect(() => buildPath('/a/{id}', {})).toThrow(/Missing path parameter/)
  })
})

describe('response shapes are declared, not assumed', () => {
  it('gives every operation a parseable response schema', () => {
    for (const name of OPERATION_NAMES) {
      expect(typeof OPERATIONS[name].response.parse, `${name}`).toBe('function')
    }
  })

  it('never declares a field that could hold an answer key', () => {
    /**
     * The strongest guarantee available at this layer.
     *
     * A learner-facing quiz shape that cannot express `correctAnswer` cannot
     * leak it by accident, and a reviewer reading the contract can see that
     * without reading the query that builds it. This checks the declared
     * shape's keys rather than trusting that no route populates one.
     */
    const quiz = OPERATIONS['learner.quiz'].response
    const serialised = JSON.stringify(quiz.shape)

    expect(serialised).not.toContain('correctAnswer')
    expect(serialised).not.toContain('correctAnswers')
  })

  it('keeps the public certificate view free of learner identifiers', () => {
    const certificate = OPERATIONS['certificate.verify'].response
    const serialised = JSON.stringify(certificate.shape)

    expect(serialised).not.toContain('learnerId')
    expect(serialised).not.toContain('email')
    expect(serialised).not.toContain('academyId')
  })
})
