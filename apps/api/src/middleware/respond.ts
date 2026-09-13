import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import {
  type ApiError,
  type ErrorCode,
  ERROR_CODES,
  apiErrorSchema,
} from '@docento/contracts'
import {
  ConflictError,
  DomainRuleError,
  ForbiddenAccess,
  ForbiddenError,
  NotFoundError,
} from '@docento/domain'

import { RequestError } from './request-error.js'
import { requestOf } from './request-context.js'

/**
 * The response envelope, in one place.
 *
 * Every success goes through `ok` and every failure through `fail`, so no route
 * constructs a body directly. That is what makes the envelope a property of the
 * API rather than a convention each handler remembers — and the reason a client
 * can unwrap `data` without checking whether this particular endpoint is the one
 * that forgot.
 */

/** Which HTTP status each machine-readable code maps to. */
const STATUS_FOR: Record<ErrorCode, ContentfulStatusCode> = {
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  stale_revision: 409,
  rate_limited: 429,
  payment_required: 402,
  provider_not_configured: 503,
  provider_error: 502,
  idempotency_replay: 200,
  internal_error: 500,
}

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  const context = requestOf(c)

  return c.json(
    {
      success: true as const,
      data,
      meta: { requestId: context.requestId },
    },
    status,
  )
}

export function fail(
  c: Context,
  code: ErrorCode,
  message: string,
  details?: ApiError['details'],
) {
  const context = requestOf(c)

  const error = apiErrorSchema.parse({
    code,
    message,
    ...(details && details.length > 0 ? { details } : {}),
  })

  return c.json(
    {
      success: false as const,
      error,
      meta: { requestId: context.requestId },
    },
    STATUS_FOR[code],
  )
}

/**
 * Turn a thrown domain error into a response.
 *
 * ## Why the mapping lives here
 *
 * The domain throws typed errors because it has no opinion about HTTP — a
 * worker invoking the same operation must not be handed a status code. Mapping
 * them is therefore this layer's job, and doing it in one place means adding an
 * error type is a compile error rather than a route that forgets to handle it.
 *
 * ## What is deliberately not returned
 *
 * A `ForbiddenError`'s reason names which identifier was missing or which tenant
 * mismatched. That is exactly what makes it diagnosable from a log, and exactly
 * what should not be sent to the caller: "the resource belongs to a different
 * workspace" confirms that a workspace with that id exists. The reason goes to
 * the log; the client gets the code and a sentence that says nothing.
 */
export function handleError(c: Context, error: unknown) {
  const context = safeRequestOf(c)

  if (error instanceof NotFoundError) {
    return fail(c, 'not_found', `That ${error.resource} was not found.`)
  }

  if (error instanceof ForbiddenError) {
    logRefusal(context, error.action, error.reason)

    return fail(c, 'forbidden', 'You do not have access to that.')
  }

  if (error instanceof ForbiddenAccess) {
    // A different situation from a role refusal: the caller is who they say
    // they are and has lost entitlement to a specific course, so telling them
    // so is useful rather than a leak.
    return fail(c, 'forbidden', error.message)
  }

  if (error instanceof ConflictError) {
    return fail(c, 'conflict', error.message)
  }

  if (error instanceof DomainRuleError) {
    return fail(c, 'validation_failed', error.message, [...error.details])
  }

  /**
   * A malformed request.
   *
   * Checked after the domain errors and before the catch-all, because a request
   * that never reached the domain is not an internal failure — it is the
   * client's to fix, and answering `500` would send them looking in the wrong
   * place. The detail is returned because the caller can act on it: which field
   * was wrong is exactly what a form needs.
   */
  if (error instanceof RequestError) {
    return fail(c, 'validation_failed', error.message, [...error.details])
  }

  /**
   * Anything else is a bug, and the response says nothing about it.
   *
   * The message and stack go to the log with the request id; the client gets a
   * sentence and an id it can quote. Returning an internal message is how a
   * database error becomes a description of the schema.
   */
  console.error(
    JSON.stringify({
      level: 'error',
      service: 'api',
      message: 'unhandled_error',
      requestId: context?.requestId ?? null,
      path: context?.path ?? null,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }),
  )

  return fail(c, 'internal_error', 'Something went wrong on our side.')
}

function safeRequestOf(c: Context) {
  try {
    return requestOf(c)
  } catch {
    // An error before the context middleware ran, which should not happen but
    // must not turn into a second failure while reporting the first.
    return null
  }
}

function logRefusal(
  context: ReturnType<typeof safeRequestOf>,
  action: string,
  reason: string,
) {
  console.warn(
    JSON.stringify({
      level: 'warn',
      service: 'api',
      message: 'refused',
      requestId: context?.requestId ?? null,
      action,
      reason,
      timestamp: new Date().toISOString(),
    }),
  )
}

/**
 * A check that the status map covers every code.
 *
 * A code with no status would fail at the moment it is first used, which is the
 * worst time to find out. This runs at import.
 */
for (const code of ERROR_CODES) {
  if (!(code in STATUS_FOR)) {
    throw new Error(`No HTTP status is mapped for the error code "${code}".`)
  }
}
