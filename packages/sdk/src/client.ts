import {
  type Branding,
  type OperationName,
  type OperationOutput,
  IDEMPOTENCY_HEADER,
  OPERATION_NAMES,
} from '@docento/contracts'

import { DocentoClient } from './http'

/**
 * The typed client.
 *
 * One method per operation in the registry, and `__tests__/completeness.test.ts`
 * fails if the two lists disagree in either direction — an operation with no
 * method is an endpoint an integrator cannot call, and a method naming an
 * operation that does not exist is a client that compiles and then 404s.
 *
 * ## Why methods rather than one generic `call`
 *
 * `client.call('course.publish', { params })` works and is available. The
 * methods exist because a typed signature is discoverable: an editor offers
 * `publishCourse` and shows that it needs a workspace, an academy and a course,
 * whereas a string-keyed call requires the caller to read the registry. It is
 * also where parameter *names* stop being a flat dictionary the caller has to
 * build.
 *
 * ## Bodies versus parameters
 *
 * Path parameters are positional, because a call without them is meaningless and
 * the compiler should say so. Everything else — query, body, idempotency key —
 * is a single trailing object, because optionality is the common case and a
 * signature with eight optional positional parameters is unusable.
 *
 * ## The idempotency key is a required parameter
 *
 * Not defaulted, and not generated. A key the client invents per call is a
 * random string rather than an idempotency key: the caller knows what a retry
 * is — a user pressing a button twice, a queue redelivering a message — and the
 * client does not. A `@ts-expect-error` test asserts that omitting it fails to
 * compile.
 *
 * ## Why this file is hand-written
 *
 * It is generated in shape but not in fact: every method is a few lines that
 * delegate to `call`. Generating them would mean adding a code generator to the
 * build to save those lines, and what actually matters is that drift is
 * *detected* — which the `satisfies` clause and the completeness test do.
 */

/**
 * What to call this request in an error message.
 *
 * A caller who wrote `api.listLearnerCourses()` should not be told that
 * `learner.courses` failed: the registry name is an internal coordinate, and
 * translating it back is work the client can do for them.
 */
const describe = (method: string) => ({ describeAs: method })

export class DocentoApi extends DocentoClient {
  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  health() {
    return this.call('health', {}, describe('health'))
  }

  // -------------------------------------------------------------------------
  // Session
  // -------------------------------------------------------------------------

  /**
   * Who the caller is, and where they may act.
   *
   * The one staff operation callable before a workspace has been chosen, which
   * is why it exists: without it an application has to read the session cookie
   * itself to know whether to draw a sign-in page, and that is a second
   * implementation of session validation.
   */
  getStaffSession() {
    return this.call('staff.session', {}, describe('getStaffSession'))
  }

  // -------------------------------------------------------------------------
  // Media
  // -------------------------------------------------------------------------

  createMedia(
    workspaceId: string,
    academyId: string,
    input: {
      filename: string
      mimeType: string
      sizeBytes?: number | null
      title?: string | null
    },
  ) {
    return this.call(
      'media.create',
      { params: { workspaceId, academyId }, body: input },
      describe('createMedia'),
    )
  }

  completeMedia(
    workspaceId: string,
    academyId: string,
    assetId: string,
    input: { sizeBytes?: number | null } = {},
  ) {
    return this.call(
      'media.complete',
      { params: { workspaceId, academyId, assetId }, body: input },
      describe('completeMedia'),
    )
  }

  listMedia(
    workspaceId: string,
    academyId: string,
    query: { limit?: number } = {},
  ) {
    return this.call(
      'media.list',
      { params: { workspaceId, academyId }, query },
      describe('listMedia'),
    )
  }

  deleteMedia(workspaceId: string, academyId: string, assetId: string) {
    return this.call(
      'media.delete',
      { params: { workspaceId, academyId, assetId } },
      describe('deleteMedia'),
    )
  }

  // -------------------------------------------------------------------------
  // Workspace
  // -------------------------------------------------------------------------

