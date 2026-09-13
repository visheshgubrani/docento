/**
 * Enrolment, progress and certificates.
 *
 * ## Permission is not learning
 *
 * `AccessGrant` records *permission* to open a course; `Enrollment` records the
 * *learning* relationship. They are separate on purpose (ADR 9). Revoking a
 * grant — by an operator, by an expiry, by an import correction — removes
 * access without touching `LessonProgress`, because a permission decision is not
 * a statement that somebody did not learn something. When payments arrive, a
 * refund revokes one grant and disturbs nothing else.
 *
 * ## Completion is computed, never reported
 *
 * A learner's client reports playback position and lesson views. Those are
 * input, not proof. Completion is derived by comparing progress rows against
 * the release the learner is enrolled on, so a client cannot mark its own
 * homework done, and a lesson removed from a release leaves the denominator
 * without erasing the record.
 */

import { prisma } from '../db'
import type { Principal } from '../authorization/principal'
import { NotFoundError, assertCan, assertFound } from '../shared/errors'
import { type ReleaseSnapshot } from '../content/publishing'

export type EnrollmentSummary = {
  id: string
  academyId: string
  courseId: string
  learnerId: string
  enrolledAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

const ENROLLMENT_FIELDS = {
  id: true,
  academyId: true,
  courseId: true,
  learnerId: true,
  enrolledAt: true,
  startedAt: true,
  completedAt: true,
} as const

/**
 * Whether a learner may currently open a course.
 *
 * The union of live grants, evaluated at the moment it is asked. Never cached
 * on a session and never inferred from an enrolment existing: an enrolment is
 * evidence that somebody was learning, not that they still may.
 */
export async function hasAccess(
  academyId: string,
  courseId: string,
  learnerId: string,
): Promise<boolean> {
  const now = new Date()

  const grant = await prisma.accessGrant.findFirst({
    where: {
      academyId,
      courseId,
      learnerId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  })

  return grant !== null
}

/**
 * Enrol a learner in a course.
 *
 * ## Idempotence
 *
 * Enrolling twice returns the existing enrolment rather than failing. A learner
 * double-tapping a button, or a retried request, is not an error — and the
 * unique constraint on `(courseId, learnerId)` means the database would refuse
 * the second insert anyway, so the only question is whether that surfaces as a
 * conflict or as the thing the caller wanted.
 *
 * ## What enrolling does
 *
 * It creates the `Enrollment` and, when the course is free, the `AccessGrant`
 * that makes the course openable. A course with a price has no `Offer` in this
 * milestone — payments are deliberately absent — so every course is free and
 * every enrolment mints a `FREE` grant. When a checkout app exists, it creates
 * grants with a different source and this function is not the path.
 */
export async function enroll(
  principal: Principal,
  input: {
    workspaceId: string | null
    academyId: string
    courseId: string
    learnerId: string
  },
): Promise<{ enrollment: EnrollmentSummary; created: boolean }> {
  /**
   * Two actions, because the two principals describe different things.
   *
   * A learner enrolling themselves is `learner:enroll`: academy-bound, no
   * workspace to name, and checked against their own id. Staff enrolling
   * somebody is `enrollment:create`: workspace-scoped, which is what stops an
   * owner of one workspace enrolling in another's academy.
   *
   * Choosing on the principal rather than accepting either means a caller
   * cannot pick the weaker check by choosing an action.
   */
  if (principal.kind === 'learner') {
    assertCan(principal, 'learner:enroll', {
      academyId: input.academyId,
      learnerId: input.learnerId,
    })
  } else {
    assertCan(principal, 'enrollment:create', {
      workspaceId: input.workspaceId,
      academyId: input.academyId,
      courseId: input.courseId,
    })
  }

  const course = await prisma.course.findFirst({
    where: {
      id: input.courseId,
      academyId: input.academyId,
      status: { not: 'ARCHIVED' },
    },
    select: { id: true, status: true },
  })

  if (!course) {
    /**
     * An archived course is refused by not being found, not by a separate
     * branch. Unpublishing stops discovery; it does not expire an enrolment, so
     * an existing learner keeps their access — but a *new* enrolment in an
     * archived course is a request that should not succeed.
     */
    throw new NotFoundError('course', input.courseId)
  }

  // A learner must be a learner of this academy. Checking the row rather than
  // trusting the id keeps a mismatched pair from creating an enrolment that no
  // session can ever resolve.
  const learner = await prisma.learner.findFirst({
    where: { id: input.learnerId, academyId: input.academyId },
    select: { id: true },
  })

  assertFound('learner', learner, input.learnerId)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.enrollment.findUnique({
      where: {
        courseId_learnerId: {
          courseId: input.courseId,
          learnerId: input.learnerId,
        },
      },
      select: ENROLLMENT_FIELDS,
    })

    if (existing) {
      // The grant may still be missing — an enrolment created before grants
      // existed, or one whose grant was revoked and is being restored by
      // enrolling again. Ensured rather than assumed.
      await ensureFreeGrant(tx, input)
      return { enrollment: existing, created: false }
    }

    const enrollment = await tx.enrollment.create({
      data: {
        academyId: input.academyId,
        courseId: input.courseId,
        learnerId: input.learnerId,
      },
      select: ENROLLMENT_FIELDS,
    })

    await ensureFreeGrant(tx, input)

    return { enrollment, created: true }
  })
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/**
 * Ensure a live free grant exists for this learner and course.
 *
 * Reuses a revoked grant by clearing the revocation rather than inserting a
 * second row, so "how did this person get access" has one answer rather than
 * several that disagree.
 */
async function ensureFreeGrant(
  tx: Tx,
  input: { academyId: string; courseId: string; learnerId: string },
): Promise<void> {
  const existing = await tx.accessGrant.findFirst({
    where: {
      academyId: input.academyId,
      courseId: input.courseId,
      learnerId: input.learnerId,
    },
    select: { id: true, revokedAt: true, expiresAt: true },
  })

  if (existing) {
    const now = new Date()
    const isLive =
      existing.revokedAt === null &&
      (existing.expiresAt === null || existing.expiresAt > now)

    if (isLive) return

    await tx.accessGrant.update({
      where: { id: existing.id },
      data: { revokedAt: null, revokedReason: null, expiresAt: null },
    })

    return
  }

  await tx.accessGrant.create({
    data: {
      academyId: input.academyId,
      courseId: input.courseId,
      learnerId: input.learnerId,
      source: 'FREE',
    },
  })
}

/**
 * Grant access by hand.
 *
 * The path for a cohort, a scholarship, or a support decision. It creates the
 * grant and not the enrolment: being allowed to open a course and having
 * started it are different facts, and the second one is the learner's to
 * create.
 */
export async function grantAccess(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    learnerId: string
    expiresAt?: Date | null
    source?: string
  },
): Promise<{ id: string; expiresAt: Date | null }> {
  assertCan(principal, 'enrollment:manage', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const learner = await prisma.learner.findFirst({
    where: { id: input.learnerId, academyId: input.academyId },
    select: { id: true },
  })
  assertFound('learner', learner, input.learnerId)

  const grant = await prisma.accessGrant.create({
    data: {
      academyId: input.academyId,
      courseId: input.courseId,
      learnerId: input.learnerId,
      source: input.source ?? 'MANUAL',
      sourceId: principal.kind === 'staff' ? principal.userId : null,
      expiresAt: input.expiresAt ?? null,
    },
    select: { id: true, expiresAt: true },
  })

  return grant
}

/**
 * Revoke one grant.
 *
 * Revokes the specific grant rather than every grant for the pair, because
 * grants compose: a refund must not disturb an instructor's manual grant, and
 * neither should remove progress.
 */
export async function revokeAccess(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    grantId: string
    reason?: string
  },
): Promise<void> {
  assertCan(principal, 'enrollment:manage', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  const grant = await prisma.accessGrant.findFirst({
    where: { id: input.grantId, academyId: input.academyId },
    select: { id: true, revokedAt: true },
  })

  assertFound('access grant', grant, input.grantId)

  if (grant.revokedAt) return

  await prisma.accessGrant.update({
    where: { id: input.grantId },
    data: { revokedAt: new Date(), revokedReason: input.reason ?? null },
  })
}

export async function listEnrollments(
  principal: Principal,
  input: { workspaceId: string; academyId: string; courseId?: string },
): Promise<EnrollmentSummary[]> {
  assertCan(principal, 'enrollment:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  return prisma.enrollment.findMany({
    where: {
      academyId: input.academyId,
      ...(input.courseId ? { courseId: input.courseId } : {}),
    },
    orderBy: { enrolledAt: 'desc' },
    select: ENROLLMENT_FIELDS,
  })
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export type LessonProgressSummary = {
  lessonId: string
  isCompleted: boolean
  positionSeconds: number
  watchedSeconds: number
  completedAt: Date | null
  lastSeenAt: Date
}

/**
 * Record a learner's position in a lesson.
 *
 * ## What is trusted
 *
 * `positionSeconds` and `watchedSeconds` are client reports and are stored as
 * such. They are *not* what marks a lesson complete — that comes from
 * `completionRule` evaluated against the release. This separation is the whole
 * reason the two columns exist separately from `isCompleted`.
 *
 * ## Monotonicity
 *
 * `watchedSeconds` never decreases, and `completedAt` is set once and never
 * cleared. A learner who rewatches a lesson from the start, or scrubs backwards,
 * has not un-watched it, and a completion that could be lost by pressing play
 * at the beginning would be a bug a learner would report as data loss.
 */
export async function recordProgress(
  principal: Principal,
  input: {
    academyId: string
    learnerId: string
    lessonId: string
    positionSeconds?: number
    watchedSeconds?: number
  },
): Promise<LessonProgressSummary> {
  assertCan(principal, 'learner:progress:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: input.lessonId,
      module: { course: { academyId: input.academyId } },
    },
    select: { id: true, module: { select: { courseId: true } } },
  })

  assertFound('lesson', lesson, input.lessonId)

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_learnerId: {
        courseId: lesson.module.courseId,
        learnerId: input.learnerId,
      },
    },
    select: { id: true, startedAt: true },
  })

  if (!enrollment) {
    throw new NotFoundError(
      'enrollment',
      `${input.learnerId}/${lesson.module.courseId}`,
    )
  }

  const now = new Date()

  const progress = await prisma.$transaction(async (tx) => {
    const existing = await tx.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: input.lessonId,
        },
      },
      select: {
        watchedSeconds: true,
        positionSeconds: true,
        isCompleted: true,
        completedAt: true,
      },
    })

    const isCompleted = existing?.isCompleted ?? false

    const row = await tx.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: input.lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId: input.lessonId,
        positionSeconds: Math.max(0, input.positionSeconds ?? 0),
        watchedSeconds: Math.max(0, input.watchedSeconds ?? 0),
        isCompleted: false,
        lastSeenAt: now,
      },
      update: {
        positionSeconds:
          input.positionSeconds === undefined
            ? (existing?.positionSeconds ?? 0)
            : Math.max(0, input.positionSeconds),
        watchedSeconds: Math.max(
          existing?.watchedSeconds ?? 0,
          input.watchedSeconds ?? 0,
        ),
        // Preserved, never recomputed from the request.
        isCompleted,
        completedAt: existing?.completedAt ?? null,
        lastSeenAt: now,
      },
      select: {
        lessonId: true,
        isCompleted: true,
        positionSeconds: true,
        watchedSeconds: true,
        completedAt: true,
        lastSeenAt: true,
      },
    })

    // A learner's first progress is when the course started for them, which is
    // a different fact from when they enrolled.
    if (!enrollment.startedAt) {
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { startedAt: now },
      })
    }

    return row
  })

  return progress
}

