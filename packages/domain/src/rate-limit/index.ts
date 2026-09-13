import { createHash } from 'node:crypto'

import { prisma } from '../db.js'

/**
 * Shared rate limiting.
 *
 * ## Why this is not in-memory
 *
 * The obvious implementation keeps counters in a process-local map. That is
 * wrong the moment there is more than one instance: behind two API replicas the
 * effective limit doubles, and brute-force protection on sign-in becomes close
 * to meaningless. Since the API and worker already run as separate processes,
 * per-process counters were never going to hold.
 *
 * Counters live in Postgres so a self-hosted install still needs exactly one
 * stateful service. See docs/adr/0007-durable-jobs-on-postgres.md for the same
 * reasoning applied to queues.
 *
 * ## Algorithm
 *
 * Fixed window, consumed with a single atomic statement. A read-then-write
 * implementation would let concurrent requests through at the boundary, which is
 * precisely the case an attacker generates.
 */

export type RateLimitRule = {
  /** Stable name, e.g. `sign-in`. Part of the counter key. */
  name: string
  /** Window length in milliseconds. */
  windowMs: number
  /** Maximum requests allowed per window. */
  limit: number
}

export type RateLimitResult = {
  allowed: boolean
  /** Requests remaining in the current window. Never negative. */
  remaining: number
  limit: number
  /** When the current window ends. */
  resetAt: Date
  /** Seconds until reset, for a `Retry-After` header. */
  retryAfterSeconds: number
}

type CounterRow = {
  count: number
  windowStart: Date
  expiresAt: Date
}

/**
 * Consume one unit against a rule for a given identity.
 *
 * `identity` should be the narrowest thing worth limiting on — an IP address, a
 * service key id, or an email address for credential endpoints. It is hashed
 * into the counter key so the table never stores raw addresses or emails.
 */
export async function consumeRateLimit(
  rule: RateLimitRule,
  identity: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowStart = new Date(
    Math.floor(now.getTime() / rule.windowMs) * rule.windowMs,
  )
  const expiresAt = new Date(windowStart.getTime() + rule.windowMs)
  const key = `${rule.name}:${hashIdentity(identity)}`

  // One statement, so concurrent requests cannot both observe "under the
  // limit" and both proceed.
  const rows = await prisma.$queryRaw<CounterRow[]>`
    INSERT INTO rate_limit_counter ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, ${windowStart}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN rate_limit_counter."windowStart" < ${windowStart} THEN 1
        ELSE rate_limit_counter."count" + 1
      END,
      "windowStart" = CASE
        WHEN rate_limit_counter."windowStart" < ${windowStart} THEN ${windowStart}
        ELSE rate_limit_counter."windowStart"
      END,
      "expiresAt" = CASE
        WHEN rate_limit_counter."windowStart" < ${windowStart} THEN ${expiresAt}
        ELSE rate_limit_counter."expiresAt"
      END
    RETURNING "count", "windowStart", "expiresAt"
  `

  const row = rows[0]

  if (!row) {
    // The statement above always returns a row. If it somehow does not, fail
    // closed rather than silently allowing unlimited requests.
    return {
      allowed: false,
      remaining: 0,
      limit: rule.limit,
      resetAt: expiresAt,
      retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
    }
  }

  const count = Number(row.count)

  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    limit: rule.limit,
    resetAt: row.expiresAt,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000),
    ),
  }
}

/**
 * Read the current state without consuming.
 *
 * Useful for showing a quota in a UI, and for asserting behaviour in tests
 * without perturbing the counter under test.
 */
export async function peekRateLimit(
  rule: RateLimitRule,
  identity: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowStart = new Date(
    Math.floor(now.getTime() / rule.windowMs) * rule.windowMs,
  )
  const expiresAt = new Date(windowStart.getTime() + rule.windowMs)
  const key = `${rule.name}:${hashIdentity(identity)}`

  const rows = await prisma.$queryRaw<CounterRow[]>`
    SELECT "count", "windowStart", "expiresAt"
    FROM rate_limit_counter
    WHERE "key" = ${key} AND "windowStart" = ${windowStart}
  `

  const row = rows[0]
  const count = row ? Number(row.count) : 0

  return {
    allowed: count < rule.limit,
    remaining: Math.max(0, rule.limit - count),
    limit: rule.limit,
    resetAt: expiresAt,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
    ),
  }
}

/** Clear counters. Intended for tests and for an admin reset tool. */
export async function resetRateLimits(name?: string): Promise<void> {
  if (name) {
    await prisma.rateLimitCounter.deleteMany({
      where: { key: { startsWith: `${name}:` } },
    })
    return
  }

  await prisma.rateLimitCounter.deleteMany({})
}

/**
 * Remove expired counters.
 *
 * Without this the table grows without bound. Intended to run on the worker's
 * schedule rather than inline on the request path.
 */
export async function pruneRateLimits(now: Date = new Date()): Promise<number> {
  const result = await prisma.rateLimitCounter.deleteMany({
    where: { expiresAt: { lt: now } },
  })

  return result.count
}

/**
 * Hash the identity into the key.
 *
 * The counters table is operational data, and there is no reason for it to
 * contain raw email addresses or IPs. A plain SHA-256 is sufficient: this is
 * bucketing, not security.
 */
function hashIdentity(identity: string): string {
  return createHash('sha256').update(identity).digest('hex').slice(0, 32)
}

/**
 * The rules the application uses.
 *
 * Deliberately grouped here rather than scattered across routes, so the whole
 * policy is reviewable in one place.
 */
export const RATE_LIMIT_RULES = {
  signIn: { name: 'sign-in', windowMs: 15 * 60 * 1000, limit: 10 },
  signUp: { name: 'sign-up', windowMs: 60 * 60 * 1000, limit: 10 },
  passwordReset: { name: 'password-reset', windowMs: 60 * 60 * 1000, limit: 3 },
  learnerSignIn: {
    name: 'learner-sign-in',
    windowMs: 15 * 60 * 1000,
    limit: 10,
  },
  serviceKey: { name: 'service-key', windowMs: 60 * 1000, limit: 300 },
  publicCatalog: { name: 'public-catalog', windowMs: 60 * 1000, limit: 120 },
} as const satisfies Record<string, RateLimitRule>