  listWorkspaces() {
    return this.call('workspace.list', {}, describe('listWorkspaces'))
  }

  getWorkspace(workspaceId: string) {
    return this.call(
      'workspace.get',
      { params: { workspaceId } },
      describe('getWorkspace'),
    )
  }

  updateWorkspace(
    workspaceId: string,
    body: { name?: string; logo?: string | null },
  ) {
    return this.call(
      'workspace.update',
      { params: { workspaceId }, body },
      describe('updateWorkspace'),
    )
  }

  // -------------------------------------------------------------------------
  // Academy
  // -------------------------------------------------------------------------

  listAcademies(workspaceId: string) {
    return this.call(
      'academy.list',
      { params: { workspaceId } },
      describe('listAcademies'),
    )
  }

  createAcademy(
    workspaceId: string,
    body: {
      name: string
      slug: string
      authMode?: 'MANAGED' | 'DELEGATED' | 'HYBRID'
    },
    idempotencyKey: string,
  ) {
    return this.call(
      'academy.create',
      { params: { workspaceId }, body },
      { idempotencyKey, ...describe('createAcademy') },
    )
  }

  getAcademy(workspaceId: string, academyId: string) {
    return this.call(
      'academy.get',
      { params: { workspaceId, academyId } },
      describe('getAcademy'),
    )
  }

  updateAcademy(
    workspaceId: string,
    academyId: string,
    body: {
      name?: string
      logo?: string | null
      authMode?: 'MANAGED' | 'DELEGATED' | 'HYBRID'
      branding?: Branding | null
    },
  ) {
    return this.call(
      'academy.update',
      { params: { workspaceId, academyId }, body },
      describe('updateAcademy'),
    )
  }

  // -------------------------------------------------------------------------
  // Course authoring
  // -------------------------------------------------------------------------

  listCourses(
    workspaceId: string,
    academyId: string,
    query: { status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } = {},
  ) {
    return this.call(
      'course.list',
      { params: { workspaceId, academyId }, query },
      describe('listCourses'),
    )
  }

  createCourse(
    workspaceId: string,
    academyId: string,
    body: { title: string; slug: string; description?: string | null },
    idempotencyKey: string,
  ) {
    return this.call(
      'course.create',
      { params: { workspaceId, academyId }, body },
      { idempotencyKey, ...describe('createCourse') },
    )
  }

  getCourse(workspaceId: string, academyId: string, courseId: string) {
    return this.call(
      'course.get',
      { params: { workspaceId, academyId, courseId } },
      describe('getCourse'),
    )
  }

  updateCourse(
    workspaceId: string,
    academyId: string,
    courseId: string,
    body: {
      title?: string
      description?: string | null
      thumbnail?: string | null
    },
  ) {
    return this.call(
      'course.update',
      { params: { workspaceId, academyId, courseId }, body },
      describe('updateCourse'),
    )
  }

  archiveCourse(workspaceId: string, academyId: string, courseId: string) {
    return this.call(
      'course.archive',
      { params: { workspaceId, academyId, courseId }, body: {} },
      describe('archiveCourse'),
    )
  }

  publishCourse(
    workspaceId: string,
    academyId: string,
    courseId: string,
    idempotencyKey: string,
  ) {
    return this.call(
      'course.publish',
      { params: { workspaceId, academyId, courseId }, body: {} },
      { idempotencyKey, ...describe('publishCourse') },
    )
  }

  getRelease(
    workspaceId: string,
    academyId: string,
    courseId: string,
    version: number,
  ) {
    return this.call(
      'course.release',
      {
        params: { workspaceId, academyId, courseId, version: String(version) },
      },
      describe('getRelease'),
    )
  }

  // -------------------------------------------------------------------------
  // Modules and lessons
  // -------------------------------------------------------------------------

  createModule(
    workspaceId: string,
    academyId: string,
    courseId: string,
    body: { title: string; summary?: string | null },
    idempotencyKey: string,
  ) {
    return this.call(
      'module.create',
      { params: { workspaceId, academyId, courseId }, body },
      { idempotencyKey, ...describe('createModule') },
    )
  }

