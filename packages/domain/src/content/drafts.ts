/**
 * Course, module and lesson authoring, and publishing.
 *
 * ## Drafts and releases
 *
 * Authors edit a **draft**: `Course`, `Module` and `Lesson` rows. Publishing
 * takes a snapshot into an immutable `CourseRelease` plus one `ReleaseLesson`
 * per lesson. Learners read releases, never drafts, so an author can edit
 * without a learner seeing a half-finished change, and a quiz already in
 * progress cannot be regraded by an edit published afterwards. See ADR 5.
 *
 * ## Why publishing snapshots rather than pointing at the draft
 *
 * A release that referenced live lesson rows would drift the moment the draft
 * changed. The snapshot costs some duplication and buys the only property that
 * matters here: a release means the same thing forever.
 *
 * ## Stable lesson identity
 *
 * A `ReleaseLesson` carries the draft `Lesson.id` rather than its own. That is
 * what keeps progress attached to the right content across republication: a
 * learner who completed "lesson 3" has completed it when the course is
 * republished, even if it moved, and a lesson removed from the draft leaves the
 * completion denominator without erasing the historical record.
 */

import { prisma } from '../db.js'
import type { Principal } from '../authorization/principal.js'
import {
  ConflictError,
  DomainRuleError,
  assertCan,
  assertFound,
} from '../shared/errors.js'
import { SLUG_PATTERN } from '../tenancy/resolve-academy.js'

export type CourseSummary = {
  id: string
  academyId: string
  title: string
  slug: string
  description: string | null
  thumbnail: string | null
  /** DRAFT | PUBLISHED | ARCHIVED */
  status: string
  createdAt: Date
  updatedAt: Date
}

const COURSE_FIELDS = {
  id: true,
  academyId: true,
  title: true,
  slug: true,
  description: true,
  thumbnail: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const

function assertCourseSlug(slug: string): string {
  const trimmed = slug.trim()

  if (!SLUG_PATTERN.test(trimmed)) {
    throw new DomainRuleError(
      'invalid_slug',
      'That course address cannot be used.',
      [
        {
          path: 'slug',
          message:
            'must be lowercase letters, digits and single hyphens, with no leading or trailing hyphen',
        },
      ],
    )
  }

  return trimmed
}

function assertTitle(title: string, field = 'title'): string {
  const trimmed = title.trim()

  if (trimmed.length === 0) {
    throw new DomainRuleError('invalid_title', 'A title is required.', [
      { path: field, message: 'is required' },
    ])
  }

  if (trimmed.length > 200) {
    throw new DomainRuleError('invalid_title', 'That title is too long.', [
      { path: field, message: 'must be at most 200 characters' },
    ])
  }

  return trimmed
}

/**
 * The next position in a list.
 *
 * Computed inside the transaction that inserts, so two authors adding a module
 * at once get 4 and 5 rather than both getting 4. A unique constraint on
 * `(courseId, position)` would be the stronger guarantee, but positions are
 * rewritten wholesale by reordering, so a transient collision is normal during
 * a reorder and a constraint would make reordering an exercise in deferring.
 *
 * Deliberately two typed functions rather than one generic over a table name:
 * a generic needs the identifier interpolated into the query, and an
 * interpolated identifier is one widened union away from being an injection.
 * Two four-line functions are cheaper than a class of bug.
 */
async function nextModulePosition(tx: Tx, courseId: string): Promise<number> {
  const aggregate = await tx.module.aggregate({
    where: { courseId },
    _max: { position: true },
  })

  return (aggregate._max.position ?? 0) + 1
}

async function nextLessonPosition(tx: Tx, moduleId: string): Promise<number> {
  const aggregate = await tx.lesson.aggregate({
    where: { moduleId },
    _max: { position: true },
  })

  return (aggregate._max.position ?? 0) + 1
}

/** The transaction client, named so the helpers above can take it. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

export async function createCourse(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    title: string
    slug: string
    description?: string | null
  },
): Promise<CourseSummary> {
  assertCan(principal, 'course:create', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  const slug = assertCourseSlug(input.slug)
  const title = assertTitle(input.title)

  const academy = await prisma.academy.findFirst({
    where: { id: input.academyId, workspaceId: input.workspaceId },
  })
  assertFound('academy', academy, input.academyId)

  const existing = await prisma.course.findUnique({
    where: { academyId_slug: { academyId: input.academyId, slug } },
  })

  if (existing) {
    throw new ConflictError(
      'slug_taken',
      `This academy already has a course at "${slug}".`,
    )
  }

  return prisma.course.create({
    data: {
      academyId: input.academyId,
      title,
      slug,
      description: input.description ?? null,
    },
    select: COURSE_FIELDS,
  })
}

/**
 * Read a course, draft or published.
 *
 * Available to staff who can read the workspace and to a learner with access to
 * the course — the caller decides which by the principal it passes. The academy
 * is always part of the query, so a course outside it is not merely refused but
 * not found.
 */
export async function getCourse(
  principal: Principal,
  input: { workspaceId: string; academyId: string; courseId: string },
): Promise<CourseSummary> {
  assertCan(principal, 'course:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, academyId: input.academyId },
    select: COURSE_FIELDS,
  })

  assertFound('course', course, input.courseId)

  return course
}