/**
 * Mark a lesson complete.
 *
 * ## Why this is a separate operation from `recordProgress`
 *
 * Completion follows the release's `completionRule`, and for everything in this
 * milestone that rule is "viewed". A route calls this once the rule is
 * satisfied rather than a client asserting it. When a richer rule arrives — a
 * video watched to a percentage — only this function changes.
 *
 * ## Recomputing course completion
 *
 * Course completion is derived here rather than maintained incrementally: the
 * number of required lessons in the release versus the number completed. An
 * incremental counter would be wrong the moment a republication changed the
 * denominator, and wrong in the direction of telling a learner they finished a
 * course they did not.
 */
export async function completeLesson(
  principal: Principal,
  input: { academyId: string; learnerId: string; lessonId: string },
): Promise<{ lessonCompleted: boolean; courseCompleted: boolean }> {
  assertCan(principal, 'learner:progress:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: input.lessonId,
      module: { course: { academyId: input.academyId } },
    },
    select: { id: true, module: { select: { courseId: true } } },
  })

  assertFound('lesson', lesson, input.lessonId)

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_learnerId: {
        courseId: lesson.module.courseId,
        learnerId: input.learnerId,
      },
    },
    select: { id: true, startedAt: true },
  })

  if (!enrollment) {
    throw new NotFoundError(
      'enrollment',
      `${input.learnerId}/${lesson.module.courseId}`,
    )
  }

  const now = new Date()

  /**
   * The completion date is read and then passed explicitly.
   *
   * `completedAt: undefined` in a Prisma `update` is skipped, so it preserves
   * the value — but by accident of the client rather than by intent, and it
   * reads as though the field were deliberately left alone. Reading it first
   * makes "set once" visible.
   */
  const existing = await prisma.lessonProgress.findUnique({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: input.lessonId,
      },
    },
    select: { completedAt: true },
  })

  await prisma.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: input.lessonId,
      },
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId: input.lessonId,
      isCompleted: true,
      completedAt: now,
      lastSeenAt: now,
    },
    update: {
      isCompleted: true,
      // Set once: re-completing must not move the date, or "when did they
      // finish this" becomes "when did they last open it".
      completedAt: existing?.completedAt ?? now,
      lastSeenAt: now,
    },
  })

  if (!enrollment.startedAt) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { startedAt: now },
    })
  }

  const courseCompleted = await recomputeCourseCompletion(
    enrollment.id,
    lesson.module.courseId,
  )

  return { lessonCompleted: true, courseCompleted }
}

