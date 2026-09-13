import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { DocentoApi, DocentoApiError } from '@docento/sdk'

import { isForbidden, isNotFound } from './client-api'
import type {
  AcademySummary,
  CourseSummary,
  LessonSummary,
  OutlineModule,
  ReleaseSummary,
  WorkspaceSummary,
} from '@docento/sdk'

/**
 * The staff application's access to the API.
 *
 * ## There is one way to reach the API from here
 *
 * Credentials are forwarded, never held: a server-side call passes the incoming
 * `Cookie` header through, so this process never stores a token and has nothing
 * to leak. The browser calls the same API directly through the same-origin
 * rewrite in `next.config.ts`, because the API is the product's public surface
 * and both applications should exercise it rather than an internal shortcut.
 *
 * ## Why HTTP and not the domain package
 *
 * A frontend that could call a domain operation directly would be a second path
 * into the database, and the API a third party integrates against would stop
 * being the surface this application exercises. `.dependency-cruiser.cjs`
 * enforces the stronger version of that: only `packages/domain` imports Prisma.
 *
 * ## Where the workspace comes from, and what it authorizes
 *
 * A staff identity spans workspaces, so every staff call has to say which one it
 * means. It says so with the `x-workspace-id` header, set from the workspace in
 * the URL. That header is a *request*, not an authority: the API checks it
 * against the membership table and refuses a workspace the caller is not in, so
 * a path segment cannot widen access. What it fixes is the opposite failure — a
 * session whose remembered workspace differs from the page being viewed, which
 * would quietly perform the write in the wrong tenant.
 */

export const API_BASE_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'
).replace(/\/+$/, '')

const SESSION_COOKIE = 'docento-staff.session_token'

/**
 * An API client for the current request, optionally acting in a workspace.
 *
 * The workspace is a parameter rather than a field read from the session,
 * because the answer to "which workspace" is in the URL and nowhere else. A
 * client built here without one can still call the operations that have no
 * workspace to name — the session read, above all.
 */
export const apiClient = cache(
  async (workspaceId?: string): Promise<DocentoApi> => {
    const cookieStore = await cookies()

    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ')

    return new DocentoApi({
      baseUrl: API_BASE_URL,
      ...(workspaceId ? { workspaceId } : {}),
      /**
       * Cookies travel as a header rather than through `credentials: 'include'`,
       * because this is a server-to-server call — `include` is a browser
       * instruction and does nothing in a Node process.
       */
      fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, {
          ...init,
          headers: {
            ...(init?.headers as Record<string, string> | undefined),
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
          },
        })) as typeof globalThis.fetch,
    })
  },
)

// ---------------------------------------------------------------------------
// The session
// ---------------------------------------------------------------------------

export type StaffWorkspace = {
  id: string
  name: string
  slug: string
  role: 'owner' | 'admin'
}

export type StaffSession = {
  userId: string
  name: string
  email: string
  /** Every workspace this identity may enter. Empty is a normal new account. */
  workspaces: StaffWorkspace[]
}

/**
 * Whether the caller is a signed-in staff member.
 *
 * Asked of the API rather than read from the cookie: the session row is the
 * API's, and a frontend that decided for itself would be a second implementation
 * of session validation that disagreed the first time a session was revoked.
 *
 * The cookie's *presence* is checked first, as an optimisation rather than a
 * decision — a visitor who has never signed in has nothing to ask about.
 */
const loadStaffSession = async (): Promise<StaffSession | null> => {
  const cookieStore = await cookies()

  if (!cookieStore.has(SESSION_COOKIE)) return null

  try {
    const api = await apiClient()
    const { session } = await api.getStaffSession()

    return session
  } catch {
    /**
     * An unreachable API reads as "not signed in", which shows the sign-in page.
     * That is a worse message than "the API is down" and a better one than a
     * stack trace: the operator sees the API's logs, and the visitor sees a page.
     */
    return null
  }
}

/** Memoised for one render — a layout, a header and a page all ask. */
export const getStaffSession = cache(loadStaffSession)

/**
 * The session, or a redirect to sign in and back.
 *
 * The destination is carried in `next` so a staff member who followed a link
 * into the builder returns to it, and it is validated on the way back in.
 */
export async function requireStaffSession(next: string): Promise<StaffSession> {
  const session = await getStaffSession()

  if (session) return session

  redirect(`/login?next=${encodeURIComponent(next)}`)
}

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

/**
 * The workspace a page acts in, or a redirect when the caller may not.
 *
 * ## Why this is one function rather than a check at each page
 *
 * Every workspace-scoped page needs the same three things: the id from the URL,
 * a session, and confirmation that the session may enter that workspace. Spread
 * across pages, the third is the one that gets forgotten — and forgetting it
 * does not fail loudly, because the API refuses independently. What it produces
 * is a page that renders a workspace's shell and then shows errors, which reads
 * as a broken application rather than as a refusal.
 *
 * A workspace the caller is not in is reported identically to one that does not
 * exist, matching the API: distinguishing them would tell a stranger which
 * workspace identifiers are real.
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  next: string,
): Promise<{ session: StaffSession; workspace: StaffWorkspace }> {
  const session = await requireStaffSession(next)

  const workspace = session.workspaces.find((entry) => entry.id === workspaceId)

  if (!workspace) {
    /**
     * Not `notFound()`, deliberately.
     *
     * A stale bookmark and a workspace somebody was removed from are the same
     * thing from here, and both are answered by choosing another workspace —
     * which a bare 404 does not offer. The chooser is one link away and says so.
     */
    redirect('/workspaces')
  }

  return { session, workspace }
}

