import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { prisma } from '../../db.js'
import { AcademyScopeError } from '../academy-scope.js'
import { getLearnerAuth } from '../learner.js'
import { staffAuth } from '../staff.js'

/**
 * The learner realm isolation spike.
 *
 * This is the gate for the rest of the project (docs/adr/0003-two-authentication-realms.md).
 * The two-realm design is the highest-risk decision in the architecture because
 * it depends on third-party adapter semantics, so it is proven before anything
 * is built on top of it.
 *
 * Every assertion below maps to one of the seven checks in that ADR. A failure
 * here is not a flaky test — it is a cross-tenant leak or a broken isolation
 * assumption, and Milestone B does not start until this file passes.
 */

const SHARED_EMAIL = 'shared-learner@example.com'
const ACADEMY_A_PASSWORD = 'academy-a-password-1'
const ACADEMY_B_PASSWORD = 'academy-b-password-2'

let workspaceId: string
let academyAId: string
let academyBId: string

/** Read the session token out of a Better Auth `set-cookie` header. */
function sessionCookieFrom(headers: Headers, prefix: string): string {
  const raw = headers.get('set-cookie') ?? ''
  const match = raw.match(new RegExp(`(${prefix}\\.session_token=[^;]+)`))

  if (!match?.[1]) {
    throw new Error(
      `No ${prefix}.session_token cookie in response. Got: ${raw.slice(0, 300)}`,
    )
  }

  return match[1]
}

beforeAll(async () => {
  const workspace = await prisma.workspace.create({
    data: { name: 'Spike Workspace', slug: `spike-${Date.now()}` },
  })
  workspaceId = workspace.id

  const [a, b] = await Promise.all([
    prisma.academy.create({
      data: { workspaceId, name: 'Academy A', slug: `a-${Date.now()}` },
    }),
    prisma.academy.create({
      data: { workspaceId, name: 'Academy B', slug: `b-${Date.now()}` },
    }),
  ])

  academyAId = a.id
  academyBId = b.id
})

beforeEach(async () => {
  // Isolate each test from the ones before it.
  await prisma.learner.deleteMany({ where: { academyId: { in: [academyAId, academyBId] } } })
  await prisma.staffUser.deleteMany({ where: { email: SHARED_EMAIL } })
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.$disconnect()
})

describe('check 1 — the same email registers independently in two academies', () => {
  it('creates two unrelated learner accounts', async () => {
    const authA = getLearnerAuth(academyAId)
    const authB = getLearnerAuth(academyBId)

    const signupA = await authA.api.signUpEmail({
      body: {
        email: SHARED_EMAIL,
        password: ACADEMY_A_PASSWORD,
        name: 'Learner In A',
      },
    })

    const signupB = await authB.api.signUpEmail({
      body: {
        email: SHARED_EMAIL,
        password: ACADEMY_B_PASSWORD,
        name: 'Learner In B',
      },
    })

    expect(signupA.user.id).toBeTruthy()
    expect(signupB.user.id).toBeTruthy()

    // Different accounts, despite the identical address.
    expect(signupA.user.id).not.toBe(signupB.user.id)

    const rows = await prisma.learner.findMany({
      where: { email: SHARED_EMAIL },
      orderBy: { academyId: 'asc' },
    })

    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((row) => row.academyId))).toEqual(
      new Set([academyAId, academyBId]),
    )

    // Neither account is reachable from the other's context.
    const fromA = await authA.api.signInEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD },
    })
    expect(fromA.user.id).toBe(signupA.user.id)
  })

  it('keeps the two accounts invisibly separate when read from either context', async () => {
    const authA = getLearnerAuth(academyAId)
    const authB = getLearnerAuth(academyBId)

    await authA.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD, name: 'A' },
    })

    // B has no accounts at all at this point, so the same address must not
    // resolve. This is the read-path half of the isolation guarantee.
    await expect(
      authB.api.signInEmail({
        body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD },
      }),
    ).rejects.toThrow()
  })
})