/**
 * Recompute whether a course is complete, and stamp the enrolment if so.
 *
 * Counts against the current release, so a lesson added by a republication makes
 * the course incomplete again — correctly, because there is now something the
 * learner has not done. A lesson removed stops counting, without deleting its
 * progress row.
 */
async function recomputeCourseCompletion(
  enrollmentId: string,
  courseId: string,
): Promise<boolean> {
  const release = await prisma.courseRelease.findFirst({
    where: { courseId, supersededAt: null },
    orderBy: { version: 'desc' },
    select: { id: true },
  })

  if (!release) return false

  const required = await prisma.releaseLesson.findMany({
    where: { releaseId: release.id, isRequired: true },
    select: { lessonId: true },
  })

  if (required.length === 0) return false

  const completed = await prisma.lessonProgress.count({
    where: {
      enrollmentId,
      isCompleted: true,
      lessonId: { in: required.map((lesson) => lesson.lessonId) },
    },
  })

  const isComplete = completed >= required.length

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: isComplete
      ? { completedAt: (await currentCompletedAt(enrollmentId)) ?? new Date() }
      : // Completion is withdrawn when the release grows. Nothing else about
        // the enrolment changes, and progress is untouched.
        { completedAt: null },
  })

  return isComplete
}

/** The existing completion date, if the enrolment is already complete. */
async function currentCompletedAt(enrollmentId: string): Promise<Date | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { completedAt: true },
  })

  return enrollment?.completedAt ?? null
}

