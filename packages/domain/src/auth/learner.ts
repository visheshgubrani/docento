import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { env } from '@docento/config'
import { AcademyScopeError, academyDatabaseHooks } from './academy-scope.js'
import { createAcademyScopedPrisma } from './academy-prisma.js'
import { createAuthRateLimitHook } from './rate-limit-hook.js'

/**
 * The learner authentication realm.
 *
 * Learner identity belongs to exactly one academy. Two academies may hold
 * accounts with the same email address — the same human, or a different one,
 * and the platform has no way to tell. Each academy therefore has independent
 * credentials, sessions, and recovery.
 *
 * ## Academy context is injected, never looked up
 *
 * The academy is passed in as an argument and baked into the adapter for the
 * lifetime of the instance. There is no mutable "current academy" anywhere, and
 * no request header or body field can influence it. The caller resolves the
 * academy from a verified domain and fails closed when the host is unknown.
 *
 * Instances are cached per academy because the configuration is otherwise
 * identical and building one constructs a password hasher.
 *
 * See docs/adr/0003-two-authentication-realms.md.
 */
export const LEARNER_AUTH_BASE_PATH = '/api/auth/learners'
export const LEARNER_COOKIE_PREFIX = 'docento-learner'

export type LearnerAuth = ReturnType<typeof buildLearnerAuth>

function buildLearnerAuth(academyId: string) {
  if (!academyId) {
    throw new AcademyScopeError(
      'buildLearnerAuth requires an academy id. Academy context comes from a verified domain and is never optional.',
    )
  }

  return betterAuth({
    basePath: LEARNER_AUTH_BASE_PATH,
    secret: env.LEARNER_AUTH_SECRET,
    baseURL: env.API_URL,

    // Scoping is enforced at the database client, below Better Auth.
    //
    // Wrapping the *adapter* was tried first and was not sufficient: on request
    // paths Better Auth resolves its adapter through async-local storage, and
    // the instance it resolves is not the one a wrapper replaces. Reads issued
    // during sign-up therefore searched across every academy. `prismaAdapter`
    // accepts any client, so scoping the client covers every path. See
    // academy-prisma.ts.
    database: prismaAdapter(createAcademyScopedPrisma(academyId), {
      provider: 'postgresql',
    }),

    // Defence in depth: the same stamp applied through the documented hook API,
    // so a create is scoped even if a future Better Auth release changes how it
    // resolves adapters.
    databaseHooks: academyDatabaseHooks(academyId),

    // Distinct tables from the staff realm, so a staff session can never
    // resolve here and an equal email can never merge the two.
    //
    // `academyId` is declared as an additional field on every model. Without
    // this, Better Auth's `transformInput` drops it as an unknown column before
    // the insert, which is how the spike first produced learner rows with no
    // academy attached.
    user: {
      modelName: 'learner',
      additionalFields: { academyId: { type: 'string', required: false } },
    },
    // Better Auth refers to the owning account as `userId` on both of these
    // models. The domain schema calls that column `learnerId`, because in this
    // realm the subject is always a learner. Without this mapping the field is
    // dropped as unknown and the insert fails on the missing relation.
    session: {
      modelName: 'learnerSession',
      fields: { userId: 'learnerId' },
      additionalFields: { academyId: { type: 'string', required: false } },
    },
    account: {
      modelName: 'learnerAccount',
      fields: { userId: 'learnerId' },
      additionalFields: { academyId: { type: 'string', required: false } },
    },
    verification: {
      modelName: 'learnerVerification',
      additionalFields: { academyId: { type: 'string', required: false } },
    },

    advanced: {
      cookiePrefix: LEARNER_COOKIE_PREFIX,
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },

    trustedOrigins: [env.APP_URL, ...env.TRUSTED_ORIGINS],

    // See staff.ts. Scoped per academy as well as per IP, so a learner locked
    // out of one academy does not consume the budget for another.
    rateLimit: { enabled: false },

    hooks: {
      before: createAuthRateLimitHook({
        realm: 'learner',
        scope: `learner:${academyId}`,
      }),
    },
  })
}

const cache = new Map<string, LearnerAuth>()

/**
 * Get the learner authentication instance for an academy.
 *
 * The returned instance only ever sees that academy's rows, so a token minted
 * for one academy is not merely rejected by policy in another — it is not
 * findable at all.
 */
export function getLearnerAuth(academyId: string): LearnerAuth {
  const cached = cache.get(academyId)
  if (cached) return cached

  const instance = buildLearnerAuth(academyId)
  cache.set(academyId, instance)
  return instance
}

/** Drop a cached instance. Intended for tests. */
export function clearLearnerAuthCache(): void {
  cache.clear()
}
