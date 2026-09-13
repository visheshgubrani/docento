/**
 * Workspace and academy management.
 *
 * A workspace is the tenant and the isolation boundary; an academy is a
 * student-facing property inside it. One workspace may run several academies —
 * that is what makes multi-brand operation possible without duplicating
 * learners or staff — so almost every operation here takes both, and the
 * workspace is checked against the principal rather than assumed from the URL.
 */

import { prisma } from '../db'
import type { Principal } from '../authorization/principal'
import {
  ConflictError,
  DomainRuleError,
  assertCan,
  assertFound,
} from '../shared/errors'
import { normaliseHostname, validateSlug } from './resolve-academy'

export type WorkspaceSummary = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: Date
}

/**
 * How learners in an academy authenticate.
 *
 * A union rather than `string`, because the column is a `String` with a default
 * and can therefore hold something else — and a value outside this set would
 * reach a client as an enum the contract says cannot exist. `asAuthMode` is
 * where that is caught.
 */
export const ACADEMY_AUTH_MODES = ['MANAGED', 'DELEGATED', 'HYBRID'] as const

export type AcademyAuthMode = (typeof ACADEMY_AUTH_MODES)[number]

/**
 * Academy branding.
 *
 * A structural type rather than `unknown`, and validated on read rather than
 * trusted. The column is `Json`, so the database will store anything — and a
 * client rendering `primaryColor` as a number would be a bug whose cause is a
 * row nobody validated. `asBranding` is where that is caught, and it refuses
 * rather than silently repairing, because a colour that does not parse is a
 * data problem somebody should see.
 */
export type AcademyBranding = {
  displayName?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  accentColor?: string
  supportEmail?: string
  legal?: {
    termsUrl?: string
    privacyUrl?: string
    refundPolicyUrl?: string
  }
}

export type AcademySummary = {
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
 * Read branding from storage.
 *
 * Unknown keys are dropped rather than rejected: branding is presentation, and a
 * key that a newer version wrote is not a reason to fail a read that an older
 * version can serve. A key with the wrong *type* is a refusal, because that is
 * the case a renderer would break on.
 */
function asBranding(value: unknown): AcademyBranding | null {
  if (value === null || value === undefined) return null

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainRuleError(
      'invalid_branding',
      'This academy has branding the platform cannot read.',
      [{ path: 'branding', message: 'must be an object' }],
    )
  }

  const raw = value as Record<string, unknown>
  const branding: AcademyBranding = {}

  const stringKeys = [
    'displayName',
    'logoUrl',
    'faviconUrl',
    'primaryColor',
    'accentColor',
    'supportEmail',
  ] as const

  for (const key of stringKeys) {
    const entry = raw[key]

    if (entry === undefined) continue

    if (typeof entry !== 'string') {
      throw new DomainRuleError(
        'invalid_branding',
        `This academy's branding has an unreadable "${key}".`,
        [{ path: `branding.${key}`, message: 'must be a string' }],
      )
    }

    branding[key] = entry
  }

  if (raw.legal !== undefined) {
    if (
      typeof raw.legal !== 'object' ||
      raw.legal === null ||
      Array.isArray(raw.legal)
    ) {
      throw new DomainRuleError(
        'invalid_branding',
        "This academy's branding has unreadable legal links.",
        [{ path: 'branding.legal', message: 'must be an object' }],
      )
    }

    const legal: NonNullable<AcademyBranding['legal']> = {}
    const legalRaw = raw.legal as Record<string, unknown>

    for (const key of ['termsUrl', 'privacyUrl', 'refundPolicyUrl'] as const) {
      const entry = legalRaw[key]

      if (entry === undefined) continue

      if (typeof entry !== 'string') {
        throw new DomainRuleError(
          'invalid_branding',
          `This academy's branding has an unreadable "${key}".`,
          [{ path: `branding.legal.${key}`, message: 'must be a string' }],
        )
      }

      legal[key] = entry
    }

    branding.legal = legal
  }

  return branding
}

/**
 * Read an `authMode` from storage.
 *
 * Refuses an unrecognised value rather than passing it through. A row with
 * `authMode: 'MANAGED '` — a trailing space from an import, say — would
 * otherwise produce a response that fails schema validation at the edge, which
 * is a confusing way to learn about a data problem.
 */
