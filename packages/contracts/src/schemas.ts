import { z } from 'zod'

/**
 * Response shapes for the public API.
 *
 * These are the API's own vocabulary, declared here rather than inferred from
 * `packages/domain`. Two reasons, and both matter:
 *
 * 1. **The license boundary.** This package is Apache-2.0 and must never import
 *    the AGPL application (ADR 6). A schema that imported the domain's types
 *    would make the SDK AGPL by dependency.
 * 2. **A deliberate seam.** A database column is not an API field. Naming them
 *    separately means a column can be renamed, split, or dropped without
 *    silently changing what every integrator receives — and it is what lets the
 *    API return a projection that omits the answer key rather than returning
 *    everything and trusting callers not to look.
 *
 * Dates are `z.coerce.date()` on the way in and serialise to ISO strings on the
 * wire. The SDK types them as `Date` because that is what a caller wants; the
 * coercion is what makes a JSON string acceptable.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** An opaque identifier. Not validated as a CUID: that format is the database's business. */
export const idSchema = z.string().min(1).max(64)

/**
 * A date.
 *
 * `z.coerce.date()` because JSON has no date type: a value arrives as a string
 * and has to become a `Date` for the output type to mean what it says. Without
 * the coercion the inferred type would be `string`, and an SDK caller would be
 * handed a string where the type promised a `Date`.
 *
 * A domain operation returns `Date` for the same reason, so this is the shape
 * both sides agree on. Serialising to ISO happens in `JSON.stringify`, which is
 * what the wire format actually is.
 */
export const dateSchema = z.coerce.date()

/**
 * An instant that the domain produces as a string.
 *
 * Used where a value came out of a JSON column rather than a `timestamp`
 * column — a release snapshot stores ISO strings, and converting them to `Date`
 * on the way out would be a translation with nothing to gain. Numbering the two
 * shapes differently is what stops "sometimes a Date, sometimes a string"
 * spreading further.
 */
export const isoDateSchema = z.string()

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export const brandingSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour')
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour')
    .optional(),
  supportEmail: z.string().email().optional(),
  legal: z
    .object({
      termsUrl: z.string().url().optional(),
      privacyUrl: z.string().url().optional(),
      refundPolicyUrl: z.string().url().optional(),
    })
    .optional(),
})

export type Branding = z.infer<typeof brandingSchema>

/**
 * A URL-safe identifier for an academy or a workspace.
 *
 * Constrained here, in the API's vocabulary, as well as in the domain: a client
 * should be told a slug is invalid before a request is made, not after. The two
 * definitions agree because a slug that the API accepts and the domain refuses
 * would be a contract that lies.
 */
export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'must be lowercase alphanumeric words separated by single hyphens',
  )

export const workspaceSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  createdAt: dateSchema,
})

export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>

export const academySummarySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  authMode: z.enum(['MANAGED', 'DELEGATED', 'HYBRID']),
  branding: brandingSchema.nullable(),
  createdAt: dateSchema,
})

export type AcademySummary = z.infer<typeof academySummarySchema>

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const courseStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

export const courseSummarySchema = z.object({
  id: idSchema,
  academyId: idSchema,
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnail: z.string().nullable(),
  status: courseStatusSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export type CourseSummary = z.infer<typeof courseSummarySchema>

export const moduleSummarySchema = z.object({
  id: idSchema,
  courseId: idSchema,
  title: z.string(),
  summary: z.string().nullable(),
  position: z.number().int(),
})

export type ModuleSummary = z.infer<typeof moduleSummarySchema>

/**
 * The public catalogue's view of a course.
 *
 * Note what is absent: lesson bodies, media URLs, and the answer key. Previewing
 * a course is not being entitled to it, so this shape and the learner shape are
 * kept separate rather than one being a filtered copy of the other.
 */
export const catalogCourseSchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnail: z.string().nullable(),
  /**
   * Deliberately no price.
   *
   * Payments are not in this milestone, so no course can have one — and a field
   * that is always null tells an integrator that pricing exists and is
   * unavailable, which is a different product. When a checkout app lands, the
   * field arrives with it.
   */
  lessonCount: z.number().int().nonnegative(),
  moduleCount: z.number().int().nonnegative(),
})

export type CatalogCourse = z.infer<typeof catalogCourseSchema>

export const lessonContentTypeSchema = z.enum([
  'VIDEO',
  'TEXT',
  'FILE',
  'QUIZ',
  'ASSIGNMENT',
  'EMBED',
])