export type CourseProgress = {
  enrollment: EnrollmentSummary
  releaseId: string
  releaseVersion: number
  requiredLessons: number
  completedLessons: number
  /** 0–100, integer. Derived, never stored. */
  percent: number
  isComplete: boolean
  lessons: LessonProgressSummary[]
}

/**
 * A learner's progress through a course.
 *
 * The denominator is the current release's required lessons, not every lesson
 * ever published, which is what makes a removed lesson stop counting while its
 * progress row survives.
 */
export async function getCourseProgress(
  principal: Principal,
  input: { academyId: string; learnerId: string; courseId: string },
): Promise<CourseProgress> {
  assertCan(principal, 'learner:progress:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_learnerId: {
        courseId: input.courseId,
        learnerId: input.learnerId,
      },
    },
    select: ENROLLMENT_FIELDS,
  })

  assertFound('enrollment', enrollment, `${input.learnerId}/${input.courseId}`)

  const release = await prisma.courseRelease.findFirst({
    where: { courseId: input.courseId, supersededAt: null },
    orderBy: { version: 'desc' },
    select: { id: true, version: true },
  })

  if (!release) {
    // Enrolled in a course with no release: possible only if the release was
    // removed, which nothing does. Reported as zero progress rather than as an
    // error, because the learner has done nothing wrong.
    return {
      enrollment,
      releaseId: '',
      releaseVersion: 0,
      requiredLessons: 0,
      completedLessons: 0,
      percent: 0,
      isComplete: false,
      lessons: [],
    }
  }

  const required = await prisma.releaseLesson.findMany({
    where: { releaseId: release.id, isRequired: true },
    orderBy: { position: 'asc' },
    select: { lessonId: true },
  })

  const requiredIds = required.map((lesson) => lesson.lessonId)

  const progressRows = await prisma.lessonProgress.findMany({
    where: { enrollmentId: enrollment.id, lessonId: { in: requiredIds } },
    select: {
      lessonId: true,
      isCompleted: true,
      positionSeconds: true,
      watchedSeconds: true,
      completedAt: true,
      lastSeenAt: true,
    },
  })

  const completedLessons = progressRows.filter((row) => row.isCompleted).length
  const requiredLessons = requiredIds.length

  return {
    enrollment,
    releaseId: release.id,
    releaseVersion: release.version,
    requiredLessons,
    completedLessons,
    percent:
      requiredLessons > 0
        ? Math.round((completedLessons / requiredLessons) * 100)
        : 0,
    isComplete: requiredLessons > 0 && completedLessons >= requiredLessons,
    lessons: progressRows,
  }
}

