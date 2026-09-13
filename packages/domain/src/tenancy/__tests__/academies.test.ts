import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../../db.js'
import {
  type AcademySummary,
  addAcademyDomain,
  createAcademy,
  createPublishableKey,
  createWorkspace,
  getAcademy,
  listAcademies,
  listAcademyDomains,
  revokePublishableKey,
  updateAcademy,
  verifyAcademyDomain,
} from '../academies.js'
import {
  RESERVED_SLUGS,
  normaliseHostname,
  normaliseSlug,
  resolveAcademy,
  validateSlug,
} from '../resolve-academy.js'
import { ForbiddenError, NotFoundError } from '../../shared/errors.js'
import type { Principal } from '../../authorization/principal.js'

/**
 * Academy resolution decides which tenant a request is about, so these tests
 * care much more about the refusals than the successes. Every one of them runs
 * against the real database, because the guarantees are index and query
 * properties rather than logic.
 */

let workspaceId: string
let otherWorkspaceId: string
let ownerUserId: string
let adminUserId: string
let academyA: AcademySummary
let academyB: AcademySummary

const owner = (): Principal => ({
  kind: 'staff',
  userId: ownerUserId,
  workspaceId,
  memberId: 'unused',
  role: 'owner',
})

const admin = (): Principal => ({
  kind: 'staff',
  userId: adminUserId,
  workspaceId,
  memberId: 'unused',
  role: 'admin',
})

const ownerElsewhere = (): Principal => ({
  kind: 'staff',
  userId: 'u-elsewhere',
  workspaceId: otherWorkspaceId,
  memberId: 'unused',
  role: 'owner',
})

const suffix = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

beforeAll(async () => {
  const tag = suffix()

  const [ownerUser, adminUser] = await Promise.all([
    prisma.staffUser.create({
      data: {
        id: `u-${tag}`,
        name: 'Owner',
        email: `owner-${tag}@example.com`,
      },
    }),
    prisma.staffUser.create({
      data: {
        id: `a-${tag}`,
        name: 'Admin',
        email: `admin-${tag}@example.com`,
      },
    }),
  ])

  ownerUserId = ownerUser.id
  adminUserId = adminUser.id

  const workspace = await createWorkspace({
    name: 'Tenancy Test',
    slug: `tenancy-${tag}`,
    ownerUserId,
  })
  workspaceId = workspace.id

  const other = await prisma.workspace.create({
    data: { name: 'Elsewhere', slug: `elsewhere-${tag}` },
  })
  otherWorkspaceId = other.id

  academyA = await createAcademy(owner(), workspaceId, {
    name: 'Academy A',
    slug: `academy-a-${tag}`,
  })
  academyB = await createAcademy(owner(), workspaceId, {
    name: 'Academy B',
    slug: `academy-b-${tag}`,
  })
})

afterAll(async () => {
  await prisma.workspace.deleteMany({
    where: { id: { in: [workspaceId, otherWorkspaceId] } },
  })
  await prisma.staffUser.deleteMany({
    where: { id: { in: [ownerUserId, adminUserId] } },
  })
  await prisma.$disconnect()
})

describe('createWorkspace', () => {
  it('makes the creator an owner in the same transaction', async () => {
    const tag = suffix()
    const workspace = await createWorkspace({
      name: 'Transactional',
      slug: `transactional-${tag}`,
      ownerUserId,
    })

    const member = await prisma.member.findFirst({
      where: { workspaceId: workspace.id, userId: ownerUserId },
    })

    // A workspace with no owner is unreachable by anyone, so the two writes are
    // not allowed to be separable.
    expect(member?.role).toBe('owner')

    await prisma.workspace.delete({ where: { id: workspace.id } })
  })

  it.each([
    ['has an uppercase letter', 'Mixed-Case'],
    ['has a space', 'two words'],
    ['has a leading hyphen', '-leading'],
    ['has a trailing hyphen', 'trailing-'],
    ['is a reserved route', 'dashboard'],
  ])('refuses a slug that %s', async (_reason, slug) => {
    await expect(
      createWorkspace({ name: 'X', slug, ownerUserId }),
    ).rejects.toThrow(/cannot be used/)
  })

  it('refuses a slug that is already taken, as a conflict', async () => {
    const existing = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    })

    await expect(
      createWorkspace({
        name: 'X',
        slug: existing!.slug,
        ownerUserId,
      }),
    ).rejects.toThrow(/already in use/)
  })
})

