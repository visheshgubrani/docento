import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { prisma } from '../../db.js'
import {
  consumeRateLimit,
  peekRateLimit,
  pruneRateLimits,
  resetRateLimits,
  type RateLimitRule,
} from '../index.js'

const rule: RateLimitRule = {
  name: 'test-rule',
  windowMs: 60_000,
  limit: 3,
}

const base = new Date('2026-01-01T00:00:00.000Z')
const later = new Date('2026-01-01T00:01:30.000Z')

beforeEach(async () => {
  await resetRateLimits('test-rule')
})

afterAll(async () => {
  await resetRateLimits()
  await prisma.$disconnect()
})

describe('consumeRateLimit', () => {
  it('allows up to the limit and then denies', async () => {
    for (let i = 0; i < rule.limit; i += 1) {
      const result = await consumeRateLimit(rule, 'caller-a', base)
      expect(result.allowed, `request ${i + 1} should be allowed`).toBe(true)
      expect(result.remaining).toBe(rule.limit - (i + 1))
    }

    const denied = await consumeRateLimit(rule, 'caller-a', base)
    expect(denied.allowed).toBe(false)
    expect(denied.remaining).toBe(0)
  })

  it('reports a usable Retry-After', async () => {
    for (let i = 0; i < rule.limit; i += 1) {
      await consumeRateLimit(rule, 'caller-a', base)
    }

    const denied = await consumeRateLimit(rule, 'caller-a', base)
    expect(denied.retryAfterSeconds).toBeGreaterThan(0)
    expect(denied.retryAfterSeconds).toBeLessThanOrEqual(60)
  })

  it('tracks identities independently', async () => {
    for (let i = 0; i < rule.limit; i += 1) {
      await consumeRateLimit(rule, 'caller-a', base)
    }

    // One abusive caller must not lock out everybody else.
    const other = await consumeRateLimit(rule, 'caller-b', base)
    expect(other.allowed).toBe(true)
  })

  it('starts a fresh count in the next window', async () => {
    for (let i = 0; i < rule.limit + 1; i += 1) {
      await consumeRateLimit(rule, 'caller-a', base)
    }

    const nextWindow = await consumeRateLimit(rule, 'caller-a', later)
    expect(nextWindow.allowed).toBe(true)
    expect(nextWindow.remaining).toBe(rule.limit - 1)
  })

  it('does not store the raw identity', async () => {
    const email = 'someone@example.com'
    await consumeRateLimit(rule, email, base)

    const rows = await prisma.rateLimitCounter.findMany({
      where: { key: { startsWith: `${rule.name}:` } },
    })

    expect(rows.length).toBe(1)
    expect(rows[0]?.key).not.toContain(email)
    expect(rows[0]?.key).not.toContain('someone')
  })

  it('enforces the limit under concurrency', async () => {
    // This is the property that motivated a shared store in the first place. A
    // read-then-write implementation passes the sequential test above and fails
    // this one, because simultaneous requests all observe "under the limit".
    const attempts = 20
    const results = await Promise.all(
      Array.from({ length: attempts }, () =>
        consumeRateLimit(rule, 'burst-caller', base),
      ),
    )

    const allowed = results.filter((r) => r.allowed).length
    expect(allowed).toBe(rule.limit)
  })

  it('counts every concurrent attempt, losing none', async () => {
    const attempts = 20
    await Promise.all(
      Array.from({ length: attempts }, () =>
        consumeRateLimit(rule, 'burst-caller-2', base),
      ),
    )

    const peeked = await peekRateLimit(rule, 'burst-caller-2', base)
    expect(peeked.remaining).toBe(0)
  })
})

describe('resetRateLimits', () => {
  it('clears only the named rule', async () => {
    const other: RateLimitRule = { name: 'other-rule', windowMs: 60_000, limit: 5 }

    await consumeRateLimit(rule, 'caller-a', base)
    await consumeRateLimit(other, 'caller-a', base)

    await resetRateLimits('test-rule')

    expect((await peekRateLimit(rule, 'caller-a', base)).remaining).toBe(rule.limit)
    expect((await peekRateLimit(other, 'caller-a', base)).remaining).toBe(
      other.limit - 1,
    )

    await resetRateLimits('other-rule')
  })
})

describe('pruneRateLimits', () => {
  it('removes only expired counters', async () => {
    await consumeRateLimit(rule, 'caller-a', base)

    const future = new Date(base.getTime() + 10 * 60_000)
    const removed = await pruneRateLimits(future)

    expect(removed).toBeGreaterThan(0)
    expect(
      await prisma.rateLimitCounter.count({
        where: { key: { startsWith: `${rule.name}:` } },
      }),
    ).toBe(0)
  })
})
