import { z } from 'zod'

import {
  academySummarySchema,
  brandingSchema,
  catalogCourseSchema,
  courseSummarySchema,
  dateSchema,
  enrollmentSummarySchema,
  learnerCourseSchema,
  learnerModuleSchema,
  lessonSummarySchema,
  mediaAssetSchema,
  moduleSummarySchema,
  progressSummarySchema,
  publicCertificateSchema,
  publicQuizSchema,
  quizAttemptResultSchema,
  quizAttemptSummarySchema,
  releaseSnapshotSchema,
  releaseSummarySchema,
  slugSchema,
  submissionSummarySchema,
  workspaceSummarySchema,
} from './schemas'
import { paginationQuerySchema } from './envelope'

/**
 * The operation registry.
 *
 * ## Why this exists
 *
 * Every operation is declared once, here, with its method, path, inputs and
 * response shape. Three things derive from the declaration rather than
 * restating it:
 *
 * - the API validates requests by looking the operation up;
 * - the OpenAPI document is generated from it;
 * - the SDK's method signatures come from it.
 *
 * The alternative — a hand-maintained route table, a hand-written OpenAPI file
 * and a hand-written client — is three descriptions of one thing, and the
 * failure mode is that they disagree. A field added to a response but not to
 * the documentation is a lie told to every integrator, and it is a lie nobody
 * catches because each of the three is individually consistent.
 *
 * ## What is deliberately absent
 *
 * No handler, no authorization decision, no database access. This package is
 * Apache-2.0 and must never import the AGPL application (ADR 6), and it is
 * consumed by browsers. It describes the shape of the API and nothing else.
 *
 * Which action guards an operation is recorded as a string rather than as a
 * type from the domain, for the same reason: the licenses are one-way. The API
 * asserts at startup that every recorded action exists, so a rename in the
 * domain is a startup failure rather than a route that silently guards nothing.
 */

/** A path, split into segments, with parameters marked. */
export type PathSegment =
  { kind: 'literal'; value: string } | { kind: 'param'; name: string }

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/**
 * One operation.
 *
 * `response` describes the `data` field of the envelope, not the envelope
 * itself — the envelope is uniform and adding it to every declaration would be
 * noise that a reader learns to skip.
 */
export type OperationDefinition = {
  method: HttpMethod
  /** `/workspaces/{workspaceId}/academies/{academyId}` */
  path: string
  /**
   * Path parameters, validated before anything else runs.
   *
   * The output is `Record<string, unknown>` rather than all-strings because a
   * version in a path is a number: `z.coerce.number()` takes the raw `"3"` and
   * yields `3`, and forcing strings here would have made the registry lie about
   * what a handler receives.
   */
  params?: z.ZodType<Record<string, unknown>>
  query?: z.ZodTypeAny
  body?: z.ZodTypeAny
  response: z.ZodTypeAny
  /**
   * The domain action that guards this operation, or `'public'`.
   *
   * Recorded so a route cannot be added without deciding who may call it, and
   * so a test can assert every non-public operation is guarded.
   */
  action: string
  /** One line, used as the OpenAPI summary. */
  summary: string
  /**
   * True when a retry must be safe because the operation creates something.
   * The API requires an `Idempotency-Key` header for these.
   */
  retryable?: boolean
}

/** A path template with `{param}` placeholders, as a list of segments. */
export function parsePath(path: string): PathSegment[] {
  const segments = path.split('/').filter((segment) => segment.length > 0)

  return segments.map((segment) => {
    const match = /^\{(.+)\}$/.exec(segment)

    return match?.[1]
      ? ({ kind: 'param', name: match[1] } as const)
      : ({ kind: 'literal', value: segment } as const)
  })
}

/** The parameter names in a path, in order. */
export function pathParams(path: string): string[] {
  return parsePath(path)
    .filter(
      (segment): segment is { kind: 'param'; name: string } =>
        segment.kind === 'param',
    )
    .map((segment) => segment.name)
}

/**
 * The API's route pattern for a path template.
 *
 * Hono uses `:name` where the registry uses `{name}`, and translating in one
 * place is what keeps a route from being registered at a path the SDK cannot
 * build.
 */
export function toRoutePattern(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1')
}

/** A concrete path, from a template and its parameter values. */
export function buildPath(
  path: string,
  params: Record<string, string>,
): string {
  return path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params[name]

    if (value === undefined) {
      throw new Error(`Missing path parameter "${name}" for "${path}".`)
    }

    return encodeURIComponent(value)
  })
}

// ---------------------------------------------------------------------------
// Shared request pieces
// ---------------------------------------------------------------------------

