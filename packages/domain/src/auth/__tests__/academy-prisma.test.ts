import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { prisma } from '../../db.js'
import { AcademyScopeError } from '../academy-scope.js'
import { createAcademyScopedPrisma } from '../academy-prisma.js'

/**
 * Contracts of the academy-scoped database client.
 *
 * The property under test is not only "does it hide other academies' rows" but
 * "does it still behave like Prisma". An earlier implementation post-filtered
 * unique reads and verified ownership before mutating, which leaked `null`
 * through operations Prisma types as non-nullable and turned a clean `P2025`
 * into an uncatchable `TypeError` later. These tests fail if that shape returns.
 */

let workspaceId: string
let academyAId: string
let academyBId: string

const EMAIL_A = 'scoped-a@example.com'
const EMAIL_B = 'scoped-b@example.com'

beforeAll(async () => {
  const workspace = await prisma.workspace.create({
    data: { name: 'Scoped Workspace', slug: `scoped-${Date.now()}` },
  })
  workspaceId = workspace.id

  const [a, b] = await Promise.all([
    prisma.academy.create({
      data: { workspaceId, name: 'A', slug: `sa-${Date.now()}` },
    }),
    prisma.academy.create({
      data: { workspaceId, name: 'B', slug: `sb-${Date.now()}` },
    }),
  ])

  academyAId = a.id
  academyBId = b.id
})

beforeEach(async () => {
  await prisma.learner.deleteMany({
    where: { academyId: { in: [academyAId, academyBId] } },
  })
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.$disconnect()
})

const newLearner = (academyId: string, email: string) => ({
  id: `l-${Math.random().toString(36).slice(2)}`,
  academyId,
  name: 'Learner',
  email,
})

describe('writes are stamped', () => {
  it('stamps the academy onto a created row', async () => {
    const scoped = createAcademyScopedPrisma(academyAId)

    const created = await scoped.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    expect(created.academyId).toBe(academyAId)
  })

  it('refuses a row stamped for a different academy', async () => {
    const scoped = createAcademyScopedPrisma(academyAId)

    await expect(
      scoped.learner.create({ data: newLearner(academyBId, EMAIL_A) }),
    ).rejects.toThrow(AcademyScopeError)
  })
})

describe('reads cannot cross academies', () => {
  it('does not return another academy\'s row from findUnique', async () => {
    const rowInA = await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    const scopedB = createAcademyScopedPrisma(academyBId)

    expect(await scopedB.learner.findUnique({ where: { id: rowInA.id } })).toBeNull()
  })

  it('throws from findUniqueOrThrow, as Prisma contracts', async () => {
    // The previous implementation returned null here, which Prisma types as
    // impossible and which becomes a TypeError far from the cause.
    const rowInA = await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    const scopedB = createAcademyScopedPrisma(academyBId)

    await expect(
      scopedB.learner.findUniqueOrThrow({ where: { id: rowInA.id } }),
    ).rejects.toThrow()
  })

  it('filters findMany and count to the academy', async () => {
    await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    await prisma.learner.create({ data: newLearner(academyBId, EMAIL_B) })

    const scopedA = createAcademyScopedPrisma(academyAId)

    const rows = await scopedA.learner.findMany({})
    expect(rows).toHaveLength(1)
    expect(rows[0]?.academyId).toBe(academyAId)

    expect(await scopedA.learner.count({})).toBe(1)
  })

  it('finds its own row normally', async () => {
    const rowInA = await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    const scopedA = createAcademyScopedPrisma(academyAId)

    const found = await scopedA.learner.findUniqueOrThrow({ where: { id: rowInA.id } })
    expect(found.id).toBe(rowInA.id)
  })
})

describe('mutations cannot cross academies', () => {
  it('throws from delete rather than returning null', async () => {
    const rowInA = await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    const scopedB = createAcademyScopedPrisma(academyBId)

    await expect(scopedB.learner.delete({ where: { id: rowInA.id } })).rejects.toThrow()

    // And the row is untouched.
    expect(await prisma.learner.findUnique({ where: { id: rowInA.id } })).not.toBeNull()
  })

  it('throws from update rather than silently doing nothing', async () => {
    const rowInA = await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    const scopedB = createAcademyScopedPrisma(academyBId)

    await expect(
      scopedB.learner.update({ where: { id: rowInA.id }, data: { name: 'Hijacked' } }),
    ).rejects.toThrow()

    const unchanged = await prisma.learner.findUnique({ where: { id: rowInA.id } })
    expect(unchanged?.name).toBe('Learner')
  })

  it('leaves other academies alone for updateMany and deleteMany', async () => {
    await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    const scopedB = createAcademyScopedPrisma(academyBId)

    const updated = await scopedB.learner.updateMany({ data: { name: 'Hijacked' } })
    const deleted = await scopedB.learner.deleteMany({})

    expect(updated.count).toBe(0)
    expect(deleted.count).toBe(0)

    const survivor = await prisma.learner.findFirst({ where: { academyId: academyAId } })
    expect(survivor?.name).toBe('Learner')
  })

  it('updates its own row normally', async () => {
    const rowInA = await prisma.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    const scopedA = createAcademyScopedPrisma(academyAId)

    const updated = await scopedA.learner.update({
      where: { id: rowInA.id },
      data: { name: 'Renamed' },
    })

    expect(updated.name).toBe('Renamed')
  })
})

describe('the same email in two academies', () => {
  it('is permitted, because uniqueness is scoped to the academy', async () => {
    const scopedA = createAcademyScopedPrisma(academyAId)
    const scopedB = createAcademyScopedPrisma(academyBId)

    await scopedA.learner.create({ data: newLearner(academyAId, EMAIL_A) })
    await scopedB.learner.create({ data: newLearner(academyBId, EMAIL_A) })

    const all = await prisma.learner.findMany({ where: { email: EMAIL_A } })
    expect(all).toHaveLength(2)
    expect(new Set(all.map((row) => row.academyId))).toEqual(
      new Set([academyAId, academyBId]),
    )
  })
})
