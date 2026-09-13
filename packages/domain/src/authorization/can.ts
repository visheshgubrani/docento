import {
  GRADER_ACTIONS,
  INSTRUCTOR_ACTIONS,
  LEARNER_SELF_ACTIONS,
  OWNER_ONLY_ACTIONS,
  SESSION_ONLY_ACTIONS,
  type Action,
} from './actions.js'
import type { Principal, StaffAssignment } from './principal.js'

/**
 * The single authorization decision point.
 *
 * Every controller, worker, export, and bulk operation calls this. There are no
 * ad-hoc permission checks in routes, because the fastest way for a multi-tenant
 * system to leak data is for a second code path to make a slightly different
 * decision than the first.
 *
 * The function is pure and synchronous, which keeps it cheap, trivially
 * testable, and free of the query-ordering bugs that come from a check which
 * loads its own data.
 *
 * Scoped grants below the workspace level are a *different question* and live in
 * `canViaAssignment`. They are deliberately not folded in here: a caller that
 * wants both must ask both, rather than assuming a role check silently covered
 * an assignment it never saw.
 *
 * See ARCHITECTURE.md, "Authorization".
 */

/** The resource an action is being attempted against. */
export type Resource = {
  workspaceId?: string | null
  academyId?: string | null
  courseId?: string | null
  /** Set when the resource belongs to a specific learner (self-service). */
  learnerId?: string | null
}

export type Decision = { allowed: true } | { allowed: false; reason: string }

const allow = (): Decision => ({ allowed: true })
const deny = (reason: string): Decision => ({ allowed: false, reason })

/**
 * Actions any unauthenticated visitor may perform.
 *
 * Both are reads of data that belongs to nobody: published catalogue entries,
 * and a certificate's public verification view. Everything else requires a
 * principal, and the tests assert that exhaustively rather than by example.
 *
 * Note this is *permission to ask*. What the response may contain is the
 * route's decision — the verification projection carries no learner email and
 * no academy-internal identifiers, because "anyone may verify" is not the same
 * as "anyone may enumerate".
 */
const PUBLIC_ACTIONS: readonly Action[] = ['catalog:read', 'certificate:verify']

/**
 * Which parts of a resource must be identified before an action can be decided.
 *
 * ## Why this table exists
 *
 * `Resource` is all-optional, so nothing stops a caller from writing
 * `can(principal, 'course:update', { courseId })` and omitting the tenant. A
 * containment check written as `if (resource.workspaceId && …)` then silently
 * passes, because there is nothing to compare against — and a sufficiently
 * privileged principal is admitted to another tenant's resource.
 *
 * That was a real bug in this file. The fix is to make the requirement
 * structural rather than a convention the caller has to remember: every action
 * declares what it needs, and a resource missing any of it is refused before any
 * role logic runs. A new action cannot be added without deciding this, because
 * the table is exhaustive over `Action`.
 *
 * `catalog:read` is deliberately empty: public data has no tenant.
 */
export const REQUIRED_RESOURCE_FIELDS: Record<
  Action,
  readonly (keyof Resource)[]
