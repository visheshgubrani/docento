import { z } from 'zod'

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
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * Amounts are integer minor units. Never floating point: `29.99` becomes
 * `2999`, and the currency is explicit rather than assumed. See
 * docs/adr/0009-commerce-separation.md.
 */
export const moneySchema = z.object({
  amountMinor: z.number().int(),
  /** ISO 4217, uppercase. */
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/),
})

export type Money = z.infer<typeof moneySchema>

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'must be lowercase alphanumeric words separated by single hyphens',
  )

/**
 * How learners in an academy authenticate.
 *
 * `HYBRID` exists because a workspace may want platform-managed learners while
 * still delegating staff identity, or vice versa.
 */
export const authModeSchema = z.enum(['MANAGED', 'DELEGATED', 'HYBRID'])
export type AuthMode = z.infer<typeof authModeSchema>

/**
 * Academy branding. Applied by the learner application and the certificate
 * renderer, so it is a contract rather than free-form JSON.
 */
export const brandingSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour')
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour')
    .optional(),
  supportEmail: z.string().email().optional(),
  legal: z
    .object({
      termsUrl: z.string().url().optional(),
      privacyUrl: z.string().url().optional(),
      refundPolicyUrl: z.string().url().optional(),
    })
    .optional(),
})

export type Branding = z.infer<typeof brandingSchema>

export const academySummarySchema = z.object({
  id: z.string(),
  slug: slugSchema,
  name: z.string(),
  authMode: authModeSchema,
  branding: brandingSchema.nullable(),
})

export type AcademySummary = z.infer<typeof academySummarySchema>

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const courseSummarySchema = z.object({
  id: z.string(),
  slug: slugSchema,
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  lessonCount: z.number().int().nonnegative(),
  /** Null when the course is free. */
  price: moneySchema.nullable(),
})

export type CourseSummary = z.infer<typeof courseSummarySchema>

/**
 * What a learner may see about a lesson before enrolling.
 *
 * Note there is no body, media URL, or answer key here: previewing a lesson is
 * not the same as being entitled to it, and the two shapes are kept separate so
 * a listing endpoint cannot accidentally leak content.
 */
export const lessonPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.enum(['VIDEO', 'TEXT', 'FILE', 'QUIZ', 'ASSIGNMENT', 'EMBED']),
  position: z.number().int().nonnegative(),
  isFree: z.boolean(),
  durationSeconds: z.number().int().nonnegative().nullable(),
})

export type LessonPreview = z.infer<typeof lessonPreviewSchema>

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

/**
 * Header used to make retryable mutations safe. Checkout, refunds, and
 * enrollment all require it, because a network retry must not charge twice.
 */
export const IDEMPOTENCY_HEADER = 'idempotency-key'

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(255)
  .describe('A client-generated value, stable across retries of one operation.')