/**
 * Identifiers are opaque strings.
 *
 * Deliberately not validated as CUIDs or UUIDs: the format is an implementation
 * detail of the database, and a client that validated it would break the day it
 * changed without the API's contract changing at all.
 */
const id = z.string().min(1).max(64)

const workspaceParam = z.object({ workspaceId: id })
const academyParam = z.object({ academyId: id })
const courseParam = z.object({ workspaceId: id, academyId: id, courseId: id })

/** A body that is present but may be empty. */
const emptyBody = z.object({}).strict()

const okSchema = z.object({ ok: z.literal(true) })

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

export const OPERATIONS = {
  // --- Health -------------------------------------------------------------
  health: {
    method: 'GET',
    path: '/health',
    response: z.object({
      status: z.literal('ok'),
      /** So a client can tell which build it reached. */
      version: z.string(),
    }),
    action: 'public',
    summary: 'Liveness probe',
  },

  /**
   * Who the staff caller is, and where they may act.
   *
   * ## Why this is separate from `workspace.list`
   *
   * `workspace.list` is scoped to a workspace the caller has already chosen and
   * refuses a session that has not chosen one. Something has to answer that
   * question *before* a workspace exists in the URL — otherwise the application
   * has to read the session cookie itself, which makes it a second
   * implementation of session validation.
   *
   * ## Why the workspaces come back with the identity
   *
   * The application's shell needs both, every render, and two requests to draw
   * one header is one request too many. They are one fact about one session, so
   * they are one response.
   */
  'staff.session': {
    method: 'GET',
    path: '/staff/session',
    response: z.object({
      session: z.object({
        userId: id,
        name: z.string(),
        email: z.string().email(),
        /**
         * Only the roles `can()` recognises.
         *
         * A membership in any other role grants nothing, so listing it would
         * offer a workspace that refuses its holder on arrival.
         */
        workspaces: z.array(
          z.object({
            id,
            name: z.string(),
            slug: z.string(),
            role: z.enum(['owner', 'admin']),
          }),
        ),
      }),
    }),
    /**
     * No workspace yet, so no workspace to require. Declared as a public action
     * rather than left unlisted because this operation *is* reachable
     * anonymously — and it answers with the caller's own identity or refuses,
     * so there is nothing to contain.
     */
    action: 'public',
    summary: 'The signed-in staff identity and the workspaces it may enter',
  },

  // --- Workspace ----------------------------------------------------------
  'workspace.list': {
    method: 'GET',
    path: '/workspaces',
    response: z.object({ workspaces: z.array(workspaceSummarySchema) }),
    action: 'workspace:read',
    summary: 'Workspaces the caller belongs to',
  },

  'workspace.get': {
    method: 'GET',
    path: '/workspaces/{workspaceId}',
    params: workspaceParam,
    response: z.object({ workspace: workspaceSummarySchema }),
    action: 'workspace:read',
    summary: 'Read a workspace',
  },

  'workspace.update': {
    method: 'PATCH',
    path: '/workspaces/{workspaceId}',
    params: workspaceParam,
    body: z
      .object({
        name: z.string().min(1).max(200).optional(),
        logo: z.string().url().nullable().optional(),
      })
      .strict(),
    response: z.object({ workspace: workspaceSummarySchema }),
    action: 'workspace:update',
    summary: 'Rename a workspace or change its logo',
  },

  // --- Academy ------------------------------------------------------------
  'academy.list': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies',
    params: workspaceParam,
    response: z.object({ academies: z.array(academySummarySchema) }),
    action: 'academy:list',
    summary: 'Academies in a workspace',
  },

  'academy.create': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies',
    params: workspaceParam,
    body: z
      .object({
        name: z.string().min(1).max(200),
        slug: slugSchema,
        authMode: z.enum(['MANAGED', 'DELEGATED', 'HYBRID']).optional(),
      })
      .strict(),
    response: z.object({ academy: academySummarySchema }),
    action: 'academy:create',
    summary: 'Create an academy',
    retryable: true,
  },

  'academy.get': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}',
    params: z.object({ workspaceId: id, academyId: id }),
    response: z.object({ academy: academySummarySchema }),
    action: 'academy:read',
    summary: 'Read an academy',
  },

  'academy.update': {
    method: 'PATCH',
    path: '/workspaces/{workspaceId}/academies/{academyId}',
    params: z.object({ workspaceId: id, academyId: id }),
    body: z
      .object({
        name: z.string().min(1).max(200).optional(),
        logo: z.string().url().nullable().optional(),
        authMode: z.enum(['MANAGED', 'DELEGATED', 'HYBRID']).optional(),
        branding: brandingSchema.nullable().optional(),
      })
      .strict(),
    response: z.object({ academy: academySummarySchema }),
    action: 'academy:update',
    summary: 'Change an academy’s identity or branding',
  },

  // --- Course authoring ---------------------------------------------------
  'course.list': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses',
    params: z.object({ workspaceId: id, academyId: id }),
    query: z.object({
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    }),
    response: z.object({ courses: z.array(courseSummarySchema) }),
    action: 'course:read',
    summary: 'Courses in an academy, drafts included',
  },

  'course.create': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses',
    params: z.object({ workspaceId: id, academyId: id }),
    body: z
      .object({
        title: z.string().min(1).max(200),
        slug: slugSchema,
        description: z.string().max(5000).nullable().optional(),
      })
      .strict(),
    response: z.object({ course: courseSummarySchema }),
    action: 'course:create',
    summary: 'Create a draft course',
    retryable: true,
  },

  'course.get': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}',
    params: courseParam,
    response: z.object({
      course: courseSummarySchema,
      modules: z.array(moduleSummarySchema),
      /**
       * The release a learner currently sees, or null before the first publish.
       *
       * Reported with the draft rather than fetched separately because the whole
       * point of this page is the difference between the two, and a client that
       * had to ask twice is a client that can show one without the other.
       */
      release: releaseSummarySchema.nullable(),
    }),
    action: 'course:read',
    summary: 'Read a course with its draft curriculum',
  },

  'course.update': {
    method: 'PATCH',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}',
    params: courseParam,
    body: z
      .object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).nullable().optional(),
        thumbnail: z.string().url().nullable().optional(),
      })
      .strict(),
    response: z.object({ course: courseSummarySchema }),
    action: 'course:update',
    summary: 'Edit a draft course',
  },

  'course.archive': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/archive',
    params: courseParam,
    body: emptyBody,
    response: z.object({ course: courseSummarySchema }),
    action: 'course:delete',
    summary: 'Archive a course',
  },

  'course.publish': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/publish',
    params: courseParam,
    body: emptyBody,
    response: z.object({
      release: releaseSummarySchema,
      /** True when the draft was unchanged and the existing release was returned. */
      unchanged: z.boolean(),
    }),
    action: 'course:publish',
    summary: 'Publish the draft as an immutable release',
    retryable: true,
  },

  'course.release': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/releases/{version}',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      version: z.coerce.number().int().positive(),
    }),
    response: z.object({
      release: releaseSummarySchema,
      snapshot: releaseSnapshotSchema,
    }),
    action: 'release:read',
    summary: 'Read a specific release, current or superseded',
  },

  // --- Module and lesson authoring ---------------------------------------
  'module.create': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/modules',
    params: courseParam,
    body: z
      .object({
        title: z.string().min(1).max(200),
        summary: z.string().max(2000).nullable().optional(),
      })
      .strict(),
    response: z.object({ module: moduleSummarySchema }),
    action: 'course:update',
    summary: 'Add a module',
    retryable: true,
  },

  'module.update': {
    method: 'PATCH',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/modules/{moduleId}',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      moduleId: id,
    }),
    body: z
      .object({
        title: z.string().min(1).max(200).optional(),
        summary: z.string().max(2000).nullable().optional(),
      })
      .strict(),
    response: z.object({ module: moduleSummarySchema }),
    action: 'course:update',
    summary: 'Edit a module',
  },

  'module.reorder': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/modules/reorder',
    params: courseParam,
    body: z.object({ order: z.array(id).min(1) }).strict(),
    response: okSchema,
    action: 'course:update',
    summary: 'Reorder every module in a course',
  },

  'module.delete': {
    method: 'DELETE',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/modules/{moduleId}',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      moduleId: id,
    }),
    response: okSchema,
    action: 'course:update',
    summary: 'Delete an empty module',
  },

  'lesson.create': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/modules/{moduleId}/lessons',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      moduleId: id,
    }),
    body: z
      .object({
        title: z.string().min(1).max(200),
        contentType: z.enum([
          'VIDEO',
          'TEXT',
          'FILE',
          'QUIZ',
          'ASSIGNMENT',
          'EMBED',
        ]),
        summary: z.string().max(2000).nullable().optional(),
        isFree: z.boolean().optional(),
        body: z.string().nullable().optional(),
        embedUrl: z.string().url().nullable().optional(),
        mediaAssetId: id.nullable().optional(),
      })
      .strict(),
    response: z.object({ lesson: lessonSummarySchema }),
    action: 'course:update',
    summary: 'Add a lesson',
    retryable: true,
  },

  'lesson.get': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/lessons/{lessonId}',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      lessonId: id,
    }),
    response: z.object({ lesson: lessonSummarySchema }),
    action: 'course:read',
    summary: 'Read one lesson, body included',
  },

  'lesson.update': {
    method: 'PATCH',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/lessons/{lessonId}',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      lessonId: id,
    }),
    body: z
      .object({
        title: z.string().min(1).max(200).optional(),
        summary: z.string().max(2000).nullable().optional(),
        isFree: z.boolean().optional(),
        body: z.string().nullable().optional(),
        embedUrl: z.string().url().nullable().optional(),
        mediaAssetId: id.nullable().optional(),
      })
      .strict(),
    response: z.object({ lesson: lessonSummarySchema }),
    action: 'course:update',
    summary: 'Edit a lesson',
  },

  'lesson.reorder': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/modules/{moduleId}/lessons/reorder',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      moduleId: id,
    }),
    body: z.object({ order: z.array(id).min(1) }).strict(),
    response: okSchema,
    action: 'course:update',
    summary: 'Reorder every lesson in a module',
  },

  'lesson.delete': {
    method: 'DELETE',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/lessons/{lessonId}',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      lessonId: id,
    }),
    response: okSchema,
    action: 'course:update',
    summary: 'Delete a draft lesson',
  },

  // --- Quiz authoring -----------------------------------------------------
  'quiz.upsert': {
    method: 'PUT',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/lessons/{lessonId}/quiz',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      lessonId: id,
    }),
    body: z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().max(5000).nullable().optional(),
        passingPercent: z.number().int().min(0).max(100).optional(),
        maxAttempts: z.number().int().min(1).nullable().optional(),
        timeLimitMinutes: z.number().int().min(1).nullable().optional(),
        opensAt: z.coerce.date().nullable().optional(),
        closesAt: z.coerce.date().nullable().optional(),
        isMockTest: z.boolean().optional(),
        negativeMarking: z.boolean().optional(),
        defaultNegativeMark: z.number().min(0).nullable().optional(),
      })
      .strict(),
    response: z.object({ quizId: id, lessonId: id }),
    action: 'course:update',
    summary: 'Create or replace a lesson’s quiz settings',
  },

  'quiz.section.upsert': {
    method: 'PUT',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/quizzes/{quizId}/sections',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      quizId: id,
    }),
    body: z
      .object({ title: z.string().min(1).max(200), sectionId: id.optional() })
      .strict(),
    response: z.object({ sectionId: id }),
    action: 'course:update',
    summary: 'Add or rename a quiz section',
  },

  'quiz.question.upsert': {
    method: 'PUT',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/quizzes/{quizId}/questions',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      quizId: id,
    }),
    body: z
      .object({
        questionId: id.optional(),
        prompt: z.string().min(1).max(5000),
        questionType: z.enum([
          'MULTIPLE_CHOICE',
          'MULTI_SELECT',
          'TRUE_FALSE',
          'SHORT_ANSWER',
          'INTEGER',
        ]),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string(),
        correctAnswers: z.array(z.string()).optional(),
        explanation: z.string().max(5000).nullable().optional(),
        points: z.number().int().min(0).optional(),
        negativePoints: z.number().min(0).optional(),
        partialMarking: z.boolean().optional(),
        sectionId: id.nullable().optional(),
      })
      .strict(),
    response: z.object({ questionId: id }),
    action: 'course:update',
    summary: 'Add or edit a quiz question',
  },

  'quiz.gradebook': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/lessons/{lessonId}/quiz/attempts',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      lessonId: id,
    }),
    response: z.object({ attempts: z.array(quizAttemptSummarySchema) }),
    action: 'enrollment:read',
    summary: 'Every attempt at a quiz, for a gradebook',
  },

  // --- Assignment authoring and grading ----------------------------------
  'assignment.upsert': {
    method: 'PUT',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/lessons/{lessonId}/assignment',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      lessonId: id,
    }),
    body: z
      .object({
        title: z.string().min(1).max(200),
        instructions: z.string().max(20000).nullable().optional(),
        dueAt: z.coerce.date().nullable().optional(),
        totalPoints: z.number().int().min(1).optional(),
      })
      .strict(),
    response: z.object({ assignmentId: id }),
    action: 'course:update',
    summary: 'Create or edit a lesson’s assignment',
  },

  'assignment.submissions': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}/courses/{courseId}/lessons/{lessonId}/submissions',
    params: z.object({
      workspaceId: id,
      academyId: id,
      courseId: id,
      lessonId: id,
    }),
    query: z.object({ status: z.enum(['graded', 'ungraded']).optional() }),
    response: z.object({
      submissions: z.array(
        submissionSummarySchema.extend({
          learnerName: z.string(),
          learnerEmail: z.string().email(),
        }),
      ),
    }),
    action: 'submission:read',
    summary: 'Submissions for an assignment',
  },

  'submission.grade': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/submissions/{submissionId}/grade',
    params: z.object({ workspaceId: id, academyId: id, submissionId: id }),
    body: z
      .object({
        grade: z.number().min(0),
        feedback: z.string().max(10000).nullable().optional(),
      })
      .strict(),
    response: z.object({ submission: submissionSummarySchema }),
    action: 'submission:grade',
    summary: 'Grade a submission',
  },

  // --- Public catalogue ---------------------------------------------------
  /**
   * Which academy this request is about.
   *
   * Its own operation rather than a reuse of the catalogue read, because the two
   * are different questions and a page that only needs to know *which* academy
   * should not have to fetch one. It also has to exist for the frontends: the
   * resolution rules live with the `AcademyDomain` table, and a frontend that
   * answered this from its own database would be a second query path — which is
   * where a tenant filter gets forgotten.
   *
   * `404` when nothing resolves, which is the fail-closed answer rather than a
   * default.
   */
  'academy.resolve': {
    method: 'GET',
    path: '/academy/resolve',
    response: z.object({ academy: academySummarySchema }),
    action: 'public',
    summary: 'Resolve the academy this request is about',
  },

  'catalog.academy': {
    method: 'GET',
    path: '/catalog/academies/{academyId}',
    params: academyParam,
    response: z.object({ academy: academySummarySchema }),
    action: 'public',
    summary: 'An academy’s public profile',
  },

  'catalog.courses': {
    method: 'GET',
    path: '/catalog/academies/{academyId}/courses',
    params: academyParam,
    query: paginationQuerySchema,
    response: z.object({ courses: z.array(catalogCourseSchema) }),
    action: 'public',
    summary: 'Published courses in an academy',
  },

  'catalog.course': {
    method: 'GET',
    path: '/catalog/academies/{academyId}/courses/{courseId}',
    params: z.object({ academyId: id, courseId: id }),
    response: z.object({
      course: catalogCourseSchema,
      curriculum: z.array(
        z.object({
          moduleId: id,
          title: z.string(),
          lessons: z.array(
            z.object({
              id,
              title: z.string(),
              contentType: z.string(),
              isFree: z.boolean(),
            }),
          ),
        }),
      ),
    }),
    action: 'public',
    summary: 'A published course and its outline, without lesson bodies',
  },

  // --- Certificate verification ------------------------------------------
  'certificate.verify': {
    method: 'GET',
    path: '/verify/{verificationId}',
    params: z.object({ verificationId: z.string().min(8).max(128) }),
    response: z.object({ certificate: publicCertificateSchema }),
    action: 'public',
    summary: 'Public verification of an issued certificate',
  },

  // --- Learner: enrolment and progress -----------------------------------
  /**
   * Who the caller is, for the application's own session gate.
   *
   * The frontend must not validate a session itself — the cookie is opaque and
   * the session row is the API's, so a second implementation of that check would
   * be a second answer that disagrees the first time a session is revoked.
   *
   * Deliberately minimal: a name, an email and the academy. A page that needs
   * more asks for it through an operation that has a reason to return it.
   */
  'learner.session': {
    method: 'GET',
    path: '/learn/session',
    response: z.object({
      session: z.object({
        learnerId: id,
        name: z.string(),
        email: z.string().email(),
        academyId: id,
      }),
    }),
    action: 'learner:profile:read',
    summary: 'The signed-in learner, for the application’s session gate',
  },

  'learner.courses': {
    method: 'GET',
    path: '/learn/courses',
    response: z.object({ courses: z.array(learnerCourseSchema) }),
    action: 'learner:profile:read',
    summary: 'The caller’s enrolled courses with progress',
  },

  'learner.enroll': {
    method: 'POST',
    path: '/learn/courses/{courseId}/enrollment',
    params: z.object({ courseId: id }),
    body: emptyBody,
    response: z.object({ enrollment: enrollmentSummarySchema }),
    action: 'learner:enroll',
    summary: 'Enrol in a free course',
    retryable: true,
  },

  'learner.course': {
    method: 'GET',
    path: '/learn/courses/{courseId}',
    params: z.object({ courseId: id }),
    response: z.object({
      course: learnerCourseSchema,
      modules: z.array(learnerModuleSchema),
      /** False when the grant has lapsed; the page still reads. */
      hasAccess: z.boolean(),
      releaseVersion: z.number().int(),
    }),
    action: 'release:read',
    summary: 'A published course as the learner sees it',
  },

  'learner.progress': {
    method: 'GET',
    path: '/learn/courses/{courseId}/progress',
    params: z.object({ courseId: id }),
    response: z.object({
      progress: progressSummarySchema,
      lessons: z.array(
        z.object({
          lessonId: id,
          isCompleted: z.boolean(),
          positionSeconds: z.number().int(),
          watchedSeconds: z.number().int(),
        }),
      ),
    }),
    action: 'learner:progress:write',
    summary: 'The caller’s progress through a course',
  },

  'learner.progress.record': {
    method: 'POST',
    path: '/learn/lessons/{lessonId}/progress',
    params: z.object({ lessonId: id }),
    body: z
      .object({
        positionSeconds: z.number().int().min(0).optional(),
        watchedSeconds: z.number().int().min(0).optional(),
      })
      .strict(),
    response: z.object({
      lessonId: id,
      isCompleted: z.boolean(),
      positionSeconds: z.number().int(),
      watchedSeconds: z.number().int(),
    }),
    action: 'learner:progress:write',
    summary: 'Report playback position. Input, not proof of attendance.',
  },

  'learner.lesson.complete': {
    method: 'POST',
    path: '/learn/lessons/{lessonId}/complete',
    params: z.object({ lessonId: id }),
    body: emptyBody,
    response: z.object({
      lessonCompleted: z.boolean(),
      courseCompleted: z.boolean(),
    }),
    action: 'learner:progress:write',
    summary: 'Mark a lesson complete once its rule is satisfied',
    retryable: true,
  },

  // --- Learner: quiz ------------------------------------------------------
  'learner.quiz': {
    method: 'GET',
    path: '/learn/lessons/{lessonId}/quiz',
    params: z.object({ lessonId: id }),
    response: z.object({ quiz: publicQuizSchema }),
    action: 'learner:attempt:write',
    summary: 'A quiz without its answer key',
  },

  'learner.quiz.start': {
    method: 'POST',
    path: '/learn/lessons/{lessonId}/quiz/attempts',
    params: z.object({ lessonId: id }),
    body: emptyBody,
    response: z.object({
      attempt: quizAttemptSummarySchema,
      resumed: z.boolean(),
      expired: z.boolean(),
    }),
    action: 'learner:attempt:write',
    summary: 'Start or resume an attempt',
    retryable: true,
  },

  'learner.quiz.submit': {
    method: 'POST',
    path: '/learn/quiz/attempts/{attemptId}/submit',
    params: z.object({ attemptId: id }),
    body: z
      .object({
        answers: z
          .array(
            z
              .object({
                questionId: id,
                answer: z.string().nullable().optional(),
                answers: z.array(z.string()).optional(),
              })
              .strict(),
          )
          .max(500),
      })
      .strict(),
    response: z.object({ result: quizAttemptResultSchema }),
    action: 'learner:attempt:write',
    summary: 'Submit an attempt',
    retryable: true,
  },

  'learner.quiz.history': {
    method: 'GET',
    path: '/learn/lessons/{lessonId}/quiz/attempts',
    params: z.object({ lessonId: id }),
    response: z.object({
      attempts: z.array(quizAttemptSummarySchema),
      passingPercent: z.number().int(),
    }),
    action: 'learner:attempt:write',
    summary: 'The caller’s own attempt history for a lesson',
  },

  // --- Learner: assignments ----------------------------------------------
  'learner.assignment': {
    method: 'GET',
    path: '/learn/lessons/{lessonId}/assignment',
    params: z.object({ lessonId: id }),
    response: z.object({
      assignment: z.object({
        id,
        title: z.string(),
        instructions: z.string().nullable(),
        dueAt: z.coerce.date().nullable(),
        totalPoints: z.number().int(),
      }),
      submission: submissionSummarySchema.nullable(),
    }),
    action: 'learner:submission:write',
    summary: 'An assignment and the caller’s own submission',
  },

  'learner.assignment.submit': {
    method: 'POST',
    path: '/learn/lessons/{lessonId}/assignment/submission',
    params: z.object({ lessonId: id }),
    body: z
      .object({
        content: z.string().max(50000).nullable().optional(),
        fileUrl: z.string().url().nullable().optional(),
      })
      .strict(),
    response: z.object({ submission: submissionSummarySchema }),
    action: 'learner:submission:write',
    summary: 'Submit or replace ungraded work',
    retryable: true,
  },

  // --- Learner: certificates ---------------------------------------------
  'learner.certificates': {
    method: 'GET',
    path: '/learn/certificates',
    response: z.object({
      certificates: z.array(
        z.object({
          id,
          courseId: id,
          title: z.string(),
          recipientName: z.string(),
          verificationId: z.string(),
          issuedAt: z.coerce.date(),
          revokedAt: z.coerce.date().nullable(),
        }),
      ),
    }),
    action: 'learner:certificate:read',
    summary: 'Certificates the caller holds',
  },

  'learner.certificate.issue': {
    method: 'POST',
    path: '/learn/courses/{courseId}/certificate',
    params: z.object({ courseId: id }),
    body: emptyBody,
    response: z.object({
      certificate: z.object({
        id,
        courseId: id,
        title: z.string(),
        recipientName: z.string(),
        verificationId: z.string(),
        issuedAt: z.coerce.date(),
      }),
      created: z.boolean(),
    }),
    action: 'learner:certificate:read',
    summary: 'Request the certificate for a completed course',
    retryable: true,
  },

  // --- Media --------------------------------------------------------------

  /**
   * Begin an upload.
   *
   * ## Why this is three calls and not one
   *
   * The bytes do not necessarily come through this API. With S3 configured, the
   * client is given a presigned URL and uploads directly to the bucket — which
   * is the entire reason presigning exists, and it is what keeps a two-gigabyte
   * video out of a Node process. With local disk, the target points back here
   * and the bytes do stream through the API, because the API is the only process
   * that can write to that directory.
   *
   * A single multipart endpoint would work for the second case and make the
   * first impossible, so the two-step shape is the one that fits both: *create*
   * names the asset and asks where the bytes should go, the client sends them,
   * and *complete* records that they arrived.
   *
   * ## Why it is not `retryable`
   *
   * Creating an asset is not idempotent: a retry creates a second row. Marking it
   * retryable would require the caller to send a key, and the natural key is one
   * the server would have to invent — the asset id is what makes the storage key
   * unique, so it has to exist before the key does. What a retried create leaves
   * behind is a `PROCESSING` asset with no bytes, which is precisely what
   * `media.gc` sweeps, so the cost of the failure is bounded and reclaimed.
   */
  'media.create': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/media',
    params: z.object({ workspaceId: id, academyId: id }),
    body: z
      .object({
        filename: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(255),
        sizeBytes: z.number().int().nonnegative().nullable().optional(),
        title: z.string().max(255).nullable().optional(),
      })
      .strict(),
    response: z.object({
      asset: mediaAssetSchema,
      /**
       * Where the bytes go, and how.
       *
       * `method` and `headers` are supplied rather than assumed to be `PUT` with
       * a content type, because the local adapter's target is this API's own
       * upload route while S3's is a presigned bucket URL. A client that assumed
       * would work against exactly one deployment.
       */
      upload: z.object({
        url: z.string(),
        method: z.enum(['PUT', 'POST']),
        headers: z.record(z.string(), z.string()),
        expiresAt: dateSchema,
      }),
    }),
    action: 'media:upload',
    summary: 'Create a media asset and get the address to upload its bytes to',
  },

  /**
   * Record that the bytes arrived.
   *
   * The API asks the storage provider whether the object exists before this
   * succeeds, so a client cannot mark an upload complete that never landed. That
   * check is the reason this is a separate call rather than an assumption made
   * when the target was issued.
   */
  'media.complete': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/academies/{academyId}/media/{assetId}/complete',
    params: z.object({ workspaceId: id, academyId: id, assetId: id }),
    body: z
      .object({
        sizeBytes: z.number().int().nonnegative().nullable().optional(),
      })
      .strict(),
    response: z.object({ asset: mediaAssetSchema }),
    action: 'media:upload',
    summary: 'Confirm an upload landed and mark the asset ready',
  },

  'media.list': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/academies/{academyId}/media',
    params: z.object({ workspaceId: id, academyId: id }),
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
    response: z.object({ assets: z.array(mediaAssetSchema) }),
    action: 'media:read',
    summary: 'Media in an academy, newest first',
  },

  'media.delete': {
    method: 'DELETE',
    path: '/workspaces/{workspaceId}/academies/{academyId}/media/{assetId}',
    params: z.object({ workspaceId: id, academyId: id, assetId: id }),
    response: okSchema,
    action: 'media:delete',
    summary: 'Delete a media asset',
  },

  /**
   * Serving bytes is deliberately absent from this registry.
   *
   * `GET /media/{assetId}` returns the file itself, not an envelope, and the
   * registry describes JSON operations — every entry here has a Zod `response`
   * and an SDK method that unwraps `data`. Declaring it would mean either a
   * `response` schema that lies about what the route returns or a special case
   * in every consumer.
   *
   * It is a real route with a real entitlement check (`media:serve`, which a
   * learner holds for their own academy and an anonymous visitor holds for a
   * free-preview lesson). What it is not is an operation, and the SDK's
   * `STREAMING_OPERATIONS` list is where that category is recorded.
   */

  // --- Service keys -------------------------------------------------------
  'serviceKey.list': {
    method: 'GET',
    path: '/workspaces/{workspaceId}/service-keys',
    params: workspaceParam,
    response: z.object({
      keys: z.array(
        z.object({
          id,
          name: z.string(),
          prefix: z.string(),
          last4: z.string(),
          scopes: z.array(z.string()),
          createdAt: z.coerce.date(),
          lastUsedAt: z.coerce.date().nullable(),
          revokedAt: z.coerce.date().nullable(),
        }),
      ),
    }),
    action: 'serviceKey:read',
    summary: 'Service keys in a workspace, without their secrets',
  },

  'serviceKey.create': {
    method: 'POST',
    path: '/workspaces/{workspaceId}/service-keys',
    params: workspaceParam,
    body: z
      .object({
        name: z.string().min(1).max(200),
        scopes: z.array(z.string()).min(1),
        academyId: id.nullable().optional(),
        expiresAt: z.coerce.date().nullable().optional(),
      })
      .strict(),
    response: z.object({
      id,
      name: z.string(),
      /** Shown once. Never retrievable again. */
      key: z.string(),
    }),
    action: 'serviceKey:manage',
    summary: 'Issue a service key, returning the secret exactly once',
  },

  'serviceKey.revoke': {
    method: 'DELETE',
    path: '/workspaces/{workspaceId}/service-keys/{keyId}',
    params: z.object({ workspaceId: id, keyId: id }),
    response: okSchema,
    action: 'serviceKey:manage',
    summary: 'Revoke a service key',
  },
} as const satisfies Record<string, OperationDefinition>

