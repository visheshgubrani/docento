/**
 * Publishing, and reading a released course.
 *
 * Publishing is the operation this milestone has no precedent for: the legacy
 * application toggled a boolean, which meant a learner's course could change
 * under them mid-lesson and a graded quiz could be regraded by an edit. A
 * release is a snapshot instead, and it is immutable — publishing again creates
 * a new version rather than changing the old one.
 *
 * ## What a release contains
 *
 * `CourseRelease.snapshot` holds the whole curriculum as a JSON document: every
 * module, every lesson, the quiz questions and the assignment. It is redundant
 * with the draft rows on purpose. `ReleaseLesson` rows carry the stable lesson
 * ids and the ordering, so the questions "what is in this release" and "which
 * lessons does progress count" are answerable with a query rather than by
 * parsing JSON.
 *
 * ## Snapshot shape
 *
 * The snapshot is not the draft's shape. It carries only what a learner needs
 * and only what grading needs, which is what keeps something added to the draft
 * for authoring convenience from silently becoming learner-visible.
 */

import { prisma } from '../db.js'
import type { Principal } from '../authorization/principal.js'
import type {
  GradingSnapshot,
  QuestionMarking,
  QuizMarking,
} from '../assessment/grading.js'
import {
  ConflictError,
  DomainRuleError,
  assertCan,
  assertFound,
} from '../shared/errors.js'

/** A quiz question as a release stores it. */
export type SnapshotQuestion = {
  id: string
  prompt: string
  questionType: QuestionMarking['questionType']
  options: string[]
  explanation: string | null
  points: number
  sectionId: string | null
  position: number
  /** Never served to a learner before an attempt is submitted. */
  marking: QuestionMarking
}

export type SnapshotQuiz = {
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
  questions: SnapshotQuestion[]
  /**
   * The quiz-level marking rules, recorded rather than inferred at grading
   * time. Inferring "negative marking is on" from "some question deducts
   * something" reads back as off for a quiz that deducts on questions whose
   * value is zero, which is a real configuration.
   */
  quizMarking: QuizMarking
}

export type SnapshotAssignment = {
  id: string
  title: string
  instructions: string | null
  dueAt: string | null
  totalPoints: number
}

export type SnapshotLesson = {
  id: string
  title: string
  summary: string | null
  contentType: string
  position: number
  isFree: boolean
  /** Rich text for TEXT lessons. */
  body: string | null
  mediaAssetId: string | null
  embedUrl: string | null
  /** Server-side completion rule. Client playback reports are input, not proof. */
  completionRule: {
    type: 'VIEW' | 'SCROLL' | 'MANUAL'
    thresholdPercent?: number
  }
  quiz: SnapshotQuiz | null
  assignment: SnapshotAssignment | null
}

export type SnapshotModule = {
  id: string
  title: string
  summary: string | null
  position: number
  lessons: SnapshotLesson[]
}

export type ReleaseSnapshot = {
  /** Format version, so a reader can tell what it is looking at. */
  version: 1
  courseId: string
  title: string
  description: string | null
  modules: SnapshotModule[]
  /** Totals computed at publish time, so a catalogue read needs no snapshot parse. */
  totals: {
    modules: number
    lessons: number
    /** Estimated minutes, from quiz time limits and nothing else for now. */
    quizMinutes: number
  }
}

export type ReleaseSummary = {
  id: string
  courseId: string
  version: number
  publishedAt: Date
  supersededAt: Date | null
}

const RELEASE_FIELDS = {
  id: true,
  courseId: true,
  version: true,
  publishedAt: true,
  supersededAt: true,
} as const

/**
 * Build the snapshot for a course's current draft.
 *
 * Separated from the write so the shape can be asserted in tests without
 * publishing anything, and so a future export or preview reuses it rather than
 * reimplementing the traversal.
 */
