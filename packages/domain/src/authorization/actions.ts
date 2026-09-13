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
  'billing:read',
  'billing:manage',
  'serviceKey:read',
  'serviceKey:manage',

  // Academy
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

  // Assessment and credentials
  'submission:read',
  'submission:grade',
  'certificate:read',
  'certificate:issue',
  'certificate:revoke',

  // Media and AI
  'media:read',
  'media:upload',
  'media:delete',
  'ai:generate',

  // Learner self-service
  'learner:profile:read',
  'learner:profile:update',
  'learner:enroll',
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
  'billing:manage',
  'serviceKey:manage',
  'member:manage',
]

/** Actions a learner may perform on their own data. */
export const LEARNER_SELF_ACTIONS: readonly Action[] = [
  'learner:profile:read',
  'learner:profile:update',
  'learner:enroll',
  'learner:progress:write',
  'learner:attempt:write',
  'learner:submission:write',
  'learner:certificate:read',
  'learner:checkout',
  'course:read',
  'catalog:read',
  'certificate:read',
]

/**
 * Actions an instructor assignment can grant.
 *
 * Note what is absent: billing, credential issuance, member management, and
 * service keys. Teaching a course is not the same as running the business, and
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
  'billing:manage',
  'serviceKey:manage',
  'member:manage',
]