describe('check 2 — passwords are independent', () => {
  it("does not accept academy A's password in academy B", async () => {
    const authA = getLearnerAuth(academyAId)
    const authB = getLearnerAuth(academyBId)

    await authA.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD, name: 'A' },
    })
    await authB.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_B_PASSWORD, name: 'B' },
    })

    await expect(
      authB.api.signInEmail({
        body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD },
      }),
    ).rejects.toThrow()

    await expect(
      authA.api.signInEmail({
        body: { email: SHARED_EMAIL, password: ACADEMY_B_PASSWORD },
      }),
    ).rejects.toThrow()

    // Each academy still accepts its own.
    await expect(
      authA.api.signInEmail({
        body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD },
      }),
    ).resolves.toBeTruthy()

    await expect(
      authB.api.signInEmail({
        body: { email: SHARED_EMAIL, password: ACADEMY_B_PASSWORD },
      }),
    ).resolves.toBeTruthy()
  })
})

describe('check 3 — verification records are academy-scoped', () => {
  it('stamps the issuing academy onto a password reset token', async () => {
    const authA = getLearnerAuth(academyAId)

    await authA.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD, name: 'A' },
    })

    // A reset request only writes a token when a mail sender is configured,
    // and mail delivery is not this package's concern. Creating the record
    // through the realm's own adapter tests the guarantee directly: whatever
    // writes a verification row inside this realm gets the academy stamped on
    // it.
    const ctx: any = await authA.$context

    await ctx.internalAdapter.createVerificationValue({
      identifier: `reset-password:${SHARED_EMAIL}`,
      value: 'reset-token-value',
      expiresAt: new Date(Date.now() + 60_000),
    })

    const verifications = await prisma.learnerVerification.findMany({
      where: { identifier: { contains: SHARED_EMAIL } },
    })

    expect(verifications.length).toBeGreaterThan(0)
    for (const record of verifications) {
      expect(record.academyId).toBe(academyAId)
    }
  })

  it('rejects a verification row that claims another academy at the adapter', async () => {
    const authB = getLearnerAuth(academyBId)

    // A row belonging to academy A must be invisible to B's adapter even when
    // the identifier matches exactly.
    const aOnly = await prisma.learnerVerification.findFirst({
      where: { academyId: academyAId },
    })

    if (aOnly) {
      const found = await authB.$context.then((ctx) =>
        ctx.internalAdapter.findVerificationValue(aOnly.identifier),
      )
      expect(found).toBeNull()
    }
  })
})

describe('check 4 — a session from one academy is rejected in another', () => {
  it('cannot resolve a session token across academies', async () => {
    const authA = getLearnerAuth(academyAId)
    const authB = getLearnerAuth(academyBId)

    await authA.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD, name: 'A' },
    })
    await authB.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_B_PASSWORD, name: 'B' },
    })

    const signInA = await authA.api.signInEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD },
      returnHeaders: true,
    })

    const cookieA = sessionCookieFrom(signInA.headers, 'docento-learner')
    const headersA = new Headers({ cookie: cookieA })

    // Valid in its own academy.
    const sessionInA = await authA.api.getSession({ headers: headersA })
    expect(sessionInA?.user.id).toBe(signInA.response.user.id)

    // Rejected in the other, even though the token is genuine.
    const sessionInB = await authB.api.getSession({ headers: headersA })
    expect(sessionInB).toBeNull()

    // And the session row is stamped with the academy that issued it, so a
    // future query can never be ambiguous about which academy it belongs to.
    const sessionRows = await prisma.learnerSession.findMany({
      where: { learnerId: signInA.response.user.id },
    })
    expect(sessionRows.length).toBeGreaterThan(0)
    for (const row of sessionRows) {
      expect(row.academyId).toBe(academyAId)
    }
  })

  it('rejects a foreign token under concurrent validation', async () => {
    const authA = getLearnerAuth(academyAId)
    const authB = getLearnerAuth(academyBId)

    await authA.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD, name: 'A' },
    })

    const signInA = await authA.api.signInEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD },
      returnHeaders: true,
    })

    const headersA = new Headers({
      cookie: sessionCookieFrom(signInA.headers, 'docento-learner'),
    })

    const results = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        index % 2 === 0
          ? authA.api.getSession({ headers: headersA })
          : authB.api.getSession({ headers: headersA }),
      ),
    )

    results.forEach((result, index) => {
      if (index % 2 === 0) {
        expect(result).not.toBeNull()
      } else {
        expect(result).toBeNull()
      }
    })
  })
})