export async function buildReleaseSnapshot(
  courseId: string,
): Promise<ReleaseSnapshot> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      modules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          summary: true,
          position: true,
          lessons: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              title: true,
              summary: true,
              contentType: true,
              position: true,
              isFree: true,
              body: true,
              mediaAssetId: true,
              embedUrl: true,
              quiz: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  passingPercent: true,
                  maxAttempts: true,
                  timeLimitMinutes: true,
                  opensAt: true,
                  closesAt: true,
                  isMockTest: true,
                  negativeMarking: true,
                  defaultNegativeMark: true,
                  sections: {
                    orderBy: { position: 'asc' },
                    select: { id: true, title: true, position: true },
                  },
                  questions: {
                    orderBy: { position: 'asc' },
                    select: {
                      id: true,
                      prompt: true,
                      questionType: true,
                      options: true,
                      correctAnswer: true,
                      correctAnswers: true,
                      explanation: true,
                      points: true,
                      negativePoints: true,
                      partialMarking: true,
                      sectionId: true,
                      position: true,
                      reviewStatus: true,
                    },
                  },
                },
              },
              assignment: {
                select: {
                  id: true,
                  title: true,
                  instructions: true,
                  dueAt: true,
                  totalPoints: true,
                },
              },
            },
          },
        },
      },
    },
  })

  assertFound('course', course, courseId)

  let lessonCount = 0
  let quizMinutes = 0

  const modules: SnapshotModule[] = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    summary: module.summary,
    position: module.position,
    lessons: module.lessons.map((lesson) => {
      lessonCount += 1

      let quiz: SnapshotQuiz | null = null

      if (lesson.quiz) {
        quizMinutes += lesson.quiz.timeLimitMinutes ?? 0

        quiz = {
          id: lesson.quiz.id,
          title: lesson.quiz.title,
          description: lesson.quiz.description,
          passingPercent: lesson.quiz.passingPercent,
          maxAttempts: lesson.quiz.maxAttempts,
          timeLimitMinutes: lesson.quiz.timeLimitMinutes,
          opensAt: lesson.quiz.opensAt?.toISOString() ?? null,
          closesAt: lesson.quiz.closesAt?.toISOString() ?? null,
          isMockTest: lesson.quiz.isMockTest,
          quizMarking: {
            negativeMarking: lesson.quiz.negativeMarking,
            defaultNegativeMark: lesson.quiz.defaultNegativeMark,
          },
          sections: lesson.quiz.sections,
          questions: lesson.quiz.questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            questionType:
              question.questionType as QuestionMarking['questionType'],
            options: asStringArray(question.options),
            explanation: question.explanation,
            points: question.points,
            sectionId: question.sectionId,
            position: question.position,
            marking: {
              questionType:
                question.questionType as QuestionMarking['questionType'],
              correctAnswer: question.correctAnswer,
              correctAnswers: question.correctAnswers,
              points: question.points,
              negativePoints: question.negativePoints,
              partialMarking: question.partialMarking,
            },
          })),
        }
      }

      return {
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        contentType: lesson.contentType,
        position: lesson.position,
        isFree: lesson.isFree,
        body: lesson.body,
        mediaAssetId: lesson.mediaAssetId,
        embedUrl: lesson.embedUrl,
        /**
         * Every lesson completes on view for now.
         *
         * The field exists in the schema and in the snapshot so that a richer
         * rule — a video watched to a percentage, a scrolled article — can be
         * added without changing the snapshot's shape, which would make old
         * releases unreadable.
         */
        completionRule: { type: 'VIEW' },
        quiz,
        /**
         * Dates become ISO strings in the snapshot.
         *
         * The snapshot is a JSON document, so a `Date` would be serialised on
         * write and deserialised as a string on read — a type that is a lie
         * until something calls a method on it. Converting here means the
         * stored shape and the read shape are the same shape.
         */
        assignment: lesson.assignment
          ? {
              ...lesson.assignment,
              dueAt: lesson.assignment.dueAt?.toISOString() ?? null,
            }
          : null,
      }
    }),
  }))

  return {
    version: 1,
    courseId: course.id,
    title: course.title,
    description: course.description,
    modules,
    totals: {
      modules: modules.length,
      lessons: lessonCount,
      quizMinutes,
    },
  }
}

/**
 * Prisma returns a JSON column as `unknown`; the schema comment is the only
 * thing promising it is an array of strings.
 */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.filter((entry): entry is string => typeof entry === 'string')
}

/**
 * Extract the grading rules a release should carry.
 *
 * Kept separate so the attempt path can snapshot from a release rather than
 * from live rows, and so the two shapes stay visibly the same thing.
 */
export function gradingSnapshotFrom(
  release: ReleaseSnapshot,
  lessonId: string,
): GradingSnapshot | null {
  const lesson = release.modules
    .flatMap((module) => module.lessons)
    .find((candidate) => candidate.id === lessonId)

  if (!lesson?.quiz) return null

  return {
    questions: lesson.quiz.questions.map((question) => ({
      questionId: question.id,
      marking: question.marking,
    })),
    quiz: lesson.quiz.quizMarking,
  }
}