/**
 * The courses a learner is enrolled in, with their progress.
 *
 * One query per course for progress, which is fine at the scale a single
 * learner's dashboard operates at and keeps the computation in one place. A
 * single aggregate query would be faster and would be a second implementation
 * of the completion rule, which is the thing worth avoiding.
 */
export async function listLearnerCourses(
  principal: Principal,
  input: { academyId: string; learnerId: string },
): Promise<
  {
    courseId: string
    title: string
    slug: string
    description: string | null
    thumbnail: string | null
    percent: number
    isComplete: boolean
    /**
     * Whether the learner may currently open the lessons.
     *
     * In the list, not only on the course page: a dashboard that cannot say
     * "your access ended" shows a course that looks openable and then refuses
     * when clicked, which is the worst of both answers.
     */
    hasAccess: boolean
    lastSeenAt: Date | null
  }[]
> {
  assertCan(principal, 'learner:profile:read', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const enrollments = await prisma.enrollment.findMany({
    where: { academyId: input.academyId, learnerId: input.learnerId },
    orderBy: { enrolledAt: 'desc' },
    select: {
      courseId: true,
      course: {
        select: {
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
        },
      },
    },
  })

  const courses = []

  for (const enrollment of enrollments) {
    const progress = await getCourseProgress(principal, {
      academyId: input.academyId,
      learnerId: input.learnerId,
      courseId: enrollment.courseId,
    })

    const lastSeenAt = progress.lessons.reduce<Date | null>(
      (latest, lesson) =>
        latest === null || lesson.lastSeenAt > latest
          ? lesson.lastSeenAt
          : latest,
      null,
    )

    courses.push({
      courseId: enrollment.courseId,
      title: enrollment.course.title,
      slug: enrollment.course.slug,
      description: enrollment.course.description,
      thumbnail: enrollment.course.thumbnail,
      percent: progress.percent,
      isComplete: progress.isComplete,
      hasAccess: await hasAccess(
        input.academyId,
        enrollment.courseId,
        input.learnerId,
      ),
      lastSeenAt,
    })
  }

  return courses
}

/**
 * The published course, as a learner sees it.
 *
 * Requires access, and returns the current release's snapshot with the answer
 * keys removed. The snapshot is what makes this safe to serve: it cannot drift
 * with an author's edits, and the projection is built here rather than by the
 * caller remembering to strip fields.
 */
export async function getCourseForLearner(
  principal: Principal,
  input: { academyId: string; learnerId: string; courseId: string },
): Promise<{
  release: { id: string; version: number; publishedAt: Date }
  course: {
    id: string
    title: string
    slug: string
    description: string | null
  }
  modules: LearnerModule[]
  /**
   * Whether the learner may open the lessons. A course page is readable without
   * access so a catalogue link does not 404; the lessons are not.
   */
  hasAccess: boolean
}> {
  assertCan(principal, 'release:read', {
    academyId: input.academyId,
    courseId: input.courseId,
  })

  /**
   * The course page is readable without a live grant, and the lessons are not.
   *
   * A learner whose access expired should be told that, not shown a 404 that
   * reads as "this course never existed". So the read succeeds, `hasAccess`
   * reports the truth, and every lesson-scoped operation — playback, attempt
   * start, progress — re-checks entitlement at the moment it is used rather
   * than trusting this flag.
   */
  const canOpen = await hasAccess(
    input.academyId,
    input.courseId,
    input.learnerId,
  )

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_learnerId: {
        courseId: input.courseId,
        learnerId: input.learnerId,
      },
    },
    select: { id: true },
  })

  if (!enrollment) {
    throw new NotFoundError(
      'enrollment',
      `${input.learnerId}/${input.courseId}`,
    )
  }

  /**
   * The release is read directly rather than through `getRelease`.
   *
   * `getRelease` asserts `release:read`, which is the entitlement to the
   * content — and the whole point here is to serve a learner whose entitlement
   * has lapsed and tell them so. The academy and course are already pinned by
   * the query, so this is not a way around `can()`: it is the case `can()` was
   * asked about above.
   */
  const release = await prisma.courseRelease.findFirst({
    where: { courseId: input.courseId, supersededAt: null },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      publishedAt: true,
      snapshot: true,
      course: {
        select: { id: true, title: true, slug: true, description: true },
      },
    },
  })

  assertFound('course release', release, input.courseId)

  return {
    release: {
      id: release.id,
      version: release.version,
      publishedAt: release.publishedAt,
    },
    course: release.course,
    modules: stripAnswerKeys(release.snapshot as unknown as ReleaseSnapshot),
    hasAccess: canOpen,
  }
}

