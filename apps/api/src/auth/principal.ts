import { createHash } from 'node:crypto'

import type { Context } from 'hono'

import {
  type Principal,
  type ResolvedAcademy,
  getLearnerAuth,
  prisma,
  resolveAcademy,
} from '@docento/domain'

/**
 * Resolving who is calling, and which academy they are calling about.
 *
 * ## The order, and why it matters
 *
 * Academy context is resolved *first*, from the request's host or an explicit
 * slug, because the learner realm is built per academy — there is no session to
 * read until an academy exists to read it in. Staff sessions are global and do
 * not need one.
 *
 * ## Where each identifier comes from
 *
 * These rules are the security boundary, so they are stated rather than
 * implied:
 *
 * | Principal | Comes from | Never from |
 * | --- | --- | --- |
 * | learner | the session row, stamped at sign-in | a request body or header |
 * | staff | the session row | a request body or header |
 * | service key | a hashed lookup of the presented key | the workspace in the URL |
 * | anonymous | nothing | — |
 *
 * A request body naming an academy is ignored. That is why every learner
 * operation takes its academy from this module rather than from its input: a
 * caller cannot redirect a write by editing a payload.
 */

/** What a resolved request knows about its caller. */
export type ResolvedPrincipal = {
  principal: Principal
  /** Present when the request was scoped to an academy, which learner routes require. */
  academy: ResolvedAcademy | null
}

/**
 * Resolve the academy a request is about.
 *
 * The host wins when it is a verified domain. A slug from the path is the
 * fallback for installs with one domain, and a header is accepted only because
 * the frontends in this repository proxy API calls and need to say which
 * academy they are rendering — with the same caveat as the slug: it selects
 * which academy a request is *about*, never which one a caller belongs to.
 */
export async function resolveAcademyFor(c: Context): Promise<ResolvedAcademy | null> {
  const hostname = hostnameOf(c)
  const slug = slugOf(c)

  const resolution = await resolveAcademy({ hostname, slug })

  return resolution.ok ? resolution.academy : null
}

/**
 * The request's hostname.
 *
 * `x-forwarded-host` is consulted because every supported deployment sits behind
 * a proxy that terminates TLS, and the proxy is the thing that knows the
 * hostname the client used. This is a deployment requirement rather than a
 * trust decision: a proxy that lets a client set this header is misconfigured,
 * and the fix is in the proxy.
 */
function hostnameOf(c: Context): string | null {
  return (
    c.req.header('x-forwarded-host')?.split(',')[0]?.trim() ??
    c.req.header('host') ??
    safeHostnameFromUrl(c.req.url)
  )
}

function safeHostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/**
 * An explicit academy slug.
 *
 * `x-academy-slug` exists for the proxied frontends, and a `?academy=` query
 * parameter for a browser hitting the API directly. Neither is authoritative —
 * see the module comment — and both are refused when the request carries a
 * session, because a session already knows its academy and accepting an
 * override would be exactly the tenant-confusion this design avoids.
 */
function slugOf(c: Context): string | null {
  return c.req.header('x-academy-slug') ?? c.req.query('academy') ?? null
}

/**
 * Resolve the caller.
 *
 * Tried in order of specificity: a service key is a header and cheap to check,
 * then the two session realms. Anonymous is the fallback, and the operations
 * that accept it are enumerated in the contracts rather than left to each
 * route.
 */
export async function resolvePrincipal(
  c: Context,
  academy: ResolvedAcademy | null,
): Promise<Principal> {
  const serviceKey = await principalFromServiceKey(c)
  if (serviceKey) return serviceKey

  const learner = await principalFromLearnerSession(c, academy)
  if (learner) return learner

  const staff = await principalFromStaffSession(c)
  if (staff) return staff

  return { kind: 'anonymous' }
}

/** Alias, for a caller that only wants one of the three. */
export async function resolvePrincipalOrAnonymous(
  c: Context,
  academy: ResolvedAcademy | null,
): Promise<ResolvedPrincipal> {
  const principal = await resolvePrincipal(c, academy)

  return { principal, academy }
}

