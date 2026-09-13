/**
 * Academy resolution.
 *
 * Academy context is what makes every other operation safe: the learner realm
 * is built per academy, an enrolment belongs to one, and a course belongs to
 * one. So where the academy comes from is a security question, not a routing
 * convenience.
 *
 * The rules, in the order they apply:
 *
 * 1. **A verified hostname wins.** If the `Host` the request arrived on is a
 *    verified `AcademyDomain`, that academy is the answer. Nothing else is
 *    consulted. This is the deployment shape for a public academy, and it is
 *    the only form of resolution that a learner cannot influence at all.
 *
 * 2. **A slug is a fallback, for the shapes that have no hostname.** A
 *    self-hosted install on `localhost`, or one serving several academies from
 *    a single domain, has no per-academy DNS. A slug is accepted there — but
 *    note what it is *not* allowed to do: it selects which academy a request is
 *    *about*, never which academy a caller belongs to. Anything that carries a
 *    session takes the academy from the session row, which was stamped at
 *    sign-in, and a mismatch is a refusal. See ADR 11.
 *
 * 3. **Anything else fails closed.** No default academy, no first-academy
 *    fallback, no "if there is only one, use it". An unknown host on a
 *    multi-tenant install is a `404`, because guessing wrong is a cross-tenant
 *    read and refusing is an inconvenience.
 *
 * Unknown is expensive to debug when it is silent, so the failure carries which
 * of the two lookups was attempted.
 */

import { prisma } from '../db'
import { NotFoundError } from '../shared/errors'

export type ResolvedAcademy = {
  id: string
  workspaceId: string
  slug: string
  name: string
  logo: string | null
  /** MANAGED | DELEGATED | HYBRID */
  authMode: string
  branding: unknown
  createdAt: Date
}

export type AcademyResolutionFailure = {
  /** `host` when the host was tried, `slug` when the slug was, `both` when neither matched. */
  tried: 'host' | 'slug' | 'both'
  hostname: string | null
  slug: string | null
}

export type AcademyResolution =
  | { ok: true; academy: ResolvedAcademy }
  | { ok: false; failure: AcademyResolutionFailure }

export type ResolveAcademyInput = {
  /**
   * The request's hostname, without a scheme or port.
   *
   * Taken from the request rather than a header the client controls. A proxy
   * sets `Host`; nothing else should be trusted for it, and a deployment behind
   * one must be configured to pass it through rather than to invent it.
   */
  hostname?: string | null
  /** A slug from the path, for installs with no per-academy domain. */
  slug?: string | null
}

/**
 * The subset of an academy row that resolution returns.
 *
 * Selected explicitly so the resolver cannot become a way to read arbitrary
 * academy columns without an authorization decision.
 */
const RESOLVED_ACADEMY_FIELDS = {
  id: true,
  workspaceId: true,
  slug: true,
  name: true,
  logo: true,
  authMode: true,
  /**
   * Branding and creation date are selected because the resolve *endpoint*
   * returns the academy summary the contract promises.
   *
   * An earlier version omitted them and the route fabricated a `createdAt`,
   * which is the kind of thing that reads as harmless and means a client
   * receives a date that is not when anything happened.
   */
  branding: true,
  createdAt: true,
} as const

/**
 * Resolve the academy a request is about.
 *
 * Returns a result rather than throwing, because the transport layer needs to
 * distinguish "no such academy" from other failures and render a useful page
 * for each. `assertAcademy` is the throwing form for callers that have already
 * decided a missing academy is a 404.
 */