export async function listCourses(
  principal: Principal,
  input: { workspaceId: string; academyId: string; status?: string },
): Promise<CourseSummary[]> {
  assertCan(principal, 'course:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  return prisma.course.findMany({
    where: {
      academyId: input.academyId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: COURSE_FIELDS,
  })
}

export async function updateCourse(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    title?: string
    description?: string | null
    thumbnail?: string | null
  },
): Promise<CourseSummary> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, academyId: input.academyId },
  })
  assertFound('course', course, input.courseId)

  const title = input.title === undefined ? undefined : assertTitle(input.title)

  return prisma.course.update({
    where: { id: input.courseId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
    },
    select: COURSE_FIELDS,
  })
}

/**
 * Archive a course.
 *
 * Not a delete. A course with enrolments, progress or issued certificates must
 * remain resolvable: deleting it would take those with it, and a certificate
 * that stops verifying is worse than a course that stays visible in a list.
 * The refusal names the reason so an operator knows archiving is the option.
 */
export async function archiveCourse(
  principal: Principal,
  input: { workspaceId: string; academyId: string; courseId: string },
): Promise<CourseSummary> {
  assertCan(principal, 'course:delete', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, academyId: input.academyId },
    select: { id: true },
  })
  assertFound('course', course, input.courseId)

  const enrollments = await prisma.enrollment.count({
    where: { courseId: input.courseId },
  })

  if (enrollments > 0) {
    throw new ConflictError(
      'course_has_enrollments',
      'This course has learners enrolled. Archive it instead of deleting it, so their progress and certificates stay valid.',
    )
  }

  return prisma.course.update({
    where: { id: input.courseId },
    data: { status: 'ARCHIVED' },
    select: COURSE_FIELDS,
  })
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export type ModuleSummary = {
  id: string
  courseId: string
  title: string
  summary: string | null
  position: number
}

export async function createModule(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    title: string
    summary?: string | null
  },
): Promise<ModuleSummary> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, academyId: input.academyId },
    select: { id: true },
  })
  assertFound('course', course, input.courseId)

  const title = assertTitle(input.title)

  return prisma.$transaction(async (tx) => {
    const position = await nextModulePosition(tx, input.courseId)

    return tx.module.create({
      data: {
        courseId: input.courseId,
        title,
        summary: input.summary ?? null,
        position,
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        summary: true,
        position: true,
      },
    })
  })
}