  updateModule(
    workspaceId: string,
    academyId: string,
    courseId: string,
    moduleId: string,
    body: { title?: string; summary?: string | null },
  ) {
    return this.call(
      'module.update',
      { params: { workspaceId, academyId, courseId, moduleId }, body },
      describe('updateModule'),
    )
  }

  reorderModules(
    workspaceId: string,
    academyId: string,
    courseId: string,
    order: string[],
  ) {
    return this.call(
      'module.reorder',
      { params: { workspaceId, academyId, courseId }, body: { order } },
      describe('reorderModules'),
    )
  }

  deleteModule(
    workspaceId: string,
    academyId: string,
    courseId: string,
    moduleId: string,
  ) {
    return this.call(
      'module.delete',
      { params: { workspaceId, academyId, courseId, moduleId } },
      describe('deleteModule'),
    )
  }

  getLesson(
    workspaceId: string,
    academyId: string,
    courseId: string,
    lessonId: string,
  ) {
    return this.call(
      'lesson.get',
      { params: { workspaceId, academyId, courseId, lessonId } },
      describe('getLesson'),
    )
  }

  createLesson(
    workspaceId: string,
    academyId: string,
    courseId: string,
    moduleId: string,
    body: {
      title: string
      contentType: 'VIDEO' | 'TEXT' | 'FILE' | 'QUIZ' | 'ASSIGNMENT' | 'EMBED'
      summary?: string | null
      isFree?: boolean
      body?: string | null
      embedUrl?: string | null
      mediaAssetId?: string | null
    },
    idempotencyKey: string,
  ) {
    return this.call(
      'lesson.create',
      { params: { workspaceId, academyId, courseId, moduleId }, body },
      { idempotencyKey, ...describe('createLesson') },
    )
  }

  updateLesson(
    workspaceId: string,
    academyId: string,
    courseId: string,
    lessonId: string,
    body: {
      title?: string
      summary?: string | null
      isFree?: boolean
      body?: string | null
      embedUrl?: string | null
      mediaAssetId?: string | null
    },
  ) {
    return this.call(
      'lesson.update',
      { params: { workspaceId, academyId, courseId, lessonId }, body },
      describe('updateLesson'),
    )
  }

  reorderLessons(
    workspaceId: string,
    academyId: string,
    courseId: string,
    moduleId: string,
    order: string[],
  ) {
    return this.call(
      'lesson.reorder',
      {
        params: { workspaceId, academyId, courseId, moduleId },
        body: { order },
      },
      describe('reorderLessons'),
    )
  }

  deleteLesson(
    workspaceId: string,
    academyId: string,
    courseId: string,
    lessonId: string,
  ) {
    return this.call(
      'lesson.delete',
      { params: { workspaceId, academyId, courseId, lessonId } },
      describe('deleteLesson'),
    )
  }

  // -------------------------------------------------------------------------
  // Quiz authoring
  // -------------------------------------------------------------------------

  upsertQuiz(
    workspaceId: string,
    academyId: string,
    courseId: string,
    lessonId: string,
    body: {
      title: string
      description?: string | null
      passingPercent?: number
      maxAttempts?: number | null
      timeLimitMinutes?: number | null
      opensAt?: Date | null
      closesAt?: Date | null
      isMockTest?: boolean
      negativeMarking?: boolean
      defaultNegativeMark?: number | null
    },
  ) {
    return this.call(
      'quiz.upsert',
      { params: { workspaceId, academyId, courseId, lessonId }, body },
      describe('upsertQuiz'),
    )
  }

  upsertQuizSection(
    workspaceId: string,
    academyId: string,
    courseId: string,
    quizId: string,
    body: { title: string; sectionId?: string },
  ) {
    return this.call(
      'quiz.section.upsert',
      { params: { workspaceId, academyId, courseId, quizId }, body },
      describe('upsertQuizSection'),
    )
  }