function asAuthMode(value: string): AcademyAuthMode {
  if ((ACADEMY_AUTH_MODES as readonly string[]).includes(value)) {
    return value as AcademyAuthMode
  }

  throw new DomainRuleError(
    'invalid_auth_mode',
    `This academy has an authentication mode the platform does not recognise.`,
    [
      {
        path: 'authMode',
        message: `must be one of ${ACADEMY_AUTH_MODES.join(', ')}`,
      },
    ],
  )
}

/**
 * Narrow the columns a client must be able to trust.
 *
 * Exported so the public catalogue read uses the same validators rather than
 * repeating them: two answers to "what is a valid authMode" is the shape of bug
 * that shows up as one endpoint accepting a row another refuses.
 */
export function readAcademyIdentity(row: {
  authMode: string
  branding: unknown
}): { authMode: AcademyAuthMode; branding: AcademyBranding | null } {
  return {
    authMode: asAuthMode(row.authMode),
    branding: asBranding(row.branding),
  }
}

/** Map a stored academy row to the summary shape, narrowing `authMode`. */
function toAcademySummary(row: {
  id: string
  workspaceId: string
  name: string
  slug: string
  logo: string | null
  authMode: string
  branding: unknown
  createdAt: Date
}): AcademySummary {
  return {
    ...row,
    authMode: asAuthMode(row.authMode),
    branding: asBranding(row.branding),
  }
}

/**
 * Validate a slug and throw if it is unusable.
 *
 * Every problem is reported at once rather than one per attempt, which is the
 * difference between a form that can be fixed in one pass and one that is
 * submitted five times.
 */
function assertSlugIsUsable(slug: string, field: string): string {
  const trimmed = slug.trim()

  /**
   * Validated as typed, then stored lowercased.
   *
   * Normalising first would quietly accept `Mixed-Case` as `mixed-case`, which
   * means the address someone chose is not the address they got — and the
   * difference only shows up in a URL later. Refusing is predictable; the
   * message says what is wrong with what was submitted.
   */
  const problems = validateSlug(trimmed)

  if (problems.length > 0) {
    throw new DomainRuleError(
      'invalid_slug',
      `That ${field} address cannot be used.`,
      problems.map((message) => ({ path: field, message })),
    )
  }

  return trimmed.toLowerCase()
}

/**
 * Create a workspace and make the creator its owner.
 *
 * The two writes are one transaction because a workspace with no owner is
 * unreachable: nothing can be done in it and nobody can be given access to it,
 * so a partial failure would leave a row that only a database console can fix.
 *
 * Better Auth's organization plugin creates workspaces through its own API, and
 * that path is what the application uses for sign-up. This exists for the seed,
 * for tests, and for any caller that needs the invariant stated in code rather
 * than inferred from plugin behaviour.
 */
export async function createWorkspace(input: {
  name: string
  slug: string
  ownerUserId: string
}): Promise<WorkspaceSummary> {
  const slug = assertSlugIsUsable(input.slug, 'workspace')

  const name = input.name.trim()
  if (name.length === 0) {
    throw new DomainRuleError('invalid_name', 'A workspace needs a name.', [
      { path: 'name', message: 'is required' },
    ])
  }

  const existing = await prisma.workspace.findUnique({ where: { slug } })
  if (existing) {
    throw new ConflictError(
      'slug_taken',
      `The workspace address "${slug}" is already in use.`,
    )
  }

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name, slug },
      select: { id: true, name: true, slug: true, logo: true, createdAt: true },
    })

    await tx.member.create({
      data: {
        workspaceId: workspace.id,
        userId: input.ownerUserId,
        role: 'owner',
      },
    })

    return workspace
  })
}

/**
 * Read a workspace the principal may see.
 *
 * A membership check is not enough on its own, so `can()` decides and the query
 * is written so a workspace outside the principal's tenancy is not returned at
 * all — the same not-found as one that does not exist.
 */
export async function getWorkspace(
  principal: Principal,
  workspaceId: string,
): Promise<WorkspaceSummary> {
  assertCan(principal, 'workspace:read', { workspaceId })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true, logo: true, createdAt: true },
  })

  assertFound('workspace', workspace, workspaceId)

  return workspace
}

export async function updateWorkspace(
  principal: Principal,
  workspaceId: string,
  input: { name?: string; logo?: string | null },
): Promise<WorkspaceSummary> {
  assertCan(principal, 'workspace:update', { workspaceId })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  assertFound('workspace', workspace, workspaceId)

  const name = input.name?.trim()

  if (name !== undefined && name.length === 0) {
    throw new DomainRuleError('invalid_name', 'A workspace needs a name.', [
      { path: 'name', message: 'is required' },
    ])
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(input.logo !== undefined ? { logo: input.logo } : {}),
    },
    select: { id: true, name: true, slug: true, logo: true, createdAt: true },
  })
}