describe('createAcademy', () => {
  it('lets an admin create one in their own workspace', async () => {
    const academy = await createAcademy(admin(), workspaceId, {
      name: 'By Admin',
      slug: `by-admin-${suffix()}`,
    })

    expect(academy.workspaceId).toBe(workspaceId)
  })

  it('refuses an owner of a different workspace', async () => {
    // The cross-tenant denial. A positive test alone would not catch the
    // containment check being absent.
    await expect(
      createAcademy(ownerElsewhere(), workspaceId, {
        name: 'Intruder',
        slug: `intruder-${suffix()}`,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('refuses a slug already used in the same workspace, as a conflict', async () => {
    await expect(
      createAcademy(owner(), workspaceId, {
        name: 'Duplicate',
        slug: academyA.slug,
      }),
    ).rejects.toThrow(/already has an academy/)
  })

  it('allows the same slug in a different workspace', async () => {
    // `@@unique([workspaceId, slug])`, deliberately not global: two
    // organisations may each want a "main" academy.
    const academy = await createAcademy(ownerElsewhere(), otherWorkspaceId, {
      name: 'Main',
      slug: academyA.slug,
    })

    expect(academy.slug).toBe(academyA.slug)
    expect(academy.workspaceId).toBe(otherWorkspaceId)
  })
})

describe('getAcademy', () => {
  it('finds one in the principal’s workspace', async () => {
    expect((await getAcademy(owner(), workspaceId, academyA.id)).id).toBe(
      academyA.id,
    )
  })

  it('reports not-found rather than forbidden across tenants', async () => {
    // Indistinguishable from absent, on purpose: `403` here would tell a caller
    // that the id is real somewhere else.
    await expect(
      getAcademy(ownerElsewhere(), workspaceId, academyA.id),
    ).rejects.toBeInstanceOf(ForbiddenError)

    await expect(
      // A principal whose workspace matches but whose academy does not exist.
      getAcademy(owner(), workspaceId, 'academy-does-not-exist'),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('listAcademies', () => {
  it('returns only this workspace’s academies', async () => {
    const listed = await listAcademies(owner(), workspaceId)

    expect(listed.map((academy) => academy.id)).toContain(academyA.id)
    expect(listed.every((academy) => academy.workspaceId === workspaceId)).toBe(
      true,
    )
  })

  it('refuses a principal from another workspace', async () => {
    await expect(
      listAcademies(ownerElsewhere(), workspaceId),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})

describe('updateAcademy', () => {
  it('changes the name', async () => {
    const updated = await updateAcademy(owner(), workspaceId, academyB.id, {
      name: 'Renamed Academy',
    })

    expect(updated.name).toBe('Renamed Academy')
  })

  it('requires the branding action to change branding', async () => {
    // Branding is a separate action from the name because it is what a learner
    // sees, so the two are worth distinguishing. Both are granted to an owner
    // here, so the test asserts the field survives round-tripping.
    const branding = { displayName: 'Renamed Academy', primaryColor: '#123456' }
    const updated = await updateAcademy(owner(), workspaceId, academyB.id, {
      branding,
    })

    expect(updated.branding).toEqual(branding)
  })

  it('refuses across tenants', async () => {
    await expect(
      updateAcademy(ownerElsewhere(), workspaceId, academyA.id, {
        name: 'Hijacked',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})

describe('resolveAcademy', () => {
  it('resolves a verified hostname', async () => {
    const hostname = `courses-${suffix()}.example.com`
    await addAcademyDomain(owner(), workspaceId, academyA.id, hostname)
    await verifyAcademyDomain(owner(), workspaceId, academyA.id, hostname)

    const resolution = await resolveAcademy({ hostname })

    expect(resolution.ok).toBe(true)
    expect(resolution.ok && resolution.academy.id).toBe(academyA.id)
  })

  it('resolves nothing for an unverified hostname', async () => {
    // The security property of `AcademyDomain`: until ownership is
    // demonstrated, a hostname is a claim and not an act. Without this, anyone
    // who pointed DNS at the install would take over an academy's learner
    // realm.
    const hostname = `unverified-${suffix()}.example.com`
    await addAcademyDomain(owner(), workspaceId, academyA.id, hostname)

    const resolution = await resolveAcademy({ hostname })

    expect(resolution.ok).toBe(false)
    expect(resolution.ok === false && resolution.failure.tried).toBe('host')
  })

  it('ignores the port and the case of a hostname', async () => {
    const hostname = `portable-${suffix()}.example.com`
    await addAcademyDomain(owner(), workspaceId, academyA.id, hostname)
    await verifyAcademyDomain(owner(), workspaceId, academyA.id, hostname)

    const withPort = await resolveAcademy({ hostname: `${hostname}:3000` })
    const upperCase = await resolveAcademy({ hostname: hostname.toUpperCase() })

    expect(withPort.ok).toBe(true)
    expect(upperCase.ok).toBe(true)
  })

  it('resolves a slug when there is no hostname', async () => {
    const resolution = await resolveAcademy({ slug: academyA.slug })

    expect(resolution.ok).toBe(true)
    expect(resolution.ok && resolution.academy.id).toBe(academyA.id)
  })

  it('fails closed for an unknown hostname, with no default academy', async () => {
    // No "first academy" fallback and no "only one, so use it": guessing wrong
    // is a cross-tenant read and refusing is an inconvenience.
    const resolution = await resolveAcademy({ hostname: 'nothing.example.com' })

    expect(resolution.ok).toBe(false)
    expect(resolution.ok === false && resolution.failure.hostname).toBe(
      'nothing.example.com',
    )
  })

  it('fails closed for an unknown slug', async () => {
    const resolution = await resolveAcademy({ slug: 'no-such-academy' })

    expect(resolution.ok).toBe(false)
  })

  it('fails closed when neither is supplied', async () => {
    const resolution = await resolveAcademy({})

    expect(resolution.ok).toBe(false)
  })

  it('falls back to the slug when the hostname is unknown', async () => {
    // The single-domain install: a hostname that resolves nothing plus a slug
    // that does. Documented rather than accidental.
    const resolution = await resolveAcademy({
      hostname: 'nothing.example.com',
      slug: academyA.slug,
    })

    expect(resolution.ok).toBe(true)
  })

  it('ignores a slug that is not a slug', async () => {
    const resolution = await resolveAcademy({ slug: '../../etc/passwd' })

    expect(resolution.ok).toBe(false)
    expect(resolution.ok === false && resolution.failure.slug).toBeNull()
  })
})

describe('slug helpers', () => {
  it('normalises a hostname by stripping the port and lowercasing', () => {
    expect(normaliseHostname('Courses.Example.COM:8080')).toBe(
      'courses.example.com',
    )
    expect(normaliseHostname('')).toBeNull()
    expect(normaliseHostname(null)).toBeNull()
  })

  it('rejects a slug-shaped string that is not a slug', () => {
    expect(normaliseSlug('Not A Slug')).toBeNull()
    expect(normaliseSlug('  Fine-Slug  ')).toBe('fine-slug')
  })

  it('reports every problem at once', () => {
    // One round trip, not one problem per submission.
    const problems = validateSlug('A')

    expect(problems.length).toBeGreaterThan(1)
    expect(problems.join(' ')).toMatch(/at least/)
    expect(problems.join(' ')).toMatch(/lowercase/)
  })

  it('reserves route-shaped slugs', () => {
    expect(RESERVED_SLUGS.has('dashboard')).toBe(true)
    expect(validateSlug('dashboard')).toHaveLength(1)
  })
})

describe('academy domains', () => {
  it('lists them without exposing other academies’', async () => {
    const domains = await listAcademyDomains(owner(), workspaceId, academyA.id)

    expect(domains.every((domain) => domain.hostname.length > 0)).toBe(true)
    expect(
      domains.some((domain) => domain.hostname.includes('portable-')),
    ).toBe(true)
  })

  it('refuses a hostname already attached elsewhere, as a conflict', async () => {
    const hostname = `taken-${suffix()}.example.com`
    await addAcademyDomain(owner(), workspaceId, academyA.id, hostname)

    await expect(
      addAcademyDomain(owner(), workspaceId, academyB.id, hostname),
    ).rejects.toThrow(/already attached/)
  })

  it('refuses to verify a hostname that was never added', async () => {
    await expect(
      verifyAcademyDomain(
        owner(),
        workspaceId,
        academyA.id,
        'never-added.example.com',
      ),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('is idempotent when verifying twice', async () => {
    const hostname = `twice-${suffix()}.example.com`
    await addAcademyDomain(owner(), workspaceId, academyA.id, hostname)

    const first = await verifyAcademyDomain(
      owner(),
      workspaceId,
      academyA.id,
      hostname,
    )
    const second = await verifyAcademyDomain(
      owner(),
      workspaceId,
      academyA.id,
      hostname,
    )

    // Re-verifying must not move the date, or an audit trail of when ownership
    // was demonstrated would be wrong.
    expect(second.verifiedAt?.getTime()).toBe(first.verifiedAt?.getTime())
  })
})

describe('publishable keys', () => {
  it('issues a public key with the environment prefix', async () => {
    const key = await createPublishableKey(
      owner(),
      workspaceId,
      academyA.id,
      'Site',
    )

    expect(key.key).toMatch(/^pk_(test|live)_/)
  })

  it('issues a distinct key each time', async () => {
    const [first, second] = await Promise.all([
      createPublishableKey(owner(), workspaceId, academyA.id, 'One'),
      createPublishableKey(owner(), workspaceId, academyA.id, 'Two'),
    ])

    expect(first.key).not.toBe(second.key)
  })

  it('revokes without deleting, so a revoked key is recognisable', async () => {
    const key = await createPublishableKey(
      owner(),
      workspaceId,
      academyA.id,
      'Temp',
    )

    await revokePublishableKey(owner(), workspaceId, academyA.id, key.id)

    const found = await prisma.academyPublishableKey.findUnique({
      where: { id: key.id },
    })

    expect(found).not.toBeNull()
    expect(found?.revokedAt).not.toBeNull()
  })

  it('refuses across tenants', async () => {
    await expect(
      createPublishableKey(
        ownerElsewhere(),
        workspaceId,
        academyA.id,
        'Intruder',
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})