  upsertQuestion(
    workspaceId: string,
    academyId: string,
    courseId: string,
    quizId: string,
    body: {
      questionId?: string
      prompt: string
      questionType:
        | 'MULTIPLE_CHOICE'
        | 'MULTI_SELECT'
        | 'TRUE_FALSE'
        | 'SHORT_ANSWER'
        | 'INTEGER'
      options?: string[]
      correctAnswer: string
      correctAnswers?: string[]
      explanation?: string | null
      points?: number
      negativePoints?: number
      partialMarking?: boolean
      sectionId?: string | null
    },
  ) {
    return this.call(
      'quiz.question.upsert',
      { params: { workspaceId, academyId, courseId, quizId }, body },
      describe('upsertQuestion'),
    )
  }

  getQuizGradebook(
    workspaceId: string,
    academyId: string,
    courseId: string,
    lessonId: string,
  ) {
    return this.call(
      'quiz.gradebook',
      { params: { workspaceId, academyId, courseId, lessonId } },
      describe('getQuizGradebook'),
    )
  }

  // -------------------------------------------------------------------------
  // Assignments and grading
  // -------------------------------------------------------------------------

  upsertAssignment(
    workspaceId: string,
    academyId: string,
    courseId: string,
    lessonId: string,
    body: {
      title: string
      instructions?: string | null
      dueAt?: Date | null
      totalPoints?: number
    },
  ) {
    return this.call(
      'assignment.upsert',
      { params: { workspaceId, academyId, courseId, lessonId }, body },
      describe('upsertAssignment'),
    )
  }

  listSubmissions(
    workspaceId: string,
    academyId: string,
    courseId: string,
    lessonId: string,
    query: { status?: 'graded' | 'ungraded' } = {},
  ) {
    return this.call(
      'assignment.submissions',
      { params: { workspaceId, academyId, courseId, lessonId }, query },
      describe('listSubmissions'),
    )
  }

  gradeSubmission(
    workspaceId: string,
    academyId: string,
    submissionId: string,
    body: { grade: number; feedback?: string | null },
  ) {
    return this.call(
      'submission.grade',
      { params: { workspaceId, academyId, submissionId }, body },
      describe('gradeSubmission'),
    )
  }

  // -------------------------------------------------------------------------
  // Public catalogue
  // -------------------------------------------------------------------------

  /**
   * Which academy this request is about, by host or slug.
   *
   * No credential: a visitor browsing before signing in still needs to know
   * whose catalogue they are looking at.
   */
  resolveAcademy() {
    return this.call('academy.resolve', {}, describe('resolveAcademy'))
  }

  getCatalogAcademy(academyId: string) {
    return this.call(
      'catalog.academy',
      { params: { academyId } },
      describe('getCatalogAcademy'),
    )
  }

  listCatalogCourses(
    academyId: string,
    query: { limit?: number; cursor?: string } = {},
  ) {
    return this.call(
      'catalog.courses',
      { params: { academyId }, query },
      describe('listCatalogCourses'),
    )
  }

  getCatalogCourse(academyId: string, courseId: string) {
    return this.call(
      'catalog.course',
      { params: { academyId, courseId } },
      describe('getCatalogCourse'),
    )
  }

  /** No credential needed, and no session required. */
  verifyCertificate(verificationId: string) {
    return this.call(
      'certificate.verify',
      { params: { verificationId } },
      describe('verifyCertificate'),
    )
  }

  // -------------------------------------------------------------------------
  // Learner
  // -------------------------------------------------------------------------

  /**
   * Who the caller is.
   *
   * The session gate calls this rather than validating a cookie: the cookie is
   * opaque and the session row belongs to the API.
   */
  getLearnerSession() {
    return this.call('learner.session', {}, describe('getLearnerSession'))
  }

  listLearnerCourses() {
    return this.call('learner.courses', {}, describe('listLearnerCourses'))
  }

