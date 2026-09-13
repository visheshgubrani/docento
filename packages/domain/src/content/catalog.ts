/**
 * The public catalogue, and the staff reads that are not business rules.
 *
 * ## Why these are domain operations
 *
 * They look like queries rather than rules, and the temptation is to put them in
 * the API layer. That would break the rule that only `packages/domain` may
 * import `@prisma/client`, and the reason for that rule is not purity: a second
 * query path is how a tenant filter gets forgotten. A catalogue read has no
 * principal to check membership against, so its safety comes entirely from the
 * `where` clause — `status: 'PUBLISHED'` and a live release — and that is
 * exactly the kind of predicate that must exist once.
 *
 * ## What "public" means here
 *
 * Everything returned by the functions below is already visible to anyone who
 * loads the academy's catalogue page. The projections are narrow on purpose: a
 * course's lesson bodies, media URLs and answer keys are not public, and the
 * shapes here cannot express them.
 */

import { prisma } from '../db'
import { NotFoundError, assertCan, assertFound } from '../shared/errors'
import type { Principal } from '../authorization/principal'
import type { ReleaseSnapshot } from '../content/publishing'
import {
  type AcademyAuthMode,
  type AcademyBranding,
  readAcademyIdentity,
} from '../tenancy/academies'

export type CatalogCourse = {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnail: string | null
  moduleCount: number
  lessonCount: number
}

/**
 * The public half of an academy, in the shape the contract promises.
 *
 * The `authMode` and `branding` fields are narrowed by the same validators the
 * staff read uses — the columns are a `String` and a `Json` and can hold
 * anything, and a public read is the last place to discover that.
 */
export type PublicAcademy = {
  id: string
  workspaceId: string
  name: string
  slug: string
  logo: string | null
  authMode: AcademyAuthMode
  branding: AcademyBranding | null
  createdAt: Date
}

/**
 * An academy's public profile.
 *
 * No principal argument, because there is nothing to authorize against: an
 * academy's name and branding are on its catalogue page. The projection is the
 * authorization — anything not named here is not returned, whatever an operator
 * stored in the row.
 */
export async function getPublicAcademy(
  academyId: string,
): Promise<PublicAcademy> {
  const academy = await prisma.academy.findUnique({
    where: { id: academyId },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      slug: true,
      logo: true,
      authMode: true,
      branding: true,
      createdAt: true,
    },
  })

  if (!academy) throw new NotFoundError('academy', academyId)

  // One validator, used by both the staff and the public read. A second copy
  // would be a second answer to what a valid `authMode` is.
  const identity = readAcademyIdentity(academy)

  return { ...academy, ...identity }
}

/**
 * The published courses in an academy.
 *
 * Two conditions, and both matter. `status: 'PUBLISHED'` excludes drafts. The
 * live-release condition excludes a course that was published and then had its
 * release superseded without a new one — a state that should not occur, and if
 * it ever does, the catalogue should not advertise a course that resolves to
 * nothing.
 *
 * Counts come from the release snapshot rather than from counting rows, because
 * a catalogue read must describe what a learner would actually get: the
 * snapshot's totals, not the draft's current shape.
 */
export async function listPublicCourses(input: {
  academyId: string
  limit?: number
  cursor?: string
}): Promise<CatalogCourse[]> {
  const rows = await prisma.course.findMany({
    where: {
      academyId: input.academyId,
      status: 'PUBLISHED',
      releases: { some: { supersededAt: null } },
      ...(input.cursor ? { id: { gt: input.cursor } } : {}),
    },
    orderBy: { id: 'asc' },
    take: Math.min(Math.max(input.limit ?? 25, 1), 100),
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      thumbnail: true,
      releases: {
        where: { supersededAt: null },
        orderBy: { version: 'desc' },
        take: 1,
        select: { snapshot: true },
      },
    },
  })

  return rows.map((row) => {
    const snapshot = row.releases[0]?.snapshot as ReleaseSnapshot | undefined

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      thumbnail: row.thumbnail,
      moduleCount: snapshot?.totals?.modules ?? 0,
      lessonCount: snapshot?.totals?.lessons ?? 0,
    }
  })
}

export type PublicOutlineLesson = {
  id: string
  title: string
  contentType: string
  isFree: boolean
}

export type PublicOutlineModule = {
  moduleId: string
  title: string
  lessons: PublicOutlineLesson[]
}

/**
 * A published course's outline.
 *
 * Titles, content types and which lessons are free. Note what is absent and
 * cannot be added without changing this type: lesson bodies, media references,
 * quiz questions, and the answer key. A catalogue is a table of contents, and
 * the shape is what keeps it one.
 */
export async function getPublicOutline(input: {
  academyId: string
  courseId: string
}): Promise<PublicOutlineModule[]> {
  const release = await prisma.courseRelease.findFirst({
    where: {
      supersededAt: null,
      course: {
        id: input.courseId,
        academyId: input.academyId,
        status: 'PUBLISHED',
      },
    },
    orderBy: { version: 'desc' },
    select: { snapshot: true },
  })

  if (!release) throw new NotFoundError('course', input.courseId)

  const snapshot = release.snapshot as unknown as ReleaseSnapshot

  return snapshot.modules.map((module) => ({
    moduleId: module.id,
    title: module.title,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      contentType: lesson.contentType,
      isFree: lesson.isFree,
    })),
  }))
}

/** A published course's catalogue entry, or a not-found. */
export async function getPublicCourse(input: {
  academyId: string
  courseId: string
}): Promise<CatalogCourse> {
  const courses = await listPublicCourses({
    academyId: input.academyId,
    limit: 100,
  })
  const course = courses.find((candidate) => candidate.id === input.courseId)

  if (!course) throw new NotFoundError('course', input.courseId)

  return course
}

/**
 * The draft curriculum of a course, for an authoring read.
 *
 * An author editing a course needs its modules, which are draft rows and appear
 * in no release until publishing. Shaped like the contract rather than like the
 * table so the API does not have to translate.
 *
 * ## Why it takes a principal
 *
 * It used to take a bare `courseId`, which made it the one read in this module
 * with no authorization check at all: whichever route mounted it would have had
 * to remember one, and the module list of any course would have been readable by
 * anyone who could guess an id. The academy is looked up from the course rather
 * than taken as an argument, so the check is against the academy the course is
 * actually in — a caller cannot pair a course with an academy they are allowed
 * to read.
 *
 * ## Why the lessons come with it
 *
 * A module list without its lessons cannot be rendered into anything an author
 * can act on, and the caller would have to ask once per module — a request per
 * module to draw one page. They are loaded in the same query, which is also what
 * keeps the ordering consistent between the two: both are ordered by `position`
 * within their parent.
 */
export async function listDraftModules(
  principal: Principal,
  input: { workspaceId: string; courseId: string },
): Promise<
  {
    id: string
    courseId: string
    title: string
    summary: string | null
    position: number
    lessons: {
      id: string
      moduleId: string
      title: string
      summary: string | null
      contentType: string
      position: number
      isFree: boolean
    }[]
  }[]
> {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { academyId: true },
  })

  assertFound('course', course, input.courseId)

  assertCan(principal, 'course:read', {
    workspaceId: input.workspaceId,
    academyId: course.academyId,
    courseId: input.courseId,
  })

  return prisma.module.findMany({
    where: { courseId: input.courseId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      courseId: true,
      title: true,
      summary: true,
      position: true,
      lessons: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          moduleId: true,
          title: true,
          summary: true,
          contentType: true,
          position: true,
          isFree: true,
        },
      },
    },
  })
}