/**
 * Create an academy inside a workspace.
 *
 * The creator must be able to create academies in the workspace, which is what
 * stops an instructor from creating a property they then own outright.
 */
export async function createAcademy(
  principal: Principal,
  workspaceId: string,
  input: { name: string; slug: string; authMode?: string },
): Promise<AcademySummary> {
  assertCan(principal, 'academy:create', { workspaceId })

  const slug = assertSlugIsUsable(input.slug, 'academy')

  const name = input.name.trim()
  if (name.length === 0) {
    throw new DomainRuleError('invalid_name', 'An academy needs a name.', [
      { path: 'name', message: 'is required' },
    ])
  }

  const existing = await prisma.academy.findUnique({
    where: { workspaceId_slug: { workspaceId, slug } },
  })

  if (existing) {
    throw new ConflictError(
      'slug_taken',
      `This workspace already has an academy at "${slug}".`,
    )
  }

  const created = await prisma.academy.create({
    data: {
      workspaceId,
      name,
      slug,
      ...(input.authMode ? { authMode: input.authMode } : {}),
    },
    select: ACADEMY_FIELDS,
  })

  return toAcademySummary(created)
}

const ACADEMY_FIELDS = {
  id: true,
  workspaceId: true,
  name: true,
  slug: true,
  logo: true,
  authMode: true,
  branding: true,
  createdAt: true,
} as const

/**
 * List the academies in a workspace.
 *
 * Uses `academy:list` rather than `academy:read` because it is a
 * workspace-scoped question with no academy to name. Passing an arbitrary
 * academy id — which an earlier draft did — satisfied the shape check while
 * asserting nothing about the academies actually returned, which reads as a
 * check that is not happening.
 */
export async function listAcademies(
  principal: Principal,
  workspaceId: string,
): Promise<AcademySummary[]> {
  assertCan(principal, 'academy:list', { workspaceId })

  const rows = await prisma.academy.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
    select: ACADEMY_FIELDS,
  })

  return rows.map(toAcademySummary)
}

export async function getAcademy(
  principal: Principal,
  workspaceId: string,
  academyId: string,
): Promise<AcademySummary> {
  assertCan(principal, 'academy:read', { workspaceId, academyId })

  const academy = await prisma.academy.findFirst({
    where: { id: academyId, workspaceId },
    select: ACADEMY_FIELDS,
  })

  assertFound('academy', academy, academyId)

  return toAcademySummary(academy)
}

/**
 * Update an academy's identity.
 *
 * `branding` is stored as JSON and typed by the contracts' `brandingSchema`
 * rather than by a column per field, because branding is presentation and
 * changing it should not be a migration.
 */
export async function updateAcademy(
  principal: Principal,
  workspaceId: string,
  academyId: string,
  input: {
    name?: string
    logo?: string | null
    authMode?: string
    branding?: unknown
  },
): Promise<AcademySummary> {
  const updatingBranding = input.branding !== undefined

  assertCan(
    principal,
    updatingBranding ? 'academy:branding:update' : 'academy:update',
    { workspaceId, academyId },
  )

  const academy = await prisma.academy.findFirst({
    where: { id: academyId, workspaceId },
  })
  assertFound('academy', academy, academyId)

  const name = input.name?.trim()
  if (name !== undefined && name.length === 0) {
    throw new DomainRuleError('invalid_name', 'An academy needs a name.', [
      { path: 'name', message: 'is required' },
    ])
  }

  const updated = await prisma.academy.update({
    where: { id: academyId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(input.logo !== undefined ? { logo: input.logo } : {}),
      ...(input.authMode !== undefined ? { authMode: input.authMode } : {}),
      ...(updatingBranding ? { branding: input.branding as object } : {}),
    },
    select: ACADEMY_FIELDS,
  })

  return toAcademySummary(updated)
}

/**
 * Attach a hostname to an academy, unverified.
 *
 * Unverified resolves nothing — see `resolveAcademy` — so adding a hostname is
 * a claim rather than an act. `verifyAcademyDomain` is the act.
 */