  enrollInCourse(courseId: string, idempotencyKey: string) {
    return this.call(
      'learner.enroll',
      { params: { courseId }, body: {} },
      { idempotencyKey, ...describe('enrollInCourse') },
    )
  }

  getLearnerCourse(courseId: string) {
    return this.call(
      'learner.course',
      { params: { courseId } },
      describe('getLearnerCourse'),
    )
  }

  getLearnerProgress(courseId: string) {
    return this.call(
      'learner.progress',
      { params: { courseId } },
      describe('getLearnerProgress'),
    )
  }

  recordProgress(
    lessonId: string,
    body: { positionSeconds?: number; watchedSeconds?: number },
  ) {
    return this.call(
      'learner.progress.record',
      { params: { lessonId }, body },
      describe('recordProgress'),
    )
  }

  completeLesson(lessonId: string, idempotencyKey: string) {
    return this.call(
      'learner.lesson.complete',
      { params: { lessonId }, body: {} },
      { idempotencyKey, ...describe('completeLesson') },
    )
  }

  getLearnerQuiz(lessonId: string) {
    return this.call(
      'learner.quiz',
      { params: { lessonId } },
      describe('getLearnerQuiz'),
    )
  }

  startQuizAttempt(lessonId: string, idempotencyKey: string) {
    return this.call(
      'learner.quiz.start',
      { params: { lessonId }, body: {} },
      { idempotencyKey, ...describe('startQuizAttempt') },
    )
  }

  submitQuizAttempt(
    attemptId: string,
    answers: {
      questionId: string
      answer?: string | null
      answers?: string[]
    }[],
    idempotencyKey: string,
  ) {
    return this.call(
      'learner.quiz.submit',
      { params: { attemptId }, body: { answers } },
      { idempotencyKey, ...describe('submitQuizAttempt') },
    )
  }

  getQuizHistory(lessonId: string) {
    return this.call(
      'learner.quiz.history',
      { params: { lessonId } },
      describe('getQuizHistory'),
    )
  }

  getLearnerAssignment(lessonId: string) {
    return this.call(
      'learner.assignment',
      { params: { lessonId } },
      describe('getLearnerAssignment'),
    )
  }

  submitAssignment(
    lessonId: string,
    body: { content?: string | null; fileUrl?: string | null },
    idempotencyKey: string,
  ) {
    return this.call(
      'learner.assignment.submit',
      { params: { lessonId }, body },
      { idempotencyKey, ...describe('submitAssignment') },
    )
  }

  listLearnerCertificates() {
    return this.call(
      'learner.certificates',
      {},
      describe('listLearnerCertificates'),
    )
  }

  requestCertificate(courseId: string, idempotencyKey: string) {
    return this.call(
      'learner.certificate.issue',
      { params: { courseId }, body: {} },
      { idempotencyKey, ...describe('requestCertificate') },
    )
  }

  // -------------------------------------------------------------------------
  // Media and service keys
  // -------------------------------------------------------------------------

  listServiceKeys(workspaceId: string) {
    return this.call(
      'serviceKey.list',
      { params: { workspaceId } },
      describe('listServiceKeys'),
    )
  }

  createServiceKey(
    workspaceId: string,
    body: {
      name: string
      scopes: string[]
      academyId?: string | null
      expiresAt?: Date | null
    },
  ) {
    return this.call(
      'serviceKey.create',
      { params: { workspaceId }, body },
      describe('createServiceKey'),
    )
  }

  revokeServiceKey(workspaceId: string, keyId: string) {
    return this.call(
      'serviceKey.revoke',
      { params: { workspaceId, keyId } },
      describe('revokeServiceKey'),
    )
  }
}

/**
 * Operations a JSON client cannot meaningfully perform.
 *
 * Empty today, and kept because the category is the point: when media serving
 * arrives it returns asset bytes with a `Content-Range` rather than an envelope,
 * and wrapping that would either buffer a video into memory or hand back a
 * `Response` that pretends to follow the same contract as every other call. The
 * completeness test knows the difference between an operation deliberately not
 * wrapped and one somebody forgot.
 */
