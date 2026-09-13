import { z } from 'zod'

/**
 * The response envelope, the error codes, and the two shared request shapes.
 *
 * A module with no imports of its own, deliberately: `openapi.ts` needs these
 * *and* the registry, and if it took them from `index.ts` the graph would be
 * `index → openapi → index`. `pnpm boundaries` fails on a cycle, which is how
 * this file came to exist — the alternative was an import that happened to work
 * because of module evaluation order, which is not something to rely on.
 */

/**
 * Machine-readable error codes.
 *
 * Clients branch on these, never on the human-readable message, so wording can
 * change without breaking an integration.
 */
export const ERROR_CODES = [
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'stale_revision',
  'rate_limited',
  'payment_required',
  'provider_not_configured',
  'provider_error',
  'idempotency_replay',
  'internal_error',
] as const

export const errorCodeSchema = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  /** Field-level detail for `validation_failed`. */
  details: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

/**
 * Every response carries a request id matching the server logs, which is what
 * makes a user-reported failure findable.
 */
export const responseMetaSchema = z.object({
  requestId: z.string(),
  /** Present on list responses. */
  nextCursor: z.string().nullable().optional(),
})

export type ResponseMeta = z.infer<typeof responseMetaSchema>

export const apiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    meta: responseMetaSchema,
  })

export const apiFailureSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
  meta: responseMetaSchema,
})

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  /** Opaque. Clients pass back whatever the previous response returned. */
  cursor: z.string().optional(),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

/**
 * Header that makes a retryable mutation safe to retry.
 *
 * Operations the registry marks `retryable` refuse a request without it, so a
 * network retry cannot create a second course, enrolment or certificate. The key
 * is stored per academy and replayed: the same key twice returns the stored
 * response rather than performing the work again.
 */
export const IDEMPOTENCY_HEADER = 'idempotency-key'

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(255)
  .describe('A client-generated value, stable across retries of one operation.')

export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>

/**
 * Header carrying a request id chosen by the caller.
 *
 * Echoed back and included in logs, so a user-reported failure is findable. A
 * client that already has a tracing id should pass it; otherwise the server
 * generates one.
 */
export const REQUEST_ID_HEADER = 'x-request-id'

export const requestIdSchema = z.string().min(1).max(128)