export async function resolveAcademy(
  input: ResolveAcademyInput,
): Promise<AcademyResolution> {
  const hostname = normaliseHostname(input.hostname)
  const slug = normaliseSlug(input.slug)

  if (hostname) {
    const domain = await prisma.academyDomain.findFirst({
      where: {
        hostname,
        /**
         * An unverified domain resolves nothing.
         *
         * This is the whole point of the column: until DNS ownership has been
         * demonstrated, anyone could point a hostname at this install and
         * claim an academy's learner realm.
         */
        verifiedAt: { not: null },
      },
      select: { academy: { select: RESOLVED_ACADEMY_FIELDS } },
    })

    if (domain) return { ok: true, academy: domain.academy }
  }

  if (slug) {
    /**
     * Globally unique, not per workspace.
     *
     * `Academy` is unique on `(workspaceId, slug)`, because two workspaces may
     * each want a "main" academy. Resolution by slug alone therefore has to
     * choose, and it chooses the oldest — a stable answer rather than whatever
     * the planner returns first. A workspace that needs a specific academy
     * reachable should give it a hostname, which is the supported path.
     */
    const academy = await prisma.academy.findFirst({
      where: { slug },
      orderBy: { createdAt: 'asc' },
      select: RESOLVED_ACADEMY_FIELDS,
    })

    if (academy) return { ok: true, academy }
  }

  return {
    ok: false,
    failure: {
      tried: hostname && slug ? 'both' : hostname ? 'host' : 'slug',
      hostname,
      slug,
    },
  }
}

/**
 * Resolve, or throw the same not-found an unauthorized caller would see.
 *
 * A resolver failure is not an authorization failure — `can()` is never
 * consulted — so this deliberately throws `NotFoundError` and never
 * `ForbiddenError`. That keeps the two indistinguishable to a caller, which is
 * what stops the API from being a directory of which hostnames exist.
 */
export async function assertAcademy(
  input: ResolveAcademyInput,
): Promise<ResolvedAcademy> {
  const resolution = await resolveAcademy(input)

  if (!resolution.ok) {
    throw new NotFoundError(
      'academy',
      resolution.failure.hostname ?? resolution.failure.slug ?? 'unspecified',
    )
  }

  return resolution.academy
}

/**
 * Strip a port and lowercase a hostname.
 *
 * `Host` includes the port when it is non-default, and hostnames are
 * case-insensitive, so two spellings of the same host must not resolve
 * differently. The column stores the bare hostname, so this normalises on the
 * way in rather than requiring every writer to remember.
 */
export function normaliseHostname(
  value: string | null | undefined,
): string | null {
  if (!value) return null

  const withoutPort = value.trim().toLowerCase().split(':')[0] ?? ''

  return withoutPort.length > 0 ? withoutPort : null
}

/** Lowercase, trim, and reject anything that is not a slug. */
export function normaliseSlug(value: string | null | undefined): string | null {
  if (!value) return null

  const slug = value.trim().toLowerCase()

  return SLUG_PATTERN.test(slug) ? slug : null
}

/**
 * The slug grammar, in one place.
 *
 * Used by resolution and by creation, so a slug that cannot be created is also
 * a slug that cannot be typed into a URL.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const SLUG_MIN_LENGTH = 2
export const SLUG_MAX_LENGTH = 64

/**
 * Slugs that cannot be an academy or workspace name.
 *
 * Reserved because an academy slug appears as the first path segment on a
 * single-domain install, where a collision with a route would shadow a page.
 * Checked at creation: a slug that cannot be created should fail where the
 * author can see why, not at resolution where the symptom is a 404.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'api',
  'auth',
  'health',
  'openapi.json',
  'api-docs',
  'admin',
  'dashboard',
  'login',
  'logout',
  'signup',
  'sign-in',
  'sign-up',
  'settings',
  'verify',
  'certificates',
  'courses',
  'students',
  'workspace',
  'workspaces',
  'academy',
  'academies',
  'static',
  '_next',
  'public',
  'assets',
  'favicon.ico',
])

/**
 * Check a slug for the problems worth reporting before a write is attempted.
 *
 * Returns every problem rather than the first, so a form can show them at once
 * instead of one per submission.
 */
export function validateSlug(slug: string): string[] {
  const problems: string[] = []

  if (slug.length < SLUG_MIN_LENGTH) {
    problems.push(`must be at least ${SLUG_MIN_LENGTH} characters`)
  }

  if (slug.length > SLUG_MAX_LENGTH) {
    problems.push(`must be at most ${SLUG_MAX_LENGTH} characters`)
  }

  if (!SLUG_PATTERN.test(slug)) {
    problems.push(
      'must be lowercase letters, digits and single hyphens, with no leading or trailing hyphen',
    )
  }

  if (RESERVED_SLUGS.has(slug)) {
    problems.push(`"${slug}" is reserved and cannot be used`)
  }

  return problems
}
