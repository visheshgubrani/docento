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

/**
 * Header naming the workspace a staff request acts in.
 *
 * ## Why this is a header and not a body field
 *
 * A staff identity spans workspaces, so a request has to say which one it means
 * — and it may not say it in a payload, because a payload is the part of a
 * request an attacker controls most easily. A header is no more trustworthy
 * than a body field in itself; what makes this safe is that the API checks it
 * against the membership table and refuses a workspace the caller is not in,
 * rather than trusting it. See `apps/api/src/auth/principal.ts`.
 *
 * ## Why the name lives here
 *
 * The SDK has to send exactly this string, and the API has to read exactly this
 * string. They are separate packages with separate licences, so a convention
 * agreed in prose is a convention that drifts — and a drifted workspace header
 * does not fail loudly, it reads as "not signed in".
 */
export const WORKSPACE_HEADER = 'x-workspace-id'

/**
 * Where the JSON API is mounted.
 *
 * ## Why this is a constant and not a convention
 *
 * Every path in the operation registry is written *relative to this mount* —
 * `/workspaces/{workspaceId}` rather than `/api/v1/workspaces/{workspaceId}` —
 * so the registry reads as a list of resources rather than a list of URLs.
 * Something has to put the prefix back, and for a while nothing did: the SDK
 * built `baseUrl + path`, so a client pointed at the API's origin requested
 * `/staff/session` and got a 404 from a router that serves `/api/v1/staff/session`.
 * The frontends proxy `/api/v1/*` to the API, which made the omission look like
 * a proxy misconfiguration rather than a missing prefix.
 *
 * It lives here because three things have to agree about it: the router that
 * mounts, the `rewrites()` in both applications, and the client that builds
 * URLs. Two of those are in AGPL packages and one is Apache-2.0, so a comment
 * would not have kept them together.
 */
export const API_MOUNT = '/api/v1'

export const requestIdSchema = z.string().min(1).max(128)
