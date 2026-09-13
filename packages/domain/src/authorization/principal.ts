/**
 * Who is making a request.
 *
 * One discriminated principal rather than a bag of optional fields on the
 * request. Every authorization decision reads this type, so a route cannot
 * accidentally treat a service key as a user, or a learner as staff — the shape
 * does not allow it.
 *
 * See ARCHITECTURE.md, "Authorization".
 */

export type StaffRole = 'owner' | 'admin'

/** Roles that can be granted below the workspace level. */
export type AssignmentRole = 'instructor' | 'grader'

export type StaffPrincipal = {
  kind: 'staff'
  userId: string
  /**
   * The workspace this request acts in, or `null` when none was chosen.
   *
   * Signing in does not pick a workspace — a staff identity may belong to
   * several, and choosing is the operator's act. So "signed in, no workspace
   * yet" is a first-class state rather than a half-built principal, and the
   * fields below are present exactly when it is.
   *
   * Widening this is safe because every action that needs a workspace declares
   * it in `REQUIRED_RESOURCE_FIELDS`, and `can()` denies when the resource
   * cannot identify one. An operation cannot reach a query on a workspace it
   * does not have, because `can()` refuses it first.
   */
  workspaceId: string | null
  /** The membership in `workspaceId`; null when none is chosen. */
  memberId: string | null
  role: StaffRole | null
}

/**
 * A learner. Always bound to exactly one academy: there is no such thing as a
 * principal that spans academies, which is what makes the isolation guarantee
 * expressible here rather than only in the database.
 */
export type LearnerPrincipal = {
  kind: 'learner'
  learnerId: string
  academyId: string
}

/**
 * A server-to-server credential.
 *
 * Deliberately carries no user identity. A service key never impersonates its
 * creator or the workspace owner; it has scopes, and optionally a single
 * academy it is confined to.
 */
export type ServiceKeyPrincipal = {
  kind: 'serviceKey'
  keyId: string
  workspaceId: string
  /** When set, the key may only act on this academy. */
  academyId: string | null
  scopes: readonly string[]
}

export type AnonymousPrincipal = { kind: 'anonymous' }

export type Principal =
  StaffPrincipal | LearnerPrincipal | ServiceKeyPrincipal | AnonymousPrincipal

/**
 * A scoped grant below the workspace level.
 *
 * Workspace roles cannot express "this instructor may author and grade these
 * two courses", so those grants are assignments rather than roles. Loaded by
 * the caller and passed in, which keeps `can` pure and cheap to test.
 */
export type StaffAssignment = {
  role: AssignmentRole
  scope: 'academy' | 'course'
  academyId: string | null
  courseId: string | null
}