/**
 * Publish the current draft as a new release.
 *
 * ## Validation
 *
 * A course with no lessons is refused: publishing it would put an empty course
 * in the catalogue, which is worse than an error message. A quiz with no
 * questions is refused for the same reason — a learner could open it and be
 * told they scored 0% on nothing.
 *
 * ## Idempotence
 *
 * Publishing an unchanged draft returns the existing release rather than
 * creating a version that is byte-identical to its predecessor. Without this, a
 * retried request — or an impatient double-click — fills the history with
 * duplicates and makes "what changed in v7" unanswerable.
 *
 * ## Atomicity
 *
 * Superseding the previous release and superseding its rows happen in the same
 * transaction as the new release. A partial failure would leave a course with
 * two current releases or none, and learners read "the current release".
 */
export async function publishCourse(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
  },
): Promise<ReleaseSummary & { unchanged: boolean }> {
  assertCan(principal, 'course:publish', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, academyId: input.academyId },
    select: { id: true, status: true },
  })
  assertFound('course', course, input.courseId)

  if (course.status === 'ARCHIVED') {
    throw new ConflictError(
      'course_archived',
      'This course is archived. Restore it before publishing.',
    )
  }

  const snapshot = await buildReleaseSnapshot(input.courseId)
  assertPublishable(snapshot)

  const current = await prisma.courseRelease.findFirst({
    where: { courseId: input.courseId, supersededAt: null },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, snapshot: true },
  })

  if (current && snapshotsMatch(current.snapshot, snapshot)) {
    const existing = await prisma.courseRelease.findUnique({
      where: { id: current.id },
      select: RELEASE_FIELDS,
    })

    assertFound('release', existing, current.id)

    return { ...existing, unchanged: true }
  }

  const nextVersion = (current?.version ?? 0) + 1

  return prisma.$transaction(async (tx) => {
    if (current) {
      await tx.courseRelease.update({
        where: { id: current.id },
        data: { supersededAt: new Date() },
      })
    }

    const release = await tx.courseRelease.create({
      data: {
        courseId: input.courseId,
        version: nextVersion,
        snapshot: snapshot as object,
        publishedById: principal.kind === 'staff' ? principal.userId : 'system',
      },
      select: RELEASE_FIELDS,
    })

    /**
     * One row per lesson, carrying the draft lesson's id.
     *
     * This is the stable identity that keeps progress attached to the right
     * content across releases, and it is why progress counts against a release
     * rather than against the draft.
     */
    /**
     * Positions are assigned across the whole release, not per module.
     *
     * `ReleaseLesson` is flat — modules are a draft concept — and its index is
     * `(releaseId, position)`, so a per-module counter would collide on the
     * second module.
     */
    const releaseLessons = snapshot.modules
      .flatMap((module) => module.lessons)
      .map((lesson, index) => ({
        releaseId: release.id,
        lessonId: lesson.id,
        title: lesson.title,
        contentType: lesson.contentType,
        position: index + 1,
        isRequired: true,
        completionRule: lesson.completionRule as object,
      }))

    if (releaseLessons.length > 0) {
      await tx.releaseLesson.createMany({ data: releaseLessons })
    }

    await tx.course.update({
      where: { id: input.courseId },
      data: { status: 'PUBLISHED' },
    })

    /**
     * Every enrolment is re-evaluated against the release it now follows.
     *
     * Adding a lesson makes a course incomplete for learners who had finished
     * it — correctly, because there is now something they have not done — and
     * removing one lets a learner who was one lesson short become complete.
     * Without this, `Enrollment.completedAt` would be a stale stamp that
     * disagrees with the derived progress on the dashboard, and a certificate
     * could refuse to issue for a learner the progress page says is finished.
     *
     * Done here rather than in a job so it is in the same transaction as the
     * release: a learner must never be following a release whose effect on
     * their completion has not been applied.
     */
    await recomputeEnrollments(tx, input.courseId, release.id)

    return { ...release, unchanged: false }
  })
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/**
 * Re-derive completion for every enrolment in a course.
 *
 * The rule is the one `completeLesson` applies, kept in one place by querying
 * the release's required lessons and comparing counts — not by asking each
 * enrolment's stored flag, which is exactly what may now be wrong.
 */
