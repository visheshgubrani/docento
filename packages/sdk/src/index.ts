/**
 * `@docento/sdk` — a typed client for the Docento API.
 *
 * Licensed Apache-2.0, like `@docento/contracts`, so it can be embedded in
 * proprietary software. It must never import from the AGPL-3.0 application or
 * domain packages; `pnpm boundaries` fails the build if it does. See
 * docs/adr/0006-licensing-boundary.md.
 *
 * ```ts
 * const api = new DocentoApi({ baseUrl: 'https://api.example.com' })
 *
 * // Public reads need no credential.
 * const { courses } = await api.listCatalogCourses(academyId)
 *
 * // A learner's own data, with their session.
 * const mine = new DocentoApi({ baseUrl, learnerToken, credentials: 'include' })
 * const { courses: enrolled } = await mine.listLearnerCourses()
 *
 * // In a browser talking to its own origin through a rewrite, the base URL is
 * // the empty string: requests stay on the page's origin, so the session cookie
 * // is first-party.
 * const sameOrigin = new DocentoApi({ baseUrl: '', credentials: 'include' })
 * ```
 */

export {
  DocentoApi,
  IMPLEMENTED_OPERATIONS,
  STREAMING_OPERATIONS,
  UNIMPLEMENTED_OPERATIONS,
  IDEMPOTENCY_HEADER,
  OPERATION_NAMES,
} from './client'
export type { OperationName, OperationOutput } from './client'

export { DocentoApiError, DocentoTransportError, DocentoClient } from './http'
export type { DocentoClientOptions } from './http'

// Re-exported so a consumer needs one dependency rather than two. The shapes
// are the API's, and a client that defined its own would be a second
// description of the same thing.
export type {
  AcademySummary,
  AuthorAssignment,
  AuthorQuiz,
  AuthorQuizQuestion,
  AuthorQuizSection,
  CatalogCourse,
  Certificate,
  CourseSummary,
  EnrollmentSummary,
  ErrorCode,
  LearnerCourse,
  LearnerLesson,
  LearnerModule,
  LessonSummary,
  MediaAsset,
  ModuleSummary,
  OutlineLesson,
  OutlineModule,
  ProgressSummary,
  PublicCertificate,
  PublicQuiz,
  QuizAttemptResult,
  QuizAttemptSummary,
  ReleaseSummary,
  SubmissionSummary,
  WorkspaceSummary,
} from '@docento/contracts'
export {
  API_MOUNT,
  ERROR_CODES,
  apiErrorSchema,
  apiFailureSchema,
  apiResponseSchema,
} from '@docento/contracts'