export async function updateModule(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    moduleId: string
    title?: string
    summary?: string | null
  },
): Promise<ModuleSummary> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const module = await prisma.module.findFirst({
    where: { id: input.moduleId, courseId: input.courseId },
  })
  assertFound('module', module, input.moduleId)

  const title = input.title === undefined ? undefined : assertTitle(input.title)

  return prisma.module.update({
    where: { id: input.moduleId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
    },
    select: {
      id: true,
      courseId: true,
      title: true,
      summary: true,
      position: true,
    },
  })
}

/**
 * Reorder modules.
 *
 * Takes the complete new order rather than a pair of moves, so the operation is
 * idempotent and two reorder requests cannot interleave into an order neither
 * client asked for. Positions are written in one transaction; a partial reorder
 * would leave duplicates.
 */
export async function reorderModules(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    order: readonly string[]
  },
): Promise<void> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const modules = await prisma.module.findMany({
    where: { courseId: input.courseId },
    select: { id: true },
  })

  const existing = new Set(modules.map((module) => module.id))
  const supplied = new Set(input.order)

  if (
    supplied.size !== input.order.length ||
    existing.size !== supplied.size ||
    [...existing].some((id) => !supplied.has(id))
  ) {
    throw new DomainRuleError(
      'incomplete_order',
      'A reorder must name every module exactly once.',
      [{ path: 'order', message: 'must list each module in the course once' }],
    )
  }

  await prisma.$transaction(
    input.order.map((id, index) =>
      prisma.module.update({ where: { id }, data: { position: index + 1 } }),
    ),
  )
}

/**
 * Delete a module.
 *
 * Refused while it still has lessons, so a mis-click cannot silently take a
 * course's content with it. Cascade is the right behaviour for a deliberate
 * deletion, not for an accidental one.
 */
export async function deleteModule(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    moduleId: string
  },
): Promise<void> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const module = await prisma.module.findFirst({
    where: { id: input.moduleId, courseId: input.courseId },
    select: { id: true, _count: { select: { lessons: true } } },
  })
  assertFound('module', module, input.moduleId)

  if (module._count.lessons > 0) {
    throw new ConflictError(
      'module_not_empty',
      `This module still has ${module._count.lessons} lesson${
        module._count.lessons === 1 ? '' : 's'
      }. Move or delete them first.`,
    )
  }

  await prisma.module.delete({ where: { id: input.moduleId } })
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

export const LESSON_CONTENT_TYPES = [
  'VIDEO',
  'TEXT',
  'FILE',
  'QUIZ',
  'ASSIGNMENT',
  'EMBED',
] as const

export type LessonContentType = (typeof LESSON_CONTENT_TYPES)[number]

export type LessonSummary = {
  id: string
  moduleId: string
  title: string
  summary: string | null
  contentType: string
  position: number
  isFree: boolean
  body: string | null
  mediaAssetId: string | null
  embedUrl: string | null
}

const LESSON_FIELDS = {
  id: true,
  moduleId: true,
  title: true,
  summary: true,
  contentType: true,
  position: true,
  isFree: true,
  body: true,
  mediaAssetId: true,
  embedUrl: true,
} as const

function assertContentType(contentType: string): LessonContentType {
  if (!(LESSON_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    throw new DomainRuleError('invalid_content_type', 'Unknown lesson type.', [
      {
        path: 'contentType',
        message: `must be one of ${LESSON_CONTENT_TYPES.join(', ')}`,
      },
    ])
  }

  return contentType as LessonContentType
}

export async function createLesson(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    moduleId: string
    title: string
    contentType: string
    summary?: string | null
    isFree?: boolean
    body?: string | null
    embedUrl?: string | null
    mediaAssetId?: string | null
  },
): Promise<LessonSummary> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const module = await prisma.module.findFirst({
    where: { id: input.moduleId, courseId: input.courseId },
    select: { id: true },
  })
  assertFound('module', module, input.moduleId)

  const title = assertTitle(input.title)
  const contentType = assertContentType(input.contentType)

  return prisma.$transaction(async (tx) => {
    const position = await nextLessonPosition(tx, input.moduleId)

    return tx.lesson.create({
      data: {
        moduleId: input.moduleId,
        title,
        contentType,
        position,
        summary: input.summary ?? null,
        isFree: input.isFree ?? false,
        body: input.body ?? null,
        embedUrl: input.embedUrl ?? null,
        mediaAssetId: input.mediaAssetId ?? null,
      },
      select: LESSON_FIELDS,
    })
  })
}