> = {
  // Workspace and team: the workspace is the whole scope.
  'workspace:read': ['workspaceId'],
  'workspace:update': ['workspaceId'],
  'workspace:delete': ['workspaceId'],
  'member:read': ['workspaceId'],
  'member:manage': ['workspaceId'],
  'serviceKey:read': ['workspaceId'],
  'serviceKey:manage': ['workspaceId'],

  // Academy-scoped: a workspace alone is not enough, because every one of these
  // acts on one academy inside it.
  'academy:create': ['workspaceId'],
  'academy:list': ['workspaceId'],
  'academy:read': ['workspaceId', 'academyId'],
  'academy:update': ['workspaceId', 'academyId'],
  'academy:delete': ['workspaceId', 'academyId'],
  'academy:domain:manage': ['workspaceId', 'academyId'],
  'academy:publishableKey:manage': ['workspaceId', 'academyId'],
  'academy:branding:update': ['workspaceId', 'academyId'],

  'course:read': ['workspaceId', 'academyId'],
  'course:create': ['workspaceId', 'academyId'],
  'course:update': ['workspaceId', 'academyId', 'courseId'],
  'course:delete': ['workspaceId', 'academyId', 'courseId'],
  'course:publish': ['workspaceId', 'academyId', 'courseId'],
  'course:copy': ['workspaceId', 'academyId', 'courseId'],

  'enrollment:read': ['workspaceId', 'academyId'],
  'enrollment:manage': ['workspaceId', 'academyId'],

  /**
   * Enrolling needs the course as well as the academy.
   *
   * Without `courseId` this is a permission to enrol in *something*, and a
   * caller that forgot which course would still pass the check. And without
   * `workspaceId` a staff principal from another workspace would pass it too,
   * which is why this is the staff-shaped action and `learner:enroll` is the
   * learner-shaped one — a learner has no workspace to name.
   */
  'enrollment:create': ['workspaceId', 'academyId', 'courseId'],

  // A published release belongs to an academy and identifies a course.
  'release:read': ['academyId', 'courseId'],

  'submission:read': ['workspaceId', 'academyId'],
  'submission:grade': ['workspaceId', 'academyId'],

  'certificate:read': ['workspaceId', 'academyId'],
  /**
   * Issuing names the course as well as the academy.
   *
   * An earlier version required only the academy, which meant a caller could
   * pass an `academyId` and assert nothing about which course the certificate
   * was for. The operation needs the course to recompute completion, so
   * requiring it here keeps the check and the work describing the same thing.
   */
  'certificate:issue': ['workspaceId', 'academyId', 'courseId'],
  'certificate:revoke': ['workspaceId', 'academyId'],

  /**
   * Verification requires nothing.
   *
   * Same reasoning as `catalog:read`, and the only other empty entry: the
   * whole point is that someone with no account can check a certificate. What
   * the response may contain is the route's decision, not containment's — the
   * public projection carries no learner email and no academy-internal ids.
   */
  'certificate:verify': [],

  'media:read': ['workspaceId'],
  'media:upload': ['workspaceId'],
  'media:delete': ['workspaceId'],
  /// Served in the context of an academy, because entitlement is a learner's
  /// enrolment in that academy — not staff membership of the workspace.
  'media:serve': ['academyId'],
  'ai:generate': ['workspaceId'],

  // Learner self-service: both the academy and the learner must be named, or a
  // learner could act on an arbitrary record in their own academy.
  'learner:profile:read': ['academyId', 'learnerId'],
  'learner:profile:update': ['academyId', 'learnerId'],
  'learner:enroll': ['academyId', 'learnerId'],
  'learner:progress:write': ['academyId', 'learnerId'],
  'learner:attempt:write': ['academyId', 'learnerId'],
  'learner:submission:write': ['academyId', 'learnerId'],
  'learner:certificate:read': ['academyId', 'learnerId'],
  'learner:checkout': ['academyId', 'learnerId'],

  // Public data.
  'catalog:read': [],
}

function missingFields(
  resource: Resource,
  required: readonly (keyof Resource)[],
): (keyof Resource)[] {
  return required.filter((field) => {
    const value = resource[field]
    return value === undefined || value === null || value === ''
  })
}

/**
 * Decide whether a principal may perform an action against a resource.
 *
 * Order matters. The resource is first checked for the identifiers the action
 * requires, then tenant containment, and only then role logic — so a
 * sufficiently privileged principal from the wrong tenant is still refused, and
 * a bug in the role table can never widen access across tenants.
 */