export async function addAcademyDomain(
  principal: Principal,
  workspaceId: string,
  academyId: string,
  hostname: string,
): Promise<{ id: string; hostname: string; verifiedAt: Date | null }> {
  assertCan(principal, 'academy:domain:manage', { workspaceId, academyId })

  const normalised = normaliseHostname(hostname)

  if (!normalised) {
    throw new DomainRuleError('invalid_hostname', 'That is not a hostname.', [
      { path: 'hostname', message: 'is required' },
    ])
  }

  // Rejected here as well as by the unique index, so the caller gets a message
  // rather than a constraint violation.
  const taken = await prisma.academyDomain.findUnique({
    where: { hostname: normalised },
  })

  if (taken) {
    throw new ConflictError(
      'hostname_taken',
      `"${normalised}" is already attached to an academy.`,
    )
  }

  return prisma.academyDomain.create({
    data: { academyId, hostname: normalised },
    select: { id: true, hostname: true, verifiedAt: true },
  })
}

/**
 * Mark a hostname as owned.
 *
 * The caller is expected to have demonstrated ownership out of band — by a DNS
 * record or a served token. This operation records the outcome; it does not
 * check it, because the check is deployment-specific and doing it here would
 * make the domain module depend on a DNS client.
 *
 * Until this runs, a hostname resolves nothing. That is the security property,
 * and it is why this is a separate operation from `addAcademyDomain` rather
 * than a field on it.
 */
export async function verifyAcademyDomain(
  principal: Principal,
  workspaceId: string,
  academyId: string,
  hostname: string,
): Promise<{ id: string; hostname: string; verifiedAt: Date | null }> {
  assertCan(principal, 'academy:domain:manage', { workspaceId, academyId })

  const normalised = normaliseHostname(hostname)

  const domain = await prisma.academyDomain.findFirst({
    where: { hostname: normalised ?? '', academyId },
  })

  assertFound('academy domain', domain, normalised ?? '')

  return prisma.academyDomain.update({
    where: { id: domain.id },
    data: { verifiedAt: domain.verifiedAt ?? new Date() },
    select: { id: true, hostname: true, verifiedAt: true },
  })
}

export async function listAcademyDomains(
  principal: Principal,
  workspaceId: string,
  academyId: string,
): Promise<{ id: string; hostname: string; verifiedAt: Date | null }[]> {
  assertCan(principal, 'academy:read', { workspaceId, academyId })

  return prisma.academyDomain.findMany({
    where: { academyId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, hostname: true, verifiedAt: true },
  })
}

/**
 * Issue a publishable key.
 *
 * Public by definition: it identifies an academy to a browser and grants no
 * access to anything a stranger could not read anyway. It is not an
 * authenticator and never substitutes for one, which is why `can()` has no
 * action that a publishable key can satisfy.
 */
export async function createPublishableKey(
  principal: Principal,
  workspaceId: string,
  academyId: string,
  name: string,
): Promise<{ id: string; key: string; name: string }> {
  assertCan(principal, 'academy:publishableKey:manage', {
    workspaceId,
    academyId,
  })

  const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test'

  return prisma.academyPublishableKey.create({
    data: {
      academyId,
      name: name.trim() || 'Default',
      key: `pk_${environment}_${randomToken()}`,
    },
    select: { id: true, key: true, name: true },
  })
}

export async function listPublishableKeys(
  principal: Principal,
  workspaceId: string,
  academyId: string,
): Promise<
  { id: string; key: string; name: string; revokedAt: Date | null }[]
> {
  assertCan(principal, 'academy:publishableKey:manage', {
    workspaceId,
    academyId,
  })

  return prisma.academyPublishableKey.findMany({
    where: { academyId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, key: true, name: true, revokedAt: true },
  })
}

/**
 * Revoke a publishable key.
 *
 * Soft: the row stays so that a request presenting the key can be told it was
 * revoked rather than that it was never valid.
 */
export async function revokePublishableKey(
  principal: Principal,
  workspaceId: string,
  academyId: string,
  keyId: string,
): Promise<void> {
  assertCan(principal, 'academy:publishableKey:manage', {
    workspaceId,
    academyId,
  })

  const key = await prisma.academyPublishableKey.findFirst({
    where: { id: keyId, academyId },
  })

  assertFound('publishable key', key, keyId)

  if (key.revokedAt) return

  await prisma.academyPublishableKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })
}

/** URL-safe random text, from the platform's CSPRNG. */
function randomToken(bytes = 24): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString(
    'base64url',
  )
}
