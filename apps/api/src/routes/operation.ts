import type { Context } from 'hono'

import {
  type OperationInput,
  type OperationName,
  type OperationOutput,
  IDEMPOTENCY_HEADER,
  OPERATIONS,
  RETRYABLE_OPERATIONS,
} from '@docento/contracts'
import type { Principal, ResolvedAcademy } from '@docento/domain'

import { resolveAcademyFor, resolvePrincipal } from '../auth/principal.js'
import {
  BodyParseError,
  BodyValidationError,
  IdempotencyKeyError,
  ParamValidationError,
} from '../middleware/request-error.js'
import { handleError, ok } from '../middleware/respond.js'

/**
 * The one place a route is defined.
 *
 * ## What this exists to prevent
 *
 * The application this replaces guarded routes with a chain of middleware:
 * `authorizeProjectAccess` then three context resolvers, applied by hand at each
 * mount. The review of that code found the interesting thing about it — that
 * `quiz.controller.ts` and `assignment.controller.ts` contain no tenant
 * reference at all and are safe *only* because the chain was applied correctly
 * in one file. Delete or reorder the chain and every one of those routes becomes
 * cross-tenant readable, with nothing to indicate it.
 *
 * So this is not a convenience wrapper. It performs the steps in a fixed order
 * and offers no way to skip one:
 *
 *   1. resolve the academy the request is about;
 *   2. resolve the principal;
 *   3. validate the path parameters, query and body against the contract;
 *   4. assert the idempotency key when the operation is retryable;
 *   5. invoke the domain operation;
 *   6. wrap the result in the envelope.
 *
 * The handler receives all of it as arguments, which is what makes the ordering
 * structural: there is no `c.get('principal')` to forget to read, because the
 * principal is a parameter.
 *
 * ## Validation from the registry, not from the route
 *
 * The schemas come from the contract the SDK is generated from, so a route
 * cannot accept a shape the client cannot send. `safeParse` rather than `parse`
 * because a validation failure is a `422` with field detail, not a thrown
 * exception that has to be recognised.
 */

/** Everything a handler is given. */
export type OperationContext<Name extends OperationName> = {
  request: Context
  principal: Principal
  /** Resolved from the host or a slug, never from the body. */
  academy: ResolvedAcademy | null
  /** Validated against the contract. */
  input: OperationInput<Name>
  /** The idempotency key, already asserted present for retryable operations. */
  idempotencyKey: string | null
}

export type OperationHandler<Name extends OperationName> = (
  context: OperationContext<Name>,
) => Promise<OperationOutput<Name>>

/**
 * Define a route for a registered operation.
 *
 * Returns a handler Hono can mount. The path is the caller's to supply, because
 * Hono needs a literal for its router — but a test asserts that every registered
 * path is mounted somewhere, so a mismatch is caught rather than becoming a
 * route nobody can reach.
 */
export function operation<Name extends OperationName>(
  name: Name,
  handler: OperationHandler<Name>,
) {
  const definition = OPERATIONS[name]

  return async (c: Context): Promise<Response> => {
    try {
      /**
       * Academy first. The learner realm is built per academy, so there is no
       * session to read until one is resolved — and a request that names no
       * academy resolves to none rather than to a default.
       */
      const academy = await resolveAcademyFor(c)

      const principal = await resolvePrincipal(c, academy)

      /**
       * Inputs are validated from the registry entry, and the properties are
       * asked for rather than assumed: `params`, `query` and `body` are declared
       * only on the operations that have them, which is what lets the SDK omit
       * them from a method signature. Indexing them unconditionally would be a
       * runtime `undefined` the type system correctly refuses.
       */
      const params = validateParams(
        c,
        'params' in definition ? definition.params : undefined,
        name,
      )

      const query = validateQuery(
        c,
        'query' in definition ? definition.query : undefined,
        name,
      )

      const body = await validateBody(
        c,
        'body' in definition ? definition.body : undefined,
        name,
      )

      const idempotencyKey = requireIdempotencyKey(c, name)

      const data = await handler({
        request: c,
        principal,
        academy,
        input: { params, query, body } as OperationInput<Name>,
        idempotencyKey,
      })

      return ok(c, data)
    } catch (error) {
      return handleError(c, error)
    }
  }
}

/** Path parameters, coerced by the contract's own schema. */
function validateParams(
  c: Context,
  schema: unknown,
  name: OperationName,
): Record<string, unknown> {
  if (!schema || typeof (schema as { safeParse?: unknown }).safeParse !== 'function') {
    return {}
  }

  const raw = c.req.param()

  const parsed = (schema as { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: unknown } }).safeParse(raw)

  if (!parsed.success) {
    throw new ParamValidationError(name, raw)
  }

  return parsed.data as Record<string, unknown>
}

function validateQuery(c: Context, schema: unknown, name: OperationName): unknown {
  if (!schema || typeof (schema as { safeParse?: unknown }).safeParse !== 'function') {
    return undefined
  }

  const parsed = (schema as { safeParse: (v: unknown) => { success: boolean; data?: unknown } }).safeParse(
    c.req.query(),
  )

  if (!parsed.success) {
    throw new ParamValidationError(name, c.req.query())
  }

  return parsed.data
}

/**
 * The body, when the operation declares one.
 *
 * An operation with no body schema ignores whatever was sent rather than
 * refusing it: a client posting `{}` to a no-body operation is not making a
 * mistake worth a `422`, and the GET-like semantics of those operations mean
 * nothing is at stake.
 */
async function validateBody(
  c: Context,
  schema: unknown,
  name: OperationName,
): Promise<unknown> {
  if (!schema || typeof (schema as { safeParse?: unknown }).safeParse !== 'function') {
    return undefined
  }

  let raw: unknown

  try {
    raw = await c.req.json()
  } catch {
    /**
     * A body that is not JSON is refused here rather than reaching a schema as
     * `undefined`, because "you sent malformed JSON" and "you omitted a
     * required field" are different problems with different fixes.
     */
    throw new BodyParseError(name)
  }

  const parsed = (schema as { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: { path: PropertyKey[]; message: string }[] } } }).safeParse(raw)

  if (!parsed.success) {
    throw new BodyValidationError(
      name,
      (parsed.error?.issues ?? []).map((issue) => ({
        path: issue.path.map(String).join('.') || '(body)',
        message: issue.message,
      })),
    )
  }

  return parsed.data
}

/**
 * Require an idempotency key on a retryable operation.
 *
 * The registry decides which operations those are, so a route cannot forget:
 * adding `retryable: true` to an operation makes this apply at the next start.
 */
function requireIdempotencyKey(c: Context, name: OperationName): string | null {
  const required = (RETRYABLE_OPERATIONS as readonly string[]).includes(name)

  if (!required) return null

  const key = c.req.header(IDEMPOTENCY_HEADER)?.trim()

  if (!key || key.length < 8) {
    throw new IdempotencyKeyError(name)
  }

  return key
}

export {
  BodyParseError,
  BodyValidationError,
  IdempotencyKeyError,
  ParamValidationError,
  RequestError,
} from '../middleware/request-error.js'
