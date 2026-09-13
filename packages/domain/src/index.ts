/**
 * @docento/domain
 *
 * Business rules, authorization, transactions, and the database schema.
 *
 * Nothing in here talks to HTTP, and nothing in here knows about a frontend.
 * Controllers validate and invoke these operations; workers invoke the same
 * operations. See ARCHITECTURE.md.
 */

// Database
export { prisma } from './db.js'
export type { PrismaClient } from './db.js'

// Authentication realms
export {
  STAFF_AUTH_BASE_PATH,
  STAFF_COOKIE_PREFIX,
  staffAuth,
} from './auth/staff.js'
export type { StaffAuth } from './auth/staff.js'

export {
  LEARNER_AUTH_BASE_PATH,
  LEARNER_COOKIE_PREFIX,
  clearLearnerAuthCache,
  getLearnerAuth,
} from './auth/learner.js'
export type { LearnerAuth } from './auth/learner.js'

export {
  ACADEMY_SCOPED_MODEL_NAMES,
  AcademyScopeError,
  LEARNER_REALM_MODELS,
  academyDatabaseHooks,
  scopeData,
} from './auth/academy-scope.js'

export { createAcademyScopedPrisma } from './auth/academy-prisma.js'

// Authorization
export { can, canViaAssignment } from './authorization/can.js'
export type { Decision, Resource } from './authorization/can.js'
export { ACTIONS } from './authorization/actions.js'
export type { Action } from './authorization/actions.js'
export type {
  AnonymousPrincipal,
  AssignmentRole,
  LearnerPrincipal,
  Principal,
  ServiceKeyPrincipal,
  StaffAssignment,
  StaffPrincipal,
  StaffRole,
} from './authorization/principal.js'

// Rate limiting
export {
  RATE_LIMIT_RULES,
  consumeRateLimit,
  peekRateLimit,
  pruneRateLimits,
  resetRateLimits,
} from './rate-limit/index.js'
export type { RateLimitResult, RateLimitRule } from './rate-limit/index.js'

// Assessment
//
// Pure grading, exported because it is needed outside an attempt lifecycle: a
// results view grades against the attempt's stored snapshot, and an authoring
// preview grades against a draft key without creating an attempt at all.
export {
  QUESTION_TYPES,
  gradeAnswer,
  gradeFromSnapshot,
  scoreAttempt,
} from './assessment/grading.js'
export type {
  AttemptScore,
  GradedAnswer,
  GradingSnapshot,
  QuestionMarking,
  QuestionType,
  QuizMarking,
  SnapshotQuestion,
  SubmittedAnswer,
} from './assessment/grading.js'
