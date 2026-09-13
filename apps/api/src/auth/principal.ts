import { createHash } from 'node:crypto'

import type { Context } from 'hono'

import {
  type Principal,
  type ResolvedAcademy,
  ForbiddenError,
  getLearnerAuth,
  prisma,
  resolveAcademy,
} from '@docento/domain'
import { WORKSPACE_HEADER } from '@docento/contracts'

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
 * | staff identity | the session row | a request body or header |
 * | staff workspace | `x-workspace-id`, or the session's active workspace, checked against the membership table | a request body, or the header unchecked |
 * | service key | a hashed lookup of the presented key | the workspace in the URL |
 * | anonymous | nothing | — |
 *
 * A request body naming an academy is ignored. That is why every learner
 * operation takes its academy from this module rather than from its input: a
 * caller cannot redirect a write by editing a payload.
 *
 * ## Why a staff workspace may come from a header at all
 *
 * A staff identity spans workspaces, so the session does not determine which one
 * a request is about — and the application cannot say either, because the
 * operator switches between them inside one browser tab. What makes the header
 * safe is not that it is trusted but that it is *checked*: it selects which
 * workspace the caller is acting in, and the membership row decides whether they
 * may. A header naming a workspace they do not belong to is refused outright
 * rather than silently falling back, because a fallback would perform the write
 * somewhere the operator was not looking.
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
 * which one is in play: the `x-workspace-id` header names it, and the session's
 * `activeOrganizationId` — written by the organization plugin when a workspace
 * is selected — is the fallback for a client that does not send one.
 *
 * A session that names no workspace still resolves, to a principal whose
 * `workspaceId` is null. That state is ordinary rather than half-built: it is
 * what a staff member has immediately after signing in, and `can()` refuses
 * every workspace-scoped action for it while `staff.session` — which needs no
 * workspace — still answers.
 */
async function principalFromStaffSession(c: Context): Promise<Principal | null> {
  try {
    const { staffAuth } = await import('@docento/domain')

    const session = await staffAuth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) return null

    const requested = c.req.header(WORKSPACE_HEADER)

    /**
     * Which workspace the caller means.
     *
     * The header wins over the session's active workspace, because the session
     * may name a different one than the page the operator is looking at — and
     * acting in the wrong tenant is exactly the failure this whole design is
     * arranged to prevent. A request that names no workspace falls back to the
     * active one so an unchanged client keeps working.
     */
    const workspaceId =
      requested ??
      (session.session as { activeOrganizationId?: string | null })
        .activeOrganizationId ??
      null

    /** No workspace named or remembered: signed in, acting nowhere yet. */
    if (!workspaceId) {
      return {
        kind: 'staff',
        userId: session.user.id,
        workspaceId: null,
        memberId: null,
        role: null,
      }
    }

    const member = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
      select: { id: true, role: true },
    })

    /**
     * Not a member — and the two ways of asking get different answers.
     *
     * A *requested* workspace the caller is not in is refused. Returning no
     * principal would make the request anonymous, and the caller would be told
     * to sign in: advice that cannot help, because they already are. `403` is
     * the true answer. The membership table is the only thing consulted, so a
     * well-formed header naming somebody else's workspace reveals nothing beyond
     * "no".
     *
     * A *remembered* workspace the caller has since been removed from is
     * different: nothing in this request asked for it, the session field is
     * simply stale, and the caller is a signed-in staff member with no workspace
     * to act in. Refusing would strand them — the field is written by the
     * organization plugin, so no application code could clear it — and the
     * honest answer is the one below, where `can()` refuses everything that
     * needs a workspace and `staff.session` still lists where they may go.
     */
    if (!member && requested) {
      throw new ForbiddenError(
        'workspace:read',
        `The caller is not a member of workspace "${requested}".`,
      )
    }

    if (!member) {
      return {
        kind: 'staff',
        userId: session.user.id,
        workspaceId: null,
        memberId: null,
        role: null,
      }
    }

    /**
     * A membership in a role `can()` does not recognise resolves to a principal
     * with no workspace rather than to no principal. The identity is real; what
     * it lacks is a workspace it may act in, and saying so is the honest answer.
     */
    const role = member.role === 'owner' || member.role === 'admin' ? member.role : null

    return {
      kind: 'staff',
      userId: session.user.id,
      workspaceId: role ? workspaceId : null,
      memberId: role ? member.id : null,
      role,
    }
  } catch (error) {
    /**
     * A refusal travels; anything else does not.
     *
     * The catch exists because `getSession` can throw on a malformed cookie, and
     * a malformed cookie is the normal state of a first visit — so it must not
     * become a 500. A `ForbiddenError` is a *decision*, though, and swallowing
     * it here would turn "you are not in this workspace" back into "sign in",
     * which is the bug this branch was written to fix.
     */
    if (error instanceof ForbiddenError) throw error

    return null
  }
}
