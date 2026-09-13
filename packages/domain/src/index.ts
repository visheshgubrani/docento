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
export { prisma } from './db'
export type { PrismaClient } from './db'

// Authentication realms
export {
  STAFF_AUTH_BASE_PATH,
  STAFF_COOKIE_PREFIX,
  staffAuth,
} from './auth/staff'
export type { StaffAuth } from './auth/staff'

export {
  LEARNER_AUTH_BASE_PATH,
  LEARNER_COOKIE_PREFIX,
  clearLearnerAuthCache,
  getLearnerAuth,
} from './auth/learner'
export type { LearnerAuth } from './auth/learner'

export {
  ACADEMY_SCOPED_MODEL_NAMES,
  AcademyScopeError,
  LEARNER_REALM_MODELS,
  academyDatabaseHooks,
  scopeData,
} from './auth/academy-scope'

export { createAcademyScopedPrisma } from './auth/academy-prisma'

// Authorization
export { can, canViaAssignment } from './authorization/can'
export type { Decision, Resource } from './authorization/can'
export { ACTIONS } from './authorization/actions'
export type { Action } from './authorization/actions'
export type {
  AnonymousPrincipal,
  AssignmentRole,
  LearnerPrincipal,
  Principal,
  ServiceKeyPrincipal,
  StaffAssignment,
  StaffPrincipal,
  StaffRole,
} from './authorization/principal'

// Rate limiting
export {
  RATE_LIMIT_RULES,
  consumeRateLimit,
  peekRateLimit,
  pruneRateLimits,
  resetRateLimits,
} from './rate-limit/index'
export type { RateLimitResult, RateLimitRule } from './rate-limit/index'

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
} from './assessment/grading'
export type {
  AttemptScore,
  GradedAnswer,
  GradingSnapshot,
  QuestionMarking,
  QuestionType,
  QuizMarking,
  SnapshotQuestion,
  SubmittedAnswer,
} from './assessment/grading'
export {
  ForbiddenAccess,
  getQuizForLearner,
  listAttempts,
  startAttempt,
  submitAttempt,
  upsertQuestion,
  upsertQuiz,
  upsertSection,
} from './assessment/attempts'
export type {
  AttemptResult,
  AttemptSummary,
  LearnerQuizView,
} from './assessment/attempts'
export {
  getAssignmentForLearner,
  gradeSubmission,
  listSubmissions,
  submitAssignment,
  upsertAssignment,
} from './assessment/assignments'
export type {
  AssignmentSummary,
  SubmissionSummary,
} from './assessment/assignments'

// Tenancy
//
// `resolveAcademy` is exported as prominently as the management operations
// because it is the security boundary every request crosses, not a helper.
export {
  RESERVED_SLUGS,
  SLUG_PATTERN,
  assertAcademy,
  normaliseHostname,
  normaliseSlug,
  resolveAcademy,
  validateSlug,
} from './tenancy/resolve-academy'
export type {
  AcademyResolution,
  AcademyResolutionFailure,
  ResolveAcademyInput,
  ResolvedAcademy,
} from './tenancy/resolve-academy'
export {
  addAcademyDomain,
  createAcademy,
  createPublishableKey,
  createWorkspace,
  getAcademy,
  getWorkspace,
  listAcademies,
  listAcademyDomains,
  listPublishableKeys,
  revokePublishableKey,
  updateAcademy,
  updateWorkspace,
  verifyAcademyDomain,
} from './tenancy/academies'
export { ACADEMY_AUTH_MODES, readAcademyIdentity } from './tenancy/academies'
export type {
  AcademyAuthMode,
  AcademySummary,
  WorkspaceSummary,
} from './tenancy/academies'
export {
  createServiceKey,
  hashKey,
  listServiceKeys,
  listWorkspacesForPrincipal,
  resolveServiceKey,
  revokeServiceKey,
  touchServiceKey,
} from './tenancy/service-keys'
export type {
  ServiceKeySummary,
  WorkspaceMembership,
} from './tenancy/service-keys'

// Session
export { getStaffIdentity } from './tenancy/session'
export type { StaffIdentity, StaffSessionWorkspace } from './tenancy/session'

// Content
export {
  LESSON_CONTENT_TYPES,
  archiveCourse,
  createCourse,
  createLesson,
  createModule,
  deleteDraftLesson,
  deleteModule,
  getCourse,
  getLesson,
  listCourses,
  reorderLessons,
  reorderModules,
  updateCourse,
  updateLesson,
  updateModule,
} from './content/drafts'
export type {
  CourseSummary,
  LessonContentType,
  LessonSummary,
  ModuleSummary,
} from './content/drafts'
export {
  buildReleaseSnapshot,
  getRelease,
  gradingSnapshotFrom,
  publishCourse,
} from './content/publishing'
export type {
  ReleaseSnapshot,
  ReleaseSummary,
  SnapshotLesson,
  SnapshotModule,
  SnapshotQuiz,
} from './content/publishing'
export {
  getPublicAcademy,
  getPublicCourse,
  getPublicOutline,
  listDraftModules,
  listPublicCourses,
} from './content/catalog'
export type {
  CatalogCourse,
  PublicAcademy,
  PublicOutlineLesson,
  PublicOutlineModule,
} from './content/catalog'

// Learning
export {
  completeLesson,
  enroll,
  getCourseForLearner,
  getLearnerProfile,
  getCourseProgress,
  grantAccess,
  hasAccess,
  listLearnerCourses,
  listEnrollments,
  recordProgress,
  revokeAccess,
} from './learning/enrollment'
export type {
  CourseProgress,
  EnrollmentSummary,
  LearnerLesson,
  LearnerModule,
  LessonProgressSummary,
} from './learning/enrollment'
export {
  generateVerificationId,
  getCertificate,
  issueCertificate,
  listLearnerCertificates,
  revokeCertificate,
  verifyCertificate,
} from './learning/certificates'
export type {
  CertificateSummary,
  CompletionEvidence,
  PublicCertificateView,
} from './learning/certificates'

// Errors
//
// Exported because the transport layer maps them to status codes and error
// codes, and a layer that has to guess at an error's type ends up inspecting
// messages.
export {
  ConflictError,
  DomainRuleError,
  ForbiddenError,
  NotFoundError,
  assertCan,
  assertFound,
} from './shared/errors'
