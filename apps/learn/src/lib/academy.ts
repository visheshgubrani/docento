import { cache } from 'react'

import { isNotFound } from './client-api'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  type AcademySummary,
  type CatalogCourse,
  DocentoApi,
  DocentoApiError,
} from '@docento/sdk'

/**
 * Academy resolution and the public catalogue.
 *
 * ## Where the academy comes from
 *
 * The `Host` the request arrived on, checked against verified academy domains in
 * the API. That is the only form of resolution a learner cannot influence: it is
 * set by DNS and by the proxy, not by anything in a request body.
 *
 * ## The slug fallback, and what it is *not* allowed to do
 *
 * A self-hosted install on `localhost`, or one serving several academies from a
 * single domain, has no per-academy hostname. There the academy comes from
 * `NEXT_PUBLIC_ACADEMY_SLUG` — a deployment configuration value, not a request
 * parameter, so a visitor cannot change which academy they are looking at by
 * editing a URL.
 *
 * Neither form decides which academy a *caller belongs to*. A session carries
 * its academy, stamped at sign-in, and the API takes the learner's identity from
 * that row. The academy here selects what a page is *about*; entitlement is a
 * separate question the API answers.
 */

export const API_BASE_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'
).replace(/\/+$/, '')

/** The headers that tell the API which academy this request is about. */
export async function academyHeaders(): Promise<Record<string, string>> {
  const requestHeaders = await headers()

  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? null

  const slug = process.env.NEXT_PUBLIC_ACADEMY_SLUG ?? null

  return {
    ...(host ? { 'x-forwarded-host': host } : {}),
    ...(slug ? { 'x-academy-slug': slug } : {}),
  }
}