async function recomputeEnrollments(
  tx: Tx,
  courseId: string,
  releaseId: string,
): Promise<void> {
  const required = await tx.releaseLesson.findMany({
    where: { releaseId, isRequired: true },
    select: { lessonId: true },
  })

  const requiredIds = required.map((lesson) => lesson.lessonId)

  const enrollments = await tx.enrollment.findMany({
    where: { courseId },
    select: { id: true, completedAt: true },
  })

  if (enrollments.length === 0) return

  /**
   * A release with nothing required completes nobody.
   *
   * Vacuous truth would mark every enrolment complete, which is the same shape
   * of error the grading engine avoids for a question with no key: a data
   * problem must not manufacture a pass.
   */
  if (requiredIds.length === 0) {
    await tx.enrollment.updateMany({
      where: { courseId, completedAt: { not: null } },
      data: { completedAt: null },
    })
    return
  }

  const completedCounts = await tx.lessonProgress.groupBy({
    by: ['enrollmentId'],
    where: {
      enrollmentId: { in: enrollments.map((enrollment) => enrollment.id) },
      isCompleted: true,
      lessonId: { in: requiredIds },
    },
    _count: { _all: true },
  })

  const completedByEnrollment = new Map(
    completedCounts.map((row) => [row.enrollmentId, row._count._all]),
  )

  const now = new Date()

  for (const enrollment of enrollments) {
    const completed = completedByEnrollment.get(enrollment.id) ?? 0

    if (completed >= requiredIds.length) {
      if (enrollment.completedAt === null) {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: { completedAt: now },
        })
      }
      continue
    }

    if (enrollment.completedAt !== null) {
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { completedAt: null },
      })
    }
  }
}

/**
 * Structural comparison, used only to detect an unchanged republication.
 *
 * Canonical, because the column is `jsonb`: Postgres does not preserve key
 * order, so a stored snapshot read back is the same document with its keys
 * arranged differently. Comparing raw `JSON.stringify` output made every
 * republish look like a change, which is exactly the idempotence this is here
 * to provide.
 *
 * Sorting keys rather than hashing: the documents are small, this runs once per
 * publish, and a hash would need a canonical form anyway to be meaningful.
 */
function snapshotsMatch(stored: unknown, candidate: ReleaseSnapshot): boolean {
  return canonicalJson(stored) === canonicalJson(candidate)
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, sortKeysDeep(entry)]),
    )
  }

  return value
}

/** Refuse to publish something that would be worse in the catalogue than an error. */
function assertPublishable(snapshot: ReleaseSnapshot): void {
  const problems: { path: string; message: string }[] = []

  const lessons = snapshot.modules.flatMap((module) => module.lessons)

  if (snapshot.modules.length === 0) {
    problems.push({
      path: 'modules',
      message: 'a course needs at least one module',
    })
  }

  if (lessons.length === 0) {
    problems.push({
      path: 'lessons',
      message: 'a course needs at least one lesson',
    })
  }

  for (const module of snapshot.modules) {
    if (module.lessons.length === 0) {
      problems.push({
        path: `modules.${module.id}`,
        message: `"${module.title}" has no lessons`,
      })
    }
  }

  for (const lesson of lessons) {
    if (
      lesson.contentType === 'QUIZ' &&
      (!lesson.quiz || lesson.quiz.questions.length === 0)
    ) {
      problems.push({
        path: `lessons.${lesson.id}`,
        message: `"${lesson.title}" is a quiz with no questions`,
      })
    }

    if (
      lesson.contentType === 'TEXT' &&
      (lesson.body === null || lesson.body.trim().length === 0)
    ) {
      problems.push({
        path: `lessons.${lesson.id}`,
        message: `"${lesson.title}" is a text lesson with no content`,
      })
    }

    if (
      lesson.contentType === 'VIDEO' &&
      !lesson.mediaAssetId &&
      !lesson.embedUrl
    ) {
      problems.push({
        path: `lessons.${lesson.id}`,
        message: `"${lesson.title}" is a video lesson with no video`,
      })
    }
  }

  if (problems.length > 0) {
    throw new DomainRuleError(
      'course_not_publishable',
      'This course is not ready to publish.',
      problems,
    )
  }
}

/**
 * Read the release a learner should follow.
 *
 * A specific version when asked for one — a certificate has to say what it was
 * earned against — and otherwise the current release.
 */
export async function getRelease(
  principal: Principal,
  input: {
    workspaceId: string | null
    academyId: string
    courseId: string
    version?: number
  },
): Promise<{ release: ReleaseSummary; snapshot: ReleaseSnapshot }> {
  // A learner reads a release; staff read it too. `release:read` requires an
  // academy and a course, which is what makes an anonymous catalogue read a
  // separate action rather than a hole in this one.
  assertCan(principal, 'release:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const release = await prisma.courseRelease.findFirst({
    where: {
      courseId: input.courseId,
      ...(input.version === undefined
        ? { supersededAt: null }
        : { version: input.version }),
    },
    orderBy: { version: 'desc' },
    select: { ...RELEASE_FIELDS, snapshot: true },
  })

  assertFound('course release', release, String(input.version ?? 'current'))

  const { snapshot, ...summary } = release

  return { release: summary, snapshot: snapshot as unknown as ReleaseSnapshot }
}