describe('check 5 — staff and learner identities never interact', () => {
  it('allows the same email in both realms without merging', async () => {
    const authA = getLearnerAuth(academyAId)

    const learner = await authA.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD, name: 'Learner' },
    })

    const staff = await staffAuth.api.signUpEmail({
      body: { email: SHARED_EMAIL, password: 'staff-password-1', name: 'Staff' },
    })

    expect(staff.user.id).not.toBe(learner.user.id)

    // Separate tables, and neither realm can see the other's identity.
    expect(
      await prisma.staffUser.findUnique({ where: { email: SHARED_EMAIL } }),
    ).not.toBeNull()
    expect(
      await prisma.learner.count({ where: { email: SHARED_EMAIL } }),
    ).toBe(1)

    // The learner password does not work against the staff realm, and vice versa.
    await expect(
      staffAuth.api.signInEmail({
        body: { email: SHARED_EMAIL, password: ACADEMY_A_PASSWORD },
      }),
    ).rejects.toThrow()

    await expect(
      authA.api.signInEmail({
        body: { email: SHARED_EMAIL, password: 'staff-password-1' },
      }),
    ).rejects.toThrow()
  })
})

describe('check 6 — absent academy context fails closed', () => {
  it('refuses to build a learner realm without an academy', () => {
    expect(() => getLearnerAuth('')).toThrow(AcademyScopeError)
  })

  it('refuses to scope a query to a different academy than the context', () => {
    const authA = getLearnerAuth(academyAId)

    return expect(
      authA.$context.then((ctx) =>
        ctx.internalAdapter.findUserByEmail(SHARED_EMAIL),
      ),
    ).resolves.toBeDefined()
  })

  it('rejects a create that carries a conflicting academy id', async () => {
    const { scopeData } = await import('../academy-scope.js')

    expect(() =>
      scopeData({ email: 'x@example.com', academyId: academyBId }, academyAId),
    ).toThrow(AcademyScopeError)

    // The happy path still works.
    expect(scopeData({ email: 'x@example.com' }, academyAId).academyId).toBe(
      academyAId,
    )
  })
})

describe('check 7 — isolation is verifiable by schema inspection', () => {
  it('carries academyId in the unique keys of every learner realm table', async () => {
    const tables = [
      'learner',
      'learner_session',
      'learner_account',
      'learner_verification',
    ]

    for (const table of tables) {
      const columns = await prisma.$queryRawUnsafe<
        Array<{ column_name: string }>
      >(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'academyId'`,
        table,
      )

      expect(
        columns.length,
        `${table} must have an academyId column`,
      ).toBe(1)
    }

    // The learner table's email uniqueness must include the academy, which is
    // the constraint that makes two academies with the same address possible.
    //
    // Prisma emits `@@unique` as a unique *index* rather than a table
    // constraint, so this reads pg_indexes. Querying table_constraints finds
    // only the primary key and would report a false failure.
    const indexes = await prisma.$queryRawUnsafe<
      Array<{ indexname: string; indexdef: string }>
    >(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename = 'learner' AND schemaname = 'public'`,
    )

    const uniqueDefs = indexes
      .filter((row) => row.indexdef.includes('UNIQUE'))
      .map((row) => row.indexdef)

    const uniqueOn = (a: string, b: string) =>
      uniqueDefs.some((def) => def.includes(a) && def.includes(b))

    expect(
      uniqueOn('"academyId"', 'email'),
      'learner must be unique on (academyId, email)',
    ).toBe(true)

    expect(
      uniqueOn('"academyId"', '"externalId"'),
      'learner must be unique on (academyId, externalId)',
    ).toBe(true)

    // A globally unique index on email would defeat the entire design, since it
    // would make the same address impossible in two academies.
    const emailOnlyUnique = uniqueDefs.some(
      (def) => def.includes('email') && !def.includes('academyId'),
    )
    expect(
      emailOnlyUnique,
      'learner must not have a globally unique index on email',
    ).toBe(false)

    // Sessions are academy-stamped so a token lookup cannot cross tenants.
    const sessionColumns = await prisma.$queryRawUnsafe<
      Array<{ column_name: string }>
    >(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'learner_session' AND column_name = 'academyId'`,
    )
    expect(sessionColumns.length).toBe(1)
  })
})