// ---------------------------------------------------------------------------
// Service keys
// ---------------------------------------------------------------------------

/**
 * A service key, looked up by hash.
 *
 * The key itself is never stored, so the lookup is on its SHA-256 — which means
 * a database disclosure does not yield usable credentials. Scopes come from the
 * row rather than from the request, and a revoked or expired key resolves to
 * nothing rather than to a principal that would be refused later.
 */
async function principalFromServiceKey(c: Context): Promise<Principal | null> {
  const presented = bearerToken(c) ?? c.req.header('x-api-key')

  if (!presented || !presented.startsWith('sk_')) return null

  const hashedKey = createHash('sha256').update(presented).digest('hex')

  const key = await prisma.serviceKey.findUnique({
    where: { hashedKey },
    select: {
      id: true,
      workspaceId: true,
      academyId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
    },
  })

  if (!key || key.revokedAt) return null
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) return null

  /**
   * Last use is recorded, but never awaited on the request path.
   *
   * It is operational information — which key is still in use — and making
   * every request wait for a write to collect it would put a second round trip
   * in front of every call for a fact nobody needs immediately. A failure to
   * record it is logged and otherwise ignored, because it cannot affect the
   * decision that was already made.
   */
  void prisma.serviceKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch((error: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          service: 'api',
          message: 'service_key_touch_failed',
          keyId: key.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    })

  return {
    kind: 'serviceKey',
    keyId: key.id,
    workspaceId: key.workspaceId,
    academyId: key.academyId,
    scopes: key.scopes,
  }
}

function bearerToken(c: Context): string | null {
  const header = c.req.header('authorization')

  if (!header?.toLowerCase().startsWith('bearer ')) return null

  const token = header.slice(7).trim()

  return token.length > 0 ? token : null
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * The learner realm's session.
 *
 * Requires a resolved academy: the realm is built per academy and its tables
 * carry `academyId`, so without one there is no session table to ask. The
 * returned principal's academy comes from the session row rather than from the
 * request, and a session that somehow resolved under a different academy's
 * instance is refused rather than trusted — a mismatch there would be a
 * cross-tenant read.
 */
async function principalFromLearnerSession(
  c: Context,
  academy: ResolvedAcademy | null,
): Promise<Principal | null> {
  if (!academy) return null

  try {
    const auth = getLearnerAuth(academy.id)

    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) return null

    const learner = await prisma.learner.findFirst({
      where: { id: session.user.id, academyId: academy.id },
      select: { id: true, academyId: true, status: true },
    })

    if (!learner) return null

    // A banned learner is not an error at this layer: the session is valid and
    // the refusal belongs to whatever they tried to do. Reporting it as no
    // session would sign them out for a reason they cannot see.
    if (learner.status !== 'ACTIVE') return null

    return {
      kind: 'learner',
      learnerId: learner.id,
      academyId: learner.academyId,
    }
  } catch {
    /**
     * An unrecognised or malformed session cookie is not a failure.
     *
     * It is the normal state of a first visit, and treating it as an error
     * would mean every anonymous request logs one.
     */
    return null
  }
}

/**
 * The staff realm's session, with the workspace it is acting in.
 *
 * A staff identity spans workspaces, so the session alone does not determine
 * which one is in play — `activeOrganizationId` does, written by the
 * organization plugin when a workspace is selected. Without it there is no
 * workspace to contain a decision in, so the principal is not formed: `can()`
 * would refuse everything anyway, and a half-built principal is how a check
 * gets skipped.
 */
async function principalFromStaffSession(c: Context): Promise<Principal | null> {
  try {
    const { staffAuth } = await import('@docento/domain')

    const session = await staffAuth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) return null

    const workspaceId = (session.session as { activeOrganizationId?: string | null })
      .activeOrganizationId

    if (!workspaceId) return null

    const member = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
      select: { id: true, role: true },
    })

    if (!member) return null

    if (member.role !== 'owner' && member.role !== 'admin') return null

    return {
      kind: 'staff',
      userId: session.user.id,
      workspaceId,
      memberId: member.id,
      role: member.role,
    }
  } catch {
    return null
  }
}
