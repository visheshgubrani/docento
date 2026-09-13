/**
 * Service keys, and the reads a staff session needs about its own memberships.
 *
 * ## What a service key is
 *
 * A server-to-server credential. It never authenticates a browser, never implies
 * a user identity, and never stands in for its creator — `can()` refuses
 * session-only actions for a key regardless of its scopes. That is why scopes
 * are checked in addition to, not instead of, the action.
 *
 * ## The secret is shown once
 *
 * Only a SHA-256 of the key is stored, so it cannot be retrieved after creation.
 * That is not a limitation to work around: a database disclosure that yields
 * usable credentials is a much worse incident than one that yields prefix and
 * last-four, and "we can show it to you again" is the feature that makes the
 * former possible.
 */

import { createHash, randomBytes } from 'node:crypto'

import { prisma } from '../db.js'
import type { Principal } from '../authorization/principal.js'
import {
  ConflictError,
  DomainRuleError,
  assertCan,
  assertFound,
} from '../shared/errors.js'

export type WorkspaceMembership = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: Date
  role: string
}

/**
 * The workspaces a staff principal belongs to.
 *
 * Plural, and that is the point of the staff realm: an agency works across
 * clients, so the answer to "which workspace" is a set rather than one row.
 * `activeOrganizationId` on the session records which one is currently being
 * acted in, but a caller listing its options needs all of them.
 *
 * A service key belongs to exactly one workspace, so it sees that one. Not a
 * special case for convenience: a key scoped to a workspace has no business
 * enumerating others, even ones its creator can see.
 */
export async function listWorkspacesForPrincipal(
  principal: Principal,
): Promise<WorkspaceMembership[]> {
  if (principal.kind === 'anonymous' || principal.kind === 'learner') {
    throw new DomainRuleError(
      'not_a_staff_principal',
      'Listing workspaces requires a staff session or a service key.',
    )
  }

  if (principal.kind === 'serviceKey') {
    const workspace = await prisma.workspace.findUnique({
      where: { id: principal.workspaceId },
      select: { id: true, name: true, slug: true, logo: true, createdAt: true },
    })

    assertFound('workspace', workspace, principal.workspaceId)

    return [{ ...workspace, role: 'service' }]
  }

  const memberships = await prisma.member.findMany({
    where: { userId: principal.userId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
        },
      },
    },
  })

  return memberships.map((membership) => ({
    ...membership.workspace,
    role: membership.role,
  }))
}

export type ServiceKeySummary = {
  id: string
  name: string
  prefix: string
  last4: string
  scopes: string[]
  academyId: string | null
  createdAt: Date
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
}

/**
 * Issue a service key.
 *
 * The only moment the secret exists in a response. The `prefix` is stored for
 * display (`sk_live_`) and the `last4` so an operator can tell two keys apart in
 * a list without either being usable.
 */
export async function createServiceKey(
  principal: Principal,
  workspaceId: string,
  input: {
    name: string
    scopes: readonly string[]
    academyId?: string | null
    expiresAt?: Date | null
  },
): Promise<ServiceKeySummary & { key: string }> {
  assertCan(principal, 'serviceKey:manage', { workspaceId })

  const name = input.name.trim()

  if (name.length === 0) {
    throw new DomainRuleError('invalid_name', 'A service key needs a name.', [
      { path: 'name', message: 'is required' },
    ])
  }

  if (input.scopes.length === 0) {
    throw new DomainRuleError(
      'no_scopes',
      'A service key needs at least one scope, or it can do nothing.',
      [{ path: 'scopes', message: 'is required' }],
    )
  }

  if (input.academyId) {
    const academy = await prisma.academy.findFirst({
      where: { id: input.academyId, workspaceId },
      select: { id: true },
    })

    assertFound('academy', academy, input.academyId)
  }

  const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test'
  const secret = randomBytes(32).toString('base64url')
  const key = `sk_${environment}_${secret}`

  const created = await prisma.serviceKey.create({
    data: {
      workspaceId,
      academyId: input.academyId ?? null,
      name,
      prefix: `sk_${environment}_`,
      last4: secret.slice(-4),
      hashedKey: hashKey(key),
      scopes: [...input.scopes],
      expiresAt: input.expiresAt ?? null,
      createdById: principal.kind === 'staff' ? principal.userId : 'system',
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      last4: true,
      scopes: true,
      academyId: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  })

  return { ...created, key }
}

/**
 * The workspace's service keys, without their secrets.
 *
 * There is no column a secret could be read from, which is the point: a list
 * endpoint cannot leak one because the database does not have one.
 */
export async function listServiceKeys(
  principal: Principal,
  workspaceId: string,
): Promise<ServiceKeySummary[]> {
  assertCan(principal, 'serviceKey:read', { workspaceId })

  return prisma.serviceKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      prefix: true,
      last4: true,
      scopes: true,
      academyId: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  })
}

/**
 * Revoke a key.
 *
 * Kept rather than deleted, so a request presenting it can be told it was
 * revoked rather than that it never existed — which is the difference between
 * "rotate this" and "you have the wrong key".
 */
export async function revokeServiceKey(
  principal: Principal,
  workspaceId: string,
  keyId: string,
): Promise<void> {
  assertCan(principal, 'serviceKey:manage', { workspaceId })

  const key = await prisma.serviceKey.findFirst({
    where: { id: keyId, workspaceId },
    select: { id: true, revokedAt: true },
  })

  assertFound('service key', key, keyId)

  if (key.revokedAt) return

  await prisma.serviceKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })
}

/**
 * Hash a presented key.
 *
 * SHA-256 rather than a password hash, and deliberately: a service key is 32
 * bytes of CSPRNG output, so there is no dictionary to attack and no reason to
 * make every request pay for a slow hash. The reason passwords need bcrypt is
 * that humans choose them; nothing chose this.
 */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Look up a key by its hash.
 *
 * Returns the principal shape the API builds, or `null` for a key that is
 * unknown, revoked or expired. All three return the same thing because the
 * caller receives the same answer either way, and distinguishing them in a
 * response would tell a caller which of their guesses was once valid.
 */
export async function resolveServiceKey(presented: string): Promise<{
  keyId: string
  workspaceId: string
  academyId: string | null
  scopes: readonly string[]
} | null> {
  if (!presented.startsWith('sk_')) return null

  const found = await prisma.serviceKey.findUnique({
    where: { hashedKey: hashKey(presented) },
    select: {
      id: true,
      workspaceId: true,
      academyId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
    },
  })

  if (!found || found.revokedAt) return null
  if (found.expiresAt && found.expiresAt.getTime() <= Date.now()) return null

  return {
    keyId: found.id,
    workspaceId: found.workspaceId,
    academyId: found.academyId,
    scopes: found.scopes,
  }
}

/** Record that a key was used. Never awaited on a request path. */
export async function touchServiceKey(keyId: string): Promise<void> {
  try {
    await prisma.serviceKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    })
  } catch (error) {
    // Operational information, not a decision. A failure to record it must not
    // fail a request that was already authorized.
    console.warn(
      JSON.stringify({
        level: 'warn',
        service: 'domain',
        message: 'service_key_touch_failed',
        keyId,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

/** Conflict helper kept here so the route layer does not construct one. */
export function serviceKeyNameTaken(name: string): ConflictError {
  return new ConflictError(
    'name_taken',
    `A service key called "${name}" already exists.`,
  )
}
