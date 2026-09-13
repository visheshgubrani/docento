import { type Action } from '../authorization/actions'
import {
  can,
  canViaAssignment,
  type Decision,
  type Resource,
} from '../authorization/can'
import type { Principal, StaffAssignment } from '../authorization/principal'

/**
 * The guard every domain operation starts with.
 *
 * `can()` returns a decision rather than throwing, because a caller sometimes
 * wants to ask a question about permission — "may this person see the draft
 * version of this page" — without it being an error. A domain operation that
 * has decided to act wants the opposite: if the answer is no, it must stop, and
 * it must stop in a way the transport layer can turn into a `403` without
 * inspecting a boolean it might forget to check.
 *
 * That difference is why this exists rather than every operation writing
 * `if (!can(...).allowed) throw ...`. A forgotten check is a silent grant, and
 * this makes forgetting one a type error: the operation has nothing to proceed
 * with.
 */

/**
 * A refusal, carrying the action and the reason.
 *
 * The reason comes from `can()` and is deliberately preserved. It names which
 * identifier was missing or which tenant mismatched, which is what makes a
 * misconfigured resource resolvable from a log line rather than by
 * reproduction.
 *
 * It is not, however, sent to an unauthenticated caller — the transport layer
 * maps this to a generic `forbidden` and logs the reason. "You are not a member
 * of workspace X" is a fact about the system that a stranger does not need.
 */
export class ForbiddenError extends Error {
  readonly action: Action
  readonly reason: string

  constructor(action: Action, reason: string) {
    super(`"${action}" was refused: ${reason}`)
    this.name = 'ForbiddenError'
    this.action = action
    this.reason = reason
  }
}

/**
 * A resource that could not be found, or is not in this tenant.
 *
 * Deliberately indistinguishable from "does not exist". Returning `403` for a
 * resource in another tenant and `404` for one that is absent tells the caller
 * which identifiers are real, across tenants, which is exactly the leak
 * containment exists to prevent.
 */
export class NotFoundError extends Error {
  readonly resource: string
  readonly id: string

  constructor(resource: string, id: string) {
    super(`${resource} "${id}" was not found.`)
    this.name = 'NotFoundError'
    this.resource = resource
    this.id = id
  }
}

/**
 * The resource does not satisfy a rule of the domain, as opposed to a rule of
 * permission.
 *
 * `details` carries field-level information so a validation failure can be
 * reported per field rather than as one sentence, matching the contracts'
 * `validation_failed` shape.
 */
export class DomainRuleError extends Error {
  readonly code: string
  readonly details: readonly { path: string; message: string }[]

  constructor(
    code: string,
    message: string,
    details: readonly { path: string; message: string }[] = [],
  ) {
    super(message)
    this.name = 'DomainRuleError'
    this.code = code
    this.details = details
  }
}

/**
 * A write lost a race, or was attempted against a revision that has moved on.
 *
 * Separate from `DomainRuleError` because the right client behaviour differs:
 * a rule error is the caller's mistake and will fail again, while a conflict is
 * worth retrying with fresh state.
 */
export class ConflictError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ConflictError'
    this.code = code
  }
}

/**
 * Assert that a principal may perform an action, or throw.
 *
 * `assignments` is optional and only consulted when supplied. It is a separate
 * question from the workspace role on purpose — see `canViaAssignment` — so an
 * operation that can be satisfied by a course-scoped grant passes the caller's
 * assignments and gets a refusal only when neither the role nor an assignment
 * permits the action.
 */
export function assertCan(
  principal: Principal,
  action: Action,
  resource: Resource,
  assignments: readonly StaffAssignment[] = [],
): void {
  const decision = can(principal, action, resource)

  if (decision.allowed) return

  // A course- or academy-scoped grant is a second, narrower answer to the same
  // question. Asked only after the role check fails, so a workspace owner is
  // never made to depend on an assignment existing.
  if (assignments.length > 0) {
    const viaAssignment = canViaAssignment(action, resource, assignments)
    if (viaAssignment.allowed) return
  }

  throw new ForbiddenError(
    action,
    (decision as Decision & { allowed: false }).reason,
  )
}

/**
 * Assert that a subject was found, or throw a not-found that does not
 * distinguish "absent" from "in another tenant".
 *
 * Written as an assertion so a query can be written naturally and still fail
 * closed:
 *
 * ```ts
 * const course = await prisma.course.findFirst({ where: { id, academyId } })
 * assertFound('course', course, id)
 * // `course` is now non-null
 * ```
 */
export function assertFound<T>(
  resource: string,
  value: T | null | undefined,
  id: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource, id)
  }
}