const resolveAcademyUncached = async (): Promise<AcademySummary | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/academy/resolve`, {
      headers: await academyHeaders(),
      /**
       * Never cached. A domain added or removed must take effect on the next
       * request, and a stale answer here is a visitor seeing the wrong academy —
       * which is a cross-tenant read with extra steps.
       */
      cache: 'no-store',
    })

    // The fail-closed answer, not a fallback to a default academy.
    if (response.status === 404) return null
    if (!response.ok) return null

    const body = (await response.json()) as {
      success?: boolean
      data?: { academy: AcademySummary }
    }

    return body.data?.academy ?? null
  } catch {
    /**
     * An unreachable API reads as "no academy", which the pages render as "this
     * address does not serve an academy". That is a worse message than "the API
     * is down" and a better one than a stack trace: the operator sees the API's
     * own logs, and a visitor sees a page rather than an error.
     */
    return null
  }
}

/**
 * The academy this request is about, resolved once per render.
 *
 * A layout and three pages all ask, and each call is an HTTP request without
 * this. `cache` memoises within a single render only.
 */
export const resolveAcademy = cache(resolveAcademyUncached)

/** The compatibility alias, so a page can say what it means. */
export const cachedAcademy = resolveAcademy

/**
 * An API client for the current request.
 *
 * ## Credentials are forwarded, never held
 *
 * Server-side calls pass the incoming `Cookie` header straight through. The
 * application never stores a token of its own, never reads one out of a cookie,
 * and so never has one to leak: the session belongs to the browser and to the
 * API, and this process is a courier.
 *
 * ## And never the database
 *
 * The API is reached over HTTP rather than through the domain package. A
 * frontend that could query Prisma is a second query path that can forget a
 * tenant filter — and it would mean the public API, the surface a third party
 * integrates against, is not the surface this application exercises.
 */
export const apiClient = cache(async (): Promise<DocentoApi> => {
  const cookieStore = await cookies()

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')

  const academy = await academyHeaders()

  return new DocentoApi({
    baseUrl: API_BASE_URL,
    /**
     * Cookies travel as a header rather than through `credentials: 'include'`,
     * because this is a server-to-server call — `include` is a browser
     * instruction and does nothing in a Node process.
     *
     * The academy headers go with every call so the API resolves the same
     * academy this page did. They are hints for public reads: the API takes a
     * learner's own academy from their session row, never from here.
     */
    fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        headers: {
          ...(init?.headers as Record<string, string> | undefined),
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
          ...academy,
        },
      })) as typeof globalThis.fetch,
  })
})

/**
 * The published catalogue for an academy.
 *
 * Returns `failed` rather than throwing, because "the catalogue could not be
 * read" and "this academy has no courses" are different situations and a page
 * that conflated them would send an operator looking at their content rather
 * than at their API.
 */
export async function catalogCourses(
  academyId: string,
): Promise<{ courses: CatalogCourse[]; failed: boolean }> {
  try {
    const api = await apiClient()
    const { courses } = await api.listCatalogCourses(academyId)

    return { courses, failed: false }
  } catch {
    return { courses: [], failed: true }
  }
}

/** A published course and its outline, or `null` when it is not public. */
export async function catalogCourse(
  academyId: string,
  courseId: string,
): Promise<{ course: CatalogCourse; curriculum: CurriculumModule[] } | null> {
  try {
    const api = await apiClient()

    return await api.getCatalogCourse(academyId, courseId)
  } catch (error) {
    if (isNotFound(error)) return null

    throw error
  }
}

export type CurriculumLesson = {
  id: string
  title: string
  contentType: string
  isFree: boolean
}

export type CurriculumModule = {
  moduleId: string
  title: string
  lessons: CurriculumLesson[]
}

/**
 * The client-safe surface, re-exported so a page has one import.
 *
 * A client component must import `./client-api` directly: this module reads
 * cookies, and a client component that reached them through here would fail the
 * build.
 */
export {
  browserApiClient,
  isNotFound,
  isUnauthenticated,
  messageFor,
} from './client-api'

export { DocentoApiError }
export type { AcademySummary, CatalogCourse }

/**
 * The signed-in learner.
 *
 * ## Why the API is asked rather than the cookie read
 *
 * The session cookie is opaque and the session row lives in the database. A
 * frontend that read the cookie and decided for itself whether it was valid
 * would be a second implementation of session validation, and the two would
 * disagree the first time a session was revoked.
 *
 * The cookie's *presence* is checked before the request, as an optimisation
 * rather than a decision: a visitor who has never signed in has nothing to ask
 * about. The API's answer is what is trusted.
 */
export type LearnerSession = {
  learnerId: string
  name: string
  email: string
  academyId: string
}

const LEARNER_SESSION_COOKIE = 'docento-learner.session_token'

const loadSession = async (): Promise<LearnerSession | null> => {
  const academy = await resolveAcademy()

  /**
   * No academy, no session.
   *
   * The learner realm is built per academy and its tables carry `academyId`, so
   * there is no realm to ask without one. An unknown host therefore has no
   * signed-in learners, which is the correct answer rather than a limitation.
   */
  if (!academy) return null

  const cookieStore = await cookies()

  if (!cookieStore.has(LEARNER_SESSION_COOKIE)) return null

  try {
    const api = await apiClient()
    const { session } = await api.getLearnerSession()

    return session
  } catch {
    /**
     * An unreachable API reads as "not signed in", which sends the visitor to
     * the sign-in page. That is a worse message than "the API is down" and a
     * better one than a stack trace: the operator sees the API's logs, and the
     * visitor sees a page.
     */
    return null
  }
}

/** Memoised for one render — a layout, a header and a page all ask. */
export const getLearnerSession = cache(loadSession)

/**
 * The signed-in learner, or a redirect to sign in and back.
 *
 * The destination goes in `next`, so a learner who followed a link to a lesson
 * returns to it. Dropping it is how a sign-in wall becomes a lost place in a
 * course — and the parameter is validated on the way back in.
 */
export async function redirectIfSignedOut(
  next: string,
): Promise<LearnerSession> {
  const session = await getLearnerSession()

  if (session) return session

  redirect(`/login?next=${encodeURIComponent(next)}`)
}
