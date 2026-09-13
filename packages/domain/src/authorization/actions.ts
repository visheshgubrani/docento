/**
 * The actions an authorization decision can be asked about.
 *
 * Kept as an explicit list rather than free-form strings so a typo in a route is
 * a compile error instead of a permission that silently never matches.
 */
export const ACTIONS = [
  // Workspace and team
  'workspace:read',
  'workspace:update',
  'workspace:delete',
  'member:read',
  'member:manage',
  'serviceKey:read',
  'serviceKey:manage',

  // Academy
  /**
   * Creating an academy is a workspace-scoped decision.
   *
   * There is no academy yet to name, so `academy:update` cannot express it —
   * that action requires an `academyId`, and passing the workspace id in its
   * place (as an earlier draft of `createAcademy` did) satisfies the shape
   * check while checking nothing at all.
   */
  'academy:create',
  /// Listing is workspace-scoped: there is no academy to name before the list
  /// exists. Reading one academy is a different question with a different
  /// answer, so it is a different action.
  'academy:list',
  'academy:read',
  'academy:update',
  'academy:delete',
  'academy:domain:manage',
  'academy:publishableKey:manage',
  'academy:branding:update',

  // Catalogue and content
  'course:read',
  'course:create',
  'course:update',
  'course:delete',
  'course:publish',
  'course:copy',
  'enrollment:read',
  'enrollment:manage',
  /**
   * Creating the enrolment, as distinct from managing someone else's.
   *
   * Enrolling in a course is the one write a learner performs on their own
   * behalf before they have any progress to point at, so it is not expressible
   * as `learner:*` — there is no learner-owned resource yet to check against.
   * It is granted to a learner acting in their own academy, and to staff
   * enrolling someone else.
   */
  'enrollment:create',
  /// Reading a published release: the learner-facing view of a course.
  'release:read',

  // Assessment and credentials
  'submission:read',
  'submission:grade',
  'certificate:read',
  'certificate:issue',
  'certificate:revoke',
  /**
   * Public verification of an issued certificate.
   *
   * The only action besides `catalog:read` that an unauthenticated visitor may
   * perform. It is deliberately an action rather than an unguarded route: the
   * public view returns a minimal projection, and that projection is a decision
   * `can()` should be seen making.
   */
  'certificate:verify',

  // Media and AI
  'media:read',
  'media:upload',
  'media:delete',
  /// Serving the bytes. Separate from `media:read` because entitlement is
  /// re-checked when a file is fetched, not when a URL is handed out.
  'media:serve',
  'ai:generate',

  // Learner self-service
  'learner:profile:read',
  'learner:profile:update',
  'learner:enroll',
  // `enrollment:create` and `release:read` are declared above, in the staff
  // grouping. Listing them twice would widen nothing — a union dedupes — but
  // this list is read as the inventory of actions, and an inventory that
  // repeats itself is one nobody can count.
  'learner:progress:write',
  'learner:attempt:write',
  'learner:submission:write',
  'learner:certificate:read',
  'learner:checkout',

  // Public
  'catalog:read',
] as const

export type Action = (typeof ACTIONS)[number]

/** Actions that require a real staff session and can never be performed with a key. */
export const SESSION_ONLY_ACTIONS: readonly Action[] = [
  'workspace:delete',
  'serviceKey:manage',
  'member:manage',
]

/** Actions a learner may perform on their own data. */
export const LEARNER_SELF_ACTIONS: readonly Action[] = [
  'learner:profile:read',
  'learner:profile:update',
  'learner:enroll',
  /**
   * Enrolling and reading a release are named for the resources they touch
   * rather than for the self-service namespace, so they are listed rather than
   * matched by a prefix. Both are actions a learner takes on their *own* behalf,
   * which is why `can()` pairs this list with an owner check on `learnerId`.
   */
  'enrollment:create',
  'release:read',
  'learner:progress:write',
  'learner:attempt:write',
  'learner:submission:write',
  'learner:certificate:read',
  'learner:checkout',
  'course:read',
  'catalog:read',
  'certificate:read',
  'media:serve',
]

/**
 * Actions an instructor assignment can grant.
 *
 * Note what is absent: credential issuance, member management, and service
 * keys. Teaching a course is not the same as running the business, and
 * the two must not be conflated by an assignment.
 */
export const INSTRUCTOR_ACTIONS: readonly Action[] = [
  'course:read',
  'course:create',
  'course:update',
  'course:publish',
  'course:copy',
  'enrollment:read',
  'submission:read',
  'media:read',
  'media:upload',
  'ai:generate',
]

/** Actions a grader assignment can grant. Deliberately narrower than instructor. */
export const GRADER_ACTIONS: readonly Action[] = [
  'course:read',
  'enrollment:read',
  'submission:read',
  'submission:grade',
]

/** Actions an admin may not perform, even though they are not the owner. */
export const OWNER_ONLY_ACTIONS: readonly Action[] = [
  'workspace:delete',
  'serviceKey:manage',
  'member:manage',
]