export const lessonSummarySchema = z.object({
  id: idSchema,
  moduleId: idSchema,
  title: z.string(),
  summary: z.string().nullable(),
  contentType: lessonContentTypeSchema,
  position: z.number().int(),
  isFree: z.boolean(),
  body: z.string().nullable(),
  mediaAssetId: idSchema.nullable(),
  embedUrl: z.string().nullable(),
})

export type LessonSummary = z.infer<typeof lessonSummarySchema>

export const releaseSummarySchema = z.object({
  id: idSchema,
  courseId: idSchema,
  version: z.number().int().positive(),
  publishedAt: dateSchema,
  supersededAt: dateSchema.nullable(),
})

export type ReleaseSummary = z.infer<typeof releaseSummarySchema>

export const snapshotLessonSchema = z.object({
  id: idSchema,
  title: z.string(),
  summary: z.string().nullable(),
  contentType: z.string(),
  position: z.number().int(),
  isFree: z.boolean(),
  body: z.string().nullable(),
  mediaAssetId: idSchema.nullable(),
  embedUrl: z.string().nullable(),
  completionRule: z.object({
    type: z.enum(['VIEW', 'SCROLL', 'MANUAL']),
    thresholdPercent: z.number().optional(),
  }),
})

export const snapshotModuleSchema = z.object({
  id: idSchema,
  title: z.string(),
  summary: z.string().nullable(),
  position: z.number().int(),
  lessons: z.array(snapshotLessonSchema),
})

/**
 * A release snapshot as stored.
 *
 * Deliberately loose on the quiz and assignment sub-objects: they are embedded
 * documents whose full detail is an internal matter, and pinning every field
 * here would make adding a question attribute a breaking API change.
 */
export const releaseSnapshotSchema = z.object({
  version: z.literal(1),
  courseId: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  modules: z.array(snapshotModuleSchema),
  totals: z.object({
    modules: z.number().int(),
    lessons: z.number().int(),
    quizMinutes: z.number().int(),
  }),
})

export type ReleaseSnapshot = z.infer<typeof releaseSnapshotSchema>

// ---------------------------------------------------------------------------
// Learning
// ---------------------------------------------------------------------------

export const enrollmentSummarySchema = z.object({
  id: idSchema,
  academyId: idSchema,
  courseId: idSchema,
  learnerId: idSchema,
  enrolledAt: dateSchema,
  startedAt: dateSchema.nullable(),
  completedAt: dateSchema.nullable(),
})

export type EnrollmentSummary = z.infer<typeof enrollmentSummarySchema>

export const progressSummarySchema = z.object({
  requiredLessons: z.number().int().nonnegative(),
  completedLessons: z.number().int().nonnegative(),
  /** Derived from the release, never stored. */
  percent: z.number().int().min(0).max(100),
  isComplete: z.boolean(),
})

export type ProgressSummary = z.infer<typeof progressSummarySchema>

export const learnerCourseSchema = z.object({
  courseId: idSchema,
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnail: z.string().nullable(),
  percent: z.number().int().min(0).max(100),
  isComplete: z.boolean(),
  hasAccess: z.boolean(),
  lastSeenAt: z.coerce.date().nullable(),
})

export type LearnerCourse = z.infer<typeof learnerCourseSchema>

export const learnerLessonSchema = z.object({
  id: idSchema,
  title: z.string(),
  summary: z.string().nullable(),
  contentType: z.string(),
  position: z.number().int(),
  isFree: z.boolean(),
  body: z.string().nullable(),
  mediaAssetId: idSchema.nullable(),
  embedUrl: z.string().nullable(),
  hasQuiz: z.boolean(),
  hasAssignment: z.boolean(),
})

export type LearnerLesson = z.infer<typeof learnerLessonSchema>

export const learnerModuleSchema = z.object({
  id: idSchema,
  title: z.string(),
  summary: z.string().nullable(),
  position: z.number().int(),
  lessons: z.array(learnerLessonSchema),
})

export type LearnerModule = z.infer<typeof learnerModuleSchema>

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

export const questionTypeSchema = z.enum([
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'INTEGER',
])

export const quizAttemptSummarySchema = z.object({
  id: idSchema,
  /**
   * The quiz is named, and the quiz names its attempts.
   *
   * That is a cycle in the *type* sense, and it is not recursive in the document
   * because the nesting stops here: `publicQuizSchema` includes attempts, and an
   * attempt does not include a quiz. The OpenAPI generator expands what is
   * reachable, so this is two levels and was the version that fit.
   */
  quizId: idSchema,
  learnerId: idSchema,
  attemptNumber: z.number().int().positive(),
  score: z.number(),
  totalPoints: z.number().int(),
  passed: z.boolean(),
  startedAt: dateSchema,
  submittedAt: dateSchema.nullable(),
  timeSpentSeconds: z.number().int().nullable(),
})