export type OperationName = keyof typeof OPERATIONS

export const OPERATION_NAMES = Object.keys(OPERATIONS) as OperationName[]

/**
 * Operations that must not be called without an `Idempotency-Key`.
 *
 * Derived from the registry rather than listed separately, so an operation
 * marked `retryable` cannot be forgotten here.
 */
export const RETRYABLE_OPERATIONS = OPERATION_NAMES.filter(
  (name) =>
    'retryable' in OPERATIONS[name] && OPERATIONS[name].retryable === true,
)

/** Operations reachable without a principal. */
export const PUBLIC_OPERATIONS = OPERATION_NAMES.filter(
  (name) => OPERATIONS[name].action === 'public',
)

/**
 * What a request may carry, per operation.
 *
 * Built as a mapped type over the registry rather than with conditional types
 * indexing a union. Indexing `(typeof OPERATIONS)[Name]['body']` asks the
 * compiler for a property that some operations do not declare, which is an
 * error rather than an `undefined` — and it should be, because a client passing
 * a body to an operation with no body is a mistake worth catching.
 *
 * Optionality here is a statement about *this type*, not about the registry: a
 * required body is still required by the API, and the generated method
 * signature makes it a required parameter.
 */
export type OperationInput<Name extends OperationName> = {
  params?: (typeof OPERATIONS)[Name] extends { params: infer P }
    ? z.input<Extract<P, z.ZodTypeAny>>
    : never
  query?: (typeof OPERATIONS)[Name] extends { query: infer Q }
    ? z.input<Extract<Q, z.ZodTypeAny>>
    : never
  body?: (typeof OPERATIONS)[Name] extends { body: infer B }
    ? z.input<Extract<B, z.ZodTypeAny>>
    : never
  /** Required by operations the registry marks `retryable`. */
  idempotencyKey?: string
  /**
   * Cancels the request.
   *
   * Typed structurally rather than as `AbortSignal` so this package needs no
   * DOM or Node lib in its `tsconfig` — it is consumed by browsers, servers and
   * React Native, and requiring one of their ambient types would make it
   * unusable in the others.
   */
  signal?: { readonly aborted: boolean }
}

/** What an operation returns, before the envelope is unwrapped. */
export type OperationOutput<Name extends OperationName> = z.output<
  (typeof OPERATIONS)[Name]['response']
>

/** The action guarding an operation, or `'public'`. */
export type OperationAction<Name extends OperationName> =
  (typeof OPERATIONS)[Name]['action']

/** Operations reachable without a principal, as a union of their names. */
export type PublicOperationName = {
  [Name in OperationName]: (typeof OPERATIONS)[Name]['action'] extends 'public'
    ? Name
    : never
}[OperationName]

/** Operations that must carry an `Idempotency-Key`. */
export type RetryableOperationName = {
  [Name in OperationName]: (typeof OPERATIONS)[Name] extends { retryable: true }
    ? Name
    : never
}[OperationName]