export const STREAMING_OPERATIONS = [] as const

/**
 * Which method implements which operation.
 *
 * A literal map rather than something derived from the prototype, because the
 * `satisfies` clause below is what makes the compiler prove a method exists for
 * every operation. Deriving it at runtime would prove nothing at build time. The
 * completeness test additionally checks that each named method is callable on
 * the class, which `satisfies` alone cannot — it checks the *name* is a key of
 * the class, not that the property is a function.
 */
export const IMPLEMENTED_OPERATIONS = {
  health: 'health',
  'workspace.list': 'listWorkspaces',
  'workspace.get': 'getWorkspace',
  'workspace.update': 'updateWorkspace',
  'academy.list': 'listAcademies',
  'academy.create': 'createAcademy',
  'academy.get': 'getAcademy',
  'academy.update': 'updateAcademy',
  'course.list': 'listCourses',
  'course.create': 'createCourse',
  'course.get': 'getCourse',
  'course.update': 'updateCourse',
  'course.archive': 'archiveCourse',
  'course.publish': 'publishCourse',
  'course.release': 'getRelease',
  'staff.session': 'getStaffSession',
  'media.create': 'createMedia',
  'media.complete': 'completeMedia',
  'media.list': 'listMedia',
  'media.delete': 'deleteMedia',
  'module.create': 'createModule',
  'module.update': 'updateModule',
  'module.reorder': 'reorderModules',
  'module.delete': 'deleteModule',
  'lesson.get': 'getLesson',
  'lesson.create': 'createLesson',
  'lesson.update': 'updateLesson',
  'lesson.reorder': 'reorderLessons',
  'lesson.delete': 'deleteLesson',
  'quiz.upsert': 'upsertQuiz',
  'quiz.section.upsert': 'upsertQuizSection',
  'quiz.question.upsert': 'upsertQuestion',
  'quiz.gradebook': 'getQuizGradebook',
  'assignment.upsert': 'upsertAssignment',
  'assignment.submissions': 'listSubmissions',
  'submission.grade': 'gradeSubmission',
  'academy.resolve': 'resolveAcademy',
  'catalog.academy': 'getCatalogAcademy',
  'catalog.courses': 'listCatalogCourses',
  'catalog.course': 'getCatalogCourse',
  'certificate.verify': 'verifyCertificate',
  'learner.session': 'getLearnerSession',
  'learner.courses': 'listLearnerCourses',
  'learner.enroll': 'enrollInCourse',
  'learner.course': 'getLearnerCourse',
  'learner.progress': 'getLearnerProgress',
  'learner.progress.record': 'recordProgress',
  'learner.lesson.complete': 'completeLesson',
  'learner.quiz': 'getLearnerQuiz',
  'learner.quiz.start': 'startQuizAttempt',
  'learner.quiz.submit': 'submitQuizAttempt',
  'learner.quiz.history': 'getQuizHistory',
  'learner.assignment': 'getLearnerAssignment',
  'learner.assignment.submit': 'submitAssignment',
  'learner.certificates': 'listLearnerCertificates',
  'learner.certificate.issue': 'requestCertificate',
  'serviceKey.list': 'listServiceKeys',
  'serviceKey.create': 'createServiceKey',
  'serviceKey.revoke': 'revokeServiceKey',
} as const satisfies Record<OperationName, keyof DocentoApi>

/**
 * Registry operations this client does not implement.
 *
 * Should be exactly `STREAMING_OPERATIONS`; the completeness test asserts it.
 * Exported so a caller can tell "not implemented yet" from "not in the API".
 */
export const UNIMPLEMENTED_OPERATIONS = OPERATION_NAMES.filter(
  (name) => !(name in IMPLEMENTED_OPERATIONS),
)

export { IDEMPOTENCY_HEADER, OPERATION_NAMES }
export type { OperationName, OperationOutput }