export async function updateLesson(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    lessonId: string
    title?: string
    summary?: string | null
    isFree?: boolean
    body?: string | null
    embedUrl?: string | null
    mediaAssetId?: string | null
  },
): Promise<LessonSummary> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: { id: input.lessonId, module: { courseId: input.courseId } },
  })
  assertFound('lesson', lesson, input.lessonId)

  const title = input.title === undefined ? undefined : assertTitle(input.title)

  return prisma.lesson.update({
    where: { id: input.lessonId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.isFree !== undefined ? { isFree: input.isFree } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.embedUrl !== undefined ? { embedUrl: input.embedUrl } : {}),
      ...(input.mediaAssetId !== undefined
        ? { mediaAssetId: input.mediaAssetId }
        : {}),
    },
    select: LESSON_FIELDS,
  })
}

export async function reorderLessons(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    moduleId: string
    order: readonly string[]
  },
): Promise<void> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const module = await prisma.module.findFirst({
    where: { id: input.moduleId, courseId: input.courseId },
    select: { id: true },
  })
  assertFound('module', module, input.moduleId)

  const lessons = await prisma.lesson.findMany({
    where: { moduleId: input.moduleId },
    select: { id: true },
  })

  const existing = new Set(lessons.map((lesson) => lesson.id))
  const supplied = new Set(input.order)

  if (
    supplied.size !== input.order.length ||
    existing.size !== supplied.size ||
    [...existing].some((id) => !supplied.has(id))
  ) {
    throw new DomainRuleError(
      'incomplete_order',
      'A reorder must name every lesson in the module exactly once.',
      [{ path: 'order', message: 'must list each lesson in the module once' }],
    )
  }

  await prisma.$transaction(
    input.order.map((id, index) =>
      prisma.lesson.update({ where: { id }, data: { position: index + 1 } }),
    ),
  )
}

/**
 * Delete a draft lesson.
 *
 * Allowed even when the lesson is part of a published release, and the
 * consequences are the ones ADR 5 describes rather than an error:
 *
 * - **The published release is unaffected.** Its snapshot and its
 *   `ReleaseLesson` rows are copies, so a learner following that release still
 *   sees the lesson.
 * - **Historical progress survives.** `LessonProgress` is keyed by lesson id and
 *   deliberately has no foreign key to `Lesson` — the review noted this as
 *   odd, and this is why: the row outlives the lesson so a completion is not
 *   erased by a content decision.
 * - **Completion follows the current release.** Progress is evaluated against
 *   the release a learner is enrolled on, so a lesson absent from that release
 *   leaves the denominator without leaving the record.
 *
 * Refusing here would make "remove a lesson" impossible to perform at all,
 * because the draft is the only thing that can be edited.
 */
export async function deleteDraftLesson(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    lessonId: string
  },
): Promise<void> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: { id: input.lessonId, module: { courseId: input.courseId } },
    select: { id: true },
  })
  assertFound('lesson', lesson, input.lessonId)

  // A lesson with quiz attempts is refused, because the attempt snapshot
  // references the question rows and deleting the lesson cascades into them.
  // That is a real loss of a learner's work rather than a content decision.
  const attempts = await prisma.quizAttempt.count({
    where: { quiz: { lessonId: input.lessonId } },
  })

  if (attempts > 0) {
    throw new ConflictError(
      'lesson_has_attempts',
      `This lesson has ${attempts} quiz attempt${
        attempts === 1 ? '' : 's'
      } recorded against it, so deleting it would destroy a learner's work. Archive the course instead.`,
    )
  }

  await prisma.lesson.delete({ where: { id: input.lessonId } })
}
