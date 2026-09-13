/**
 * Docento public API contracts.
 *
 * This package is the single source of truth for the shape of the public API.
 * The OpenAPI document and `@docento/sdk` are both derived from it, so a change
 * here cannot leave the documentation or the client behind.
 *
 * Licensed Apache-2.0, unlike the application. It is deliberately free of any
 * import from an AGPL-3.0 package so that it stays usable in proprietary
 * software — that rule is enforced in CI, not by convention. See
 * docs/adr/0006-licensing-boundary.md.
 *
 * ## Layout
 *
 * - `schemas.ts` — every shape the API sends or receives, including the response
 *   envelope and the error codes clients branch on.
 * - `operations.ts` — the operation registry: one entry per endpoint, carrying
 *   its method, path, inputs, response and the action that guards it.
 *
 * The registry is the reason this package exists. The API validates requests by
 * looking them up, the OpenAPI document is generated from them, and the SDK's
 * signatures derive from them, so the three cannot describe different APIs.
 *
 * ## Request headers
 *
 * The two headers the API understands beyond the standard ones live here rather
 * than in `schemas.ts`, because they are conventions about a request rather than
 * shapes of a document.
 */

export * from './envelope.js'
export * from './schemas.js'
export * from './operations.js'
export { buildOpenApiDocument } from './openapi.js'
export type { OpenApiDocumentOptions } from './openapi.js'

/**
 * Header that makes a retryable mutation safe to retry.
 *
 * Operations the registry marks `retryable` refuse a request without it, so a
 * network retry cannot create a second course, enrolment, or certificate. The
 * key is stored per academy and replayed: the same key twice returns the stored
 * response rather than performing the work again.
 */