export type QuizAttemptSummary = z.infer<typeof quizAttemptSummarySchema>

/**
 * A quiz as a learner may see it.
 *
 * There is no field here that could hold an answer key. That is a stronger
 * guarantee than omitting one: a shape that cannot express the key cannot leak
 * it by accident, and a reviewer reading this type can see that at a glance.
 */
export const publicQuizSchema = z.object({
  id: idSchema,
  lessonId: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  passingPercent: z.number().int().min(0).max(100),
  maxAttempts: z.number().int().nullable(),
  timeLimitMinutes: z.number().int().nullable(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  isMockTest: z.boolean(),
  sections: z.array(
    z.object({ id: idSchema, title: z.string(), position: z.number().int() }),
  ),
  questions: z.array(
    z.object({
      id: idSchema,
      prompt: z.string(),
      questionType: questionTypeSchema,
      options: z.array(z.string()),
      points: z.number().int(),
      sectionId: idSchema.nullable(),
      position: z.number().int(),
    }),
  ),
  /**
   * The learner's own completed attempts.
   *
   * Summaries, and the cycle that made this a problem is gone: an attempt
   * summary names the quiz, and the quiz named its attempts, so `z.lazy` was
   * needed to type-check and the generated OpenAPI document expanded it
   * recursively past half a megabyte — unusable as a reviewable file and as
   * input to a client generator.
   *
   * The fix was to stop the attempt summary naming its quiz. Every attempt here
   * is reached through the quiz that returned it, so the back-reference bought
   * nothing and cost the document.
   */
  attempts: z.array(quizAttemptSummarySchema),
  attemptsRemaining: z.number().int().nullable(),
  bestScore: z.number(),
  hasPassed: z.boolean(),
  openAttempt: z
    .object({
      id: idSchema,
      startedAt: z.string(),
      remainingSeconds: z.number().int().nullable(),
    })
    .nullable(),
})

export type PublicQuiz = z.infer<typeof publicQuizSchema>

/**
 * A graded attempt.
 *
 * `pointsEarned` may be negative — negative marking is real information a
 * learner should see — while the attempt's own `score` is clamped at zero by
 * the domain. The two differ on purpose and the difference is documented at the
 * grading engine.
 */
export const quizAttemptResultSchema = z.object({
  attempt: quizAttemptSummarySchema,
  percent: z.number().min(0).max(100),
  questions: z.array(
    z.object({
      questionId: idSchema,
      prompt: z.string(),
      questionType: z.string(),
      submitted: z.object({
        answer: z.string(),
        answers: z.array(z.string()),
      }),
      isCorrect: z.boolean(),
      pointsEarned: z.number(),
      points: z.number().int(),
      /** Authored for the learner, so it is shown. The key is not. */
      explanation: z.string().nullable(),
    }),
  ),
})

export type QuizAttemptResult = z.infer<typeof quizAttemptResultSchema>

export const submissionSummarySchema = z.object({
  id: idSchema,
  assignmentId: idSchema,
  learnerId: idSchema,
  content: z.string().nullable(),
  fileUrl: z.string().nullable(),
  grade: z.number().nullable(),
  feedback: z.string().nullable(),
  gradedAt: dateSchema.nullable(),
  gradedById: idSchema.nullable(),
  submittedAt: dateSchema,
  updatedAt: dateSchema,
})

export type SubmissionSummary = z.infer<typeof submissionSummarySchema>

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

/**
 * The public verification view.
 *
 * A closed shape rather than a projection of the certificateSchema row, so a column
 * added to `Certificate` cannot arrive here by default. Note what is absent: the
 * learner's email, the learner id, the academy id, and the completion evidence.
 * "Anyone may verify" is not "anyone may enumerate".
 */
export const publicCertificateSchema = z.object({
  verificationId: z.string(),
  status: z.enum(['VALID', 'REVOKED']),
  title: z.string(),
  recipientName: z.string(),
  issuedAt: isoDateSchema,
  academy: z.object({ name: z.string(), slug: z.string() }),
  revocationReason: z.string().nullable(),
})

export type PublicCertificate = z.infer<typeof publicCertificateSchema>

export const certificateSchema = z.object({
  id: idSchema,
  courseId: idSchema,
  title: z.string(),
  recipientName: z.string(),
  verificationId: z.string(),
  issuedAt: dateSchema,
  revokedAt: dateSchema.nullable(),
})

export type Certificate = z.infer<typeof certificateSchema>