const loadWorkspaces = async (): Promise<WorkspaceSummary[]> => {
  try {
    const api = await apiClient()
    const { workspaces } = await api.listWorkspaces()

    return workspaces
  } catch {
    return []
  }
}

export const listWorkspaces = cache(loadWorkspaces)

/**
 * The academies in a workspace.
 *
 * Pinned to the workspace in the URL, so a staff member of two workspaces does
 * not see a merged list — and the API refuses a workspace they are not a member
 * of rather than returning nothing, which is the difference between a refusal
 * and an empty page nobody can explain.
 */
export async function listAcademies(
  workspaceId: string,
): Promise<AcademySummary[]> {
  try {
    const api = await apiClient(workspaceId)
    const { academies } = await api.listAcademies(workspaceId)

    return academies
  } catch {
    return []
  }
}

/**
 * The courses in an academy, drafts included.
 *
 * `status` is what the API records, not what an operator might assume: a course
 * that has ever been published keeps `PUBLISHED` while its draft moves on, so
 * the list shows the status and the course page shows the release. Reporting a
 * "published" badge on its own would claim the live version matches the draft,
 * which is exactly the thing publishing exists to separate.
 */
export async function listCourses(
  workspaceId: string,
  academyId: string,
): Promise<CourseSummary[]> {
  try {
    const api = await apiClient(workspaceId)
    const { courses } = await api.listCourses(workspaceId, academyId)

    return courses
  } catch {
    return []
  }
}

/**
 * The academies and courses a workspace page shows, or a redirect when the
 * caller may not be here at all.
 */
export async function requireAcademyAccess(
  workspaceId: string,
  academyId: string,
  next: string,
): Promise<{ workspace: StaffWorkspace; academy: AcademySummary }> {
  const { workspace } = await requireWorkspaceAccess(workspaceId, next)

  const api = await apiClient(workspaceId)

  try {
    const { academy } = await api.getAcademy(workspaceId, academyId)

    return { workspace, academy }
  } catch (error) {
    /**
     * An academy in another workspace is reported by the API as absent, and the
     * same answer is given here — for the same reason: distinguishing "not
     * yours" from "does not exist" tells a stranger which ids are real.
     */
    if (isNotFound(error) || isForbidden(error)) {
      redirect(`/w/${workspaceId}`)
    }

    throw error
  }
}

/**
 * A course, its draft curriculum, and the release learners currently see.
 *
 * One call rather than three because the page is *about* the difference between
 * draft and release: fetching them separately would let it render one without
 * the other, and the failure mode of that is an operator believing an edit is
 * live when it is not.
 */
export async function requireCourseAccess(
  workspaceId: string,
  academyId: string,
  courseId: string,
  next: string,
): Promise<{
  course: CourseSummary
  modules: OutlineModule[]
  release: ReleaseSummary | null
}> {
  await requireAcademyAccess(workspaceId, academyId, next)

  const api = await apiClient(workspaceId)

  try {
    const result = await api.getCourse(workspaceId, academyId, courseId)

    /**
     * The lessons are attached on this read, and the contract marks them
     * optional because the create and update responses share the same schema.
     * Narrowing here rather than at every use is what keeps the page from
     * carrying a `?? []` that would hide a genuine absence.
     */
    return {
      ...result,
      modules: result.modules.map((module) => ({
        ...module,
        lessons: module.lessons ?? [],
      })),
    }
  } catch (error) {
    /**
     * A course in another academy is reported as absent, and is answered the way
     * an absent one is: send them back to the academy, which is where the list
     * of what does exist is.
     */
    if (isNotFound(error) || isForbidden(error)) {
      redirect(`/w/${workspaceId}/a/${academyId}`)
    }

    throw error
  }
}

/**
 * One lesson, with the module it is in.
 *
 * ## Two reads, because the outline and the lesson are different questions
 *
 * The course read returns every module with a *listing* of its lessons, which is
 * what the curriculum page draws and which deliberately omits bodies. The lesson
 * read returns one lesson in full. Asking both here means the page gets the
 * module's title for its breadcrumb and the body for its editor without either
 * read being widened to serve the other.
 *
 * A lesson id that is not in this course is reported the way an absent one is:
 * the operator lands on the course, which is where the lessons that do exist are.
 */
export async function requireLessonAccess(
  workspaceId: string,
  academyId: string,
  courseId: string,
  lessonId: string,
  next: string,
): Promise<{
  course: CourseSummary
  moduleTitle: string
  lesson: LessonSummary
}> {
  const { course, modules } = await requireCourseAccess(
    workspaceId,
    academyId,
    courseId,
    next,
  )

  const api = await apiClient(workspaceId)

  try {
    const { lesson } = await api.getLesson(
      workspaceId,
      academyId,
      courseId,
      lessonId,
    )

    const parent = modules.find((module) =>
      module.lessons.some((entry) => entry.id === lessonId),
    )

    return { course, moduleTitle: parent?.title ?? 'Course', lesson }
  } catch (error) {
    if (isNotFound(error) || isForbidden(error)) {
      redirect(`/w/${workspaceId}/a/${academyId}/c/${courseId}`)
    }

    throw error
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * The client-safe surface, re-exported so a server page has one import.
 *
 * A client component must import `./client-api` directly: this module reads
 * cookies, and a client component that reached them through here would fail the
 * build.
 */
export {
  browserApiClient,
  isForbidden,
  isNotFound,
  isUnauthenticated,
  messageFor,
} from './client-api'

/** A key for a retryable write, minted once per user action. */
export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export { DocentoApiError }
export type {
  AcademySummary,
  CourseSummary,
  LessonSummary,
  OutlineModule,
  ReleaseSummary,
  WorkspaceSummary,
}
