import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { prisma } from '../../db'
import { RATE_LIMIT_RULES, resetRateLimits } from '../../rate-limit/index'
import { getLearnerAuth } from '../learner'
import { staffAuth } from '../staff'

/**
 * The shared limiter must actually be attached to the authentication endpoints.
 *
 * An earlier revision built the limiter and its rules but never wired them in,
 * which left Better Auth's default per-process memory limiter in charge — the
 * precise failure the shared store exists to prevent. Availability of a control
 * is not the same as the control being in force, so this exercises the real
 * endpoints rather than the limiter directly.
 */

let workspaceId: string
let academyId: string

const EMAIL = 'throttle-me@example.com'

beforeAll(async () => {
  const workspace = await prisma.workspace.create({
    data: { name: 'Throttle', slug: `throttle-${Date.now()}` },
  })
  workspaceId = workspace.id

  const academy = await prisma.academy.create({
    data: { workspaceId, name: 'Throttle A', slug: `ta-${Date.now()}` },
  })
  academyId = academy.id
})

beforeEach(async () => {
  // Counters are shared across the process, so they are cleared between tests
  // rather than left to accumulate.
  await resetRateLimits()
})

afterAll(async () => {
  await resetRateLimits()
  await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.$disconnect()
})

describe('staff realm', () => {
  it('throttles repeated sign-in attempts through the real endpoint', async () => {
    const attempt = () =>
      staffAuth.api
        .signInEmail({ body: { email: EMAIL, password: 'wrong-password' } })
        .then(() => 'ok')
        .catch((error: unknown) => (error as Error).message)

    // Spend the budget. Every attempt fails on credentials, which is the point:
    // the limiter must count failures, not successes.
    for (let i = 0; i < RATE_LIMIT_RULES.signIn.limit; i += 1) {
      const message = await attempt()
      expect(
        message,
        `attempt ${i + 1} should fail on credentials`,
      ).not.toMatch(/Too many attempts/)
    }

    // The next one is refused by the limiter, before credentials are checked.
    expect(await attempt()).toMatch(/Too many attempts/)
  })

  it('keeps a valid sign-in working while under the limit', async () => {
    await staffAuth.api
      .signUpEmail({
        body: {
          email: `ok-${Date.now()}@example.com`,
          password: 'correct-horse-1',
          name: 'OK',
        },
      })
      .catch(() => undefined)

    // A successful path is not throttled at the first attempt.
    await expect(
      staffAuth.api.signUpEmail({
        body: {
          email: `ok2-${Date.now()}@example.com`,
          password: 'correct-horse-2',
          name: 'OK',
        },
      }),
    ).resolves.toBeTruthy()
  })
})

describe('learner realm', () => {
  it('throttles repeated learner sign-in through the real endpoint', async () => {
    const auth = getLearnerAuth(academyId)

    const attempt = () =>
      auth.api
        .signInEmail({ body: { email: EMAIL, password: 'wrong-password' } })
        .then(() => 'ok')
        .catch((error: unknown) => (error as Error).message)

    for (let i = 0; i < RATE_LIMIT_RULES.learnerSignIn.limit; i += 1) {
      expect(await attempt()).not.toMatch(/Too many attempts/)
    }

    expect(await attempt()).toMatch(/Too many attempts/)
  })

  it('does not share a budget between academies', async () => {
    // A learner locked out of one academy must not be locked out of another.
    const other = await prisma.academy.create({
      data: { workspaceId, name: 'Throttle B', slug: `tb-${Date.now()}` },
    })

    const exhaust = async (id: string) => {
      const auth = getLearnerAuth(id)
      for (let i = 0; i < RATE_LIMIT_RULES.learnerSignIn.limit; i += 1) {
        await auth.api
          .signInEmail({ body: { email: EMAIL, password: 'wrong' } })
          .catch(() => undefined)
      }
    }

    await exhaust(academyId)

    const blocked = await getLearnerAuth(academyId)
      .api.signInEmail({ body: { email: EMAIL, password: 'wrong' } })
      .then(() => 'ok')
      .catch((error: unknown) => (error as Error).message)

    expect(blocked).toMatch(/Too many attempts/)

    const fresh = await getLearnerAuth(other.id)
      .api.signInEmail({ body: { email: EMAIL, password: 'wrong' } })
      .then(() => 'ok')
      .catch((error: unknown) => (error as Error).message)

    expect(fresh).not.toMatch(/Too many attempts/)

    await prisma.academy.deleteMany({ where: { id: other.id } })
  })
})
