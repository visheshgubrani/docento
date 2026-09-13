import { APIError, createAuthMiddleware, getIP } from 'better-auth/api'

import {
  RATE_LIMIT_RULES,
  consumeRateLimit,
  type RateLimitRule,
} from '../rate-limit/index.js'

/**
 * Apply the shared rate limiter to authentication endpoints.
 *
 * ## Why this exists
 *
 * Better Auth ships its own limiter, but it defaults to
 * `enabled: isProduction, storage: 'memory'` — per-process counters. Behind two
 * API replicas the effective limit doubles, and sign-in brute-force protection
 * becomes close to meaningless. That is the exact failure
 * `src/rate-limit/index.ts` exists to prevent, so the shared limiter has to be
 * attached to the endpoints rather than merely available to them.
 *
 * The built-in limiter is disabled in both realms (`rateLimit.enabled: false`)
 * so there is one policy and one store, not two.
 *
 * ## Identity
 *
 * The client IP, resolved with Better Auth's own `getIP` so it honours the same
 * proxy headers the rest of the auth stack trusts. The limiter hashes it, so
 * the counters table never stores a raw address.
 *
 * This is deliberately the *only* key. Adding the submitted email would let an
 * attacker lock a known account out by spending the budget on it, which trades
 * one denial of service for another.
 */

/** Paths in the staff realm, mapped to the rule that governs them. */
const STAFF_PATH_RULES: Record<string, RateLimitRule> = {
  '/sign-in/email': RATE_LIMIT_RULES.signIn,
  '/sign-up/email': RATE_LIMIT_RULES.signUp,
  '/request-password-reset': RATE_LIMIT_RULES.passwordReset,
  '/reset-password': RATE_LIMIT_RULES.passwordReset,
}

/**
 * Learner sign-in gets its own counter.
 *
 * A learner locking themselves out of one academy must not consume the budget
 * for signing in anywhere else, and a single abusive IP should not be able to
 * exhaust the staff budget.
 */
const LEARNER_PATH_RULES: Record<string, RateLimitRule> = {
  '/sign-in/email': RATE_LIMIT_RULES.learnerSignIn,
  '/sign-up/email': RATE_LIMIT_RULES.signUp,
  '/request-password-reset': RATE_LIMIT_RULES.passwordReset,
  '/reset-password': RATE_LIMIT_RULES.passwordReset,
}

export type RateLimitHookOptions = {
  realm: 'staff' | 'learner'
  /** Namespace so the two realms never share a counter for the same IP. */
  scope?: string
}

export function createAuthRateLimitHook(options: RateLimitHookOptions) {
  const table =
    options.realm === 'learner' ? LEARNER_PATH_RULES : STAFF_PATH_RULES

  return createAuthMiddleware(async (ctx) => {
    const rule = table[ctx.path]
    if (!rule) return

    // `getIP` needs the resolved options so it honours the same proxy headers
    // the rest of the auth stack trusts. A request is always present on an
    // endpoint path; if it somehow is not, fall back to a shared bucket so the
    // request is still counted rather than exempt.
    const ip =
      (ctx.request ? getIP(ctx.request, ctx.context.options) : null) ??
      'unknown'
    const identity = `${options.scope ?? options.realm}:${ip}`

    const result = await consumeRateLimit(rule, identity)

    if (!result.allowed) {
      throw new APIError('TOO_MANY_REQUESTS', {
        message: `Too many attempts. Try again in ${result.retryAfterSeconds} seconds.`,
        headers: { 'Retry-After': String(result.retryAfterSeconds) },
      })
    }
  })
}