export function can(
  principal: Principal,
  action: Action,
  resource: Resource = {},
): Decision {
  // --- The resource must identify itself ---------------------------------
  // Checked before anything else, and before the principal is even considered.
  // A caller that forgot the tenant gets a refusal that says so, rather than a
  // permissive default.
  const missing = missingFields(resource, REQUIRED_RESOURCE_FIELDS[action])

  if (missing.length > 0) {
    return deny(
      `"${action}" requires the resource to identify ${missing.join(
        ' and ',
      )}, and it was not provided. Tenant containment cannot be evaluated without it.`,
    )
  }

  // --- Public data -------------------------------------------------------
  // Published catalogue data belongs to no tenant, so containment is
  // meaningless for it and it is readable by anyone, including anonymous.
  // Checked before the principal so an authenticated caller is not refused for
  // failing a comparison that does not apply.
  if (PUBLIC_ACTIONS.includes(action)) return allow()

  // --- Anonymous ---------------------------------------------------------
  if (principal.kind === 'anonymous') {
    return deny(`"${action}" requires authentication.`)
  }

  // --- Learner -----------------------------------------------------------
  if (principal.kind === 'learner') {
    if (resource.academyId !== principal.academyId) {
      return deny('The resource belongs to a different academy.')
    }

    /**
     * Actions a learner may only take on their own record.
     *
     * `startsWith('learner:')` covers most of them, but `enrollment:create` is
     * named for the resource it touches rather than for the self-service
     * namespace, so it is listed. If this list and `LEARNER_SELF_ACTIONS` ever
     * disagree, the effect is a learner acting on another learner's enrolment,
     * which is why the exception is written out rather than inferred.
     */
    const ownRecordOnly =
      action.startsWith('learner:') || action === 'enrollment:create'

    if (ownRecordOnly && resource.learnerId !== principal.learnerId) {
      return deny('The resource belongs to a different learner.')
    }

    if ((LEARNER_SELF_ACTIONS as readonly Action[]).includes(action)) {
      return allow()
    }

    return deny(`A learner may not perform "${action}".`)
  }

  // --- Service key -------------------------------------------------------
  if (principal.kind === 'serviceKey') {
    if (resource.workspaceId !== principal.workspaceId) {
      return deny('The resource belongs to a different workspace.')
    }

    if (
      principal.academyId &&
      resource.academyId &&
      resource.academyId !== principal.academyId
    ) {
      return deny('This key is restricted to a different academy.')
    }

    // A key never stands in for a person. Anything that changes ownership,
    // money, credentials, or membership requires a real staff session.
    if (SESSION_ONLY_ACTIONS.includes(action)) {
      return deny(
        `"${action}" requires a staff session and cannot be performed with a service key.`,
      )
    }

    if (!principal.scopes.includes(action)) {
      return deny(`This key does not carry the "${action}" scope.`)
    }

    return allow()
  }

  // --- Staff -------------------------------------------------------------
  if (resource.workspaceId !== principal.workspaceId) {
    return deny('The resource belongs to a different workspace.')
  }

  // The owner may do anything within their own workspace.
  if (principal.role === 'owner') return allow()

  // An admin may do anything except the actions reserved to the owner.
  if (principal.role === 'admin') {
    return OWNER_ONLY_ACTIONS.includes(action)
      ? deny(`"${action}" is restricted to the workspace owner.`)
      : allow()
  }

  // Unreachable given StaffRole, but a future role must be decided explicitly
  // rather than falling through to a permissive default.
  return deny(`Unrecognised staff role "${String(principal.role)}".`)
}

/**
 * Decide whether a staff member's *assignments* grant an action.
 *
 * Separate from `can` because it answers a different question. `can` covers what
 * a workspace role permits; this covers the narrower grants that let an
 * instructor author a specific course, or a grader mark it, without giving them
 * the run of the workspace.
 *
 * Applies the same resource requirements as `can`, for the same reason: an
 * academy-scoped assignment compared against an absent `academyId` would match
 * nothing and fail closed, but a course-scoped one compared against an absent
 * `courseId` is a question that should never have been asked.
 */
export function canViaAssignment(
  action: Action,
  resource: Resource,
  assignments: readonly StaffAssignment[] = [],
): Decision {
  const missing = missingFields(resource, REQUIRED_RESOURCE_FIELDS[action])

  if (missing.length > 0) {
    return deny(
      `"${action}" requires the resource to identify ${missing.join(
        ' and ',
      )}, and it was not provided.`,
    )
  }

  const permitted = (role: StaffAssignment['role']): readonly Action[] =>
    role === 'grader' ? GRADER_ACTIONS : INSTRUCTOR_ACTIONS

  for (const assignment of assignments) {
    if (!permitted(assignment.role).includes(action)) continue

    if (assignment.scope === 'course') {
      if (resource.courseId && assignment.courseId === resource.courseId) {
        return allow()
      }
      continue
    }

    if (assignment.scope === 'academy') {
      if (resource.academyId && assignment.academyId === resource.academyId) {
        return allow()
      }
    }
  }

  return deny(`No assignment grants "${action}" on this resource.`)
}