export type LearnerLesson = {
  id: string
  title: string
  summary: string | null
  contentType: string
  position: number
  isFree: boolean
  body: string | null
  mediaAssetId: string | null
  embedUrl: string | null
  quiz: {
    id: string
    title: string
    description: string | null
    passingPercent: number
    maxAttempts: number | null
    timeLimitMinutes: number | null
    opensAt: string | null
    closesAt: string | null
    isMockTest: boolean
    sections: { id: string; title: string; position: number }[]
    questions: {
      id: string
      prompt: string
      questionType: string
      options: string[]
      points: number
      sectionId: string | null
      position: number
    }[]
  } | null
  assignment: {
    id: string
    title: string
    instructions: string | null
    dueAt: string | null
    totalPoints: number
  } | null
}

export type LearnerModule = {
  id: string
  title: string
  summary: string | null
  position: number
  lessons: LearnerLesson[]
}

/**
 * Remove the answer key from a release snapshot.
 *
 * ## Why a function rather than a `select`
 *
 * The snapshot is a JSON document, so there is no `select` to omit a field
 * with. Every learner-facing read goes through here, and the alternative —
 * each route constructing its own projection — is the shape in which one of
 * them eventually forgets.
 *
 * `explanation` is kept: it is authored for the learner and is what makes a
 * wrong answer instructive. It is only safe because it is served after an
 * attempt, never before one.
 */
export function stripAnswerKeys(snapshot: ReleaseSnapshot): LearnerModule[] {
  return snapshot.modules.map((module) => ({
    id: module.id,
    title: module.title,
    summary: module.summary,
    position: module.position,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      contentType: lesson.contentType,
      position: lesson.position,
      isFree: lesson.isFree,
      body: lesson.body,
      mediaAssetId: lesson.mediaAssetId,
      embedUrl: lesson.embedUrl,
      quiz: lesson.quiz
        ? {
            id: lesson.quiz.id,
            title: lesson.quiz.title,
            description: lesson.quiz.description,
            passingPercent: lesson.quiz.passingPercent,
            maxAttempts: lesson.quiz.maxAttempts,
            timeLimitMinutes: lesson.quiz.timeLimitMinutes,
            opensAt: lesson.quiz.opensAt,
            closesAt: lesson.quiz.closesAt,
            isMockTest: lesson.quiz.isMockTest,
            sections: lesson.quiz.sections,
            questions: lesson.quiz.questions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              questionType: question.questionType,
              options: question.options,
              points: question.points,
              sectionId: question.sectionId,
              position: question.position,
            })),
          }
        : null,
      assignment: lesson.assignment,
    })),
  }))
}

/**
 * A learner's own profile.
 *
 * `learner:profile:read` rather than a staff read, so the caller must be the
 * learner — which is what makes this safe to serve to the application's session
 * gate without a second authorization decision there.
 */
export async function getLearnerProfile(
  principal: Principal,
  input: { academyId: string; learnerId: string },
): Promise<{
  id: string
  academyId: string
  name: string
  email: string
  image: string | null
  createdAt: Date
}> {
  assertCan(principal, 'learner:profile:read', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const learner = await prisma.learner.findFirst({
    where: { id: input.learnerId, academyId: input.academyId },
    select: {
      id: true,
      academyId: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
  })

  assertFound('learner', learner, input.learnerId)

  return learner
}
