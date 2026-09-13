import type { PrismaClient } from '@prisma/client'

import { prisma } from '../db'
import { ACADEMY_SCOPED_MODEL_NAMES, AcademyScopeError } from './academy-scope'

/**
 * Academy scoping enforced at the database client, below Better Auth.
 *
 * ## Why this layer exists
 *
 * The isolation spike established that wrapping Better Auth's *adapter* is not a
 * sufficient enforcement point. On request paths Better Auth resolves its
 * adapter through an async-local-storage lookup:
 *
 * ```js
 * // @better-auth/core/dist/db/context/transaction.mjs
 * const getCurrentAdapter = async (fallback) =>
 *   ensureAsyncStorage().then((als) => als.getStore()?.adapter || fallback);
 * ```
 *
 * The instance that resolves there is not the one a wrapper replaces, so reads
 * issued during sign-up — notably the "does this email already exist?" check —
 * bypassed the wrapper and searched across every academy.
 *
 * `prismaAdapter` accepts any Prisma client, so scoping the client applies to
 * every query regardless of which adapter instance Better Auth happens to hold.
 * This is the enforcement point.
 *
 * ## How it works
 *
 * Prisma generates `WhereUniqueInput` as an open shape: alongside the unique
 * keys it accepts any other field of the model. So `academyId` can be added to
 * the `where` of **every** operation, including `findUnique`, `update`, and
 * `delete`, without changing their semantics.
 *
 * That matters for correctness, not just simplicity. An earlier version
 * post-filtered unique reads and verified ownership in a separate query before
 * mutating. Both broke Prisma's contracts — `findUniqueOrThrow` returned `null`
 * instead of throwing, and `delete` returned `null` instead of throwing, turning
 * a clean `P2025` into an uncatchable `TypeError` at some later line — and the
 * verify-then-mutate pair was a time-of-check/time-of-use race. Filtering inside
 * the operation removes all three problems: a row in another academy simply does
 * not match, and Prisma raises its own not-found error exactly as it would for a
 * row that does not exist.
 */

type AnyArgs = Record<string, unknown> & {
  where?: Record<string, unknown>
  data?: unknown
  create?: Record<string, unknown>
}

/** Stamp the academy onto a row, refusing a conflicting value. */
function stamp(row: unknown, academyId: string): Record<string, unknown> {
  const record = (row ?? {}) as Record<string, unknown>
  const existing = record.academyId

  if (existing !== undefined && existing !== null && existing !== academyId) {
    throw new AcademyScopeError(
      `Refusing to write a learner-realm row for academy "${String(
        existing,
      )}" inside the context of academy "${academyId}".`,
    )
  }

  return { ...record, academyId }
}

export function createAcademyScopedPrisma(academyId: string) {
  if (!academyId) {
    throw new AcademyScopeError(
      'Cannot build an academy-scoped database client without an academy. Academy context must be resolved from a verified domain; it is never optional.',
    )
  }

  const extended = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!ACADEMY_SCOPED_MODEL_NAMES.has(model)) {
            return query(args)
          }

          const scoped = args as AnyArgs

          // --- Rows being created ---------------------------------------
          if (operation === 'create') {
            scoped.data = stamp(scoped.data, academyId)
            return query(scoped)
          }

          if (operation === 'createMany') {
            const data = scoped.data
            scoped.data = Array.isArray(data)
              ? data.map((row) => stamp(row, academyId))
              : stamp(data, academyId)
            return query(scoped)
          }

          // --- Upsert: constrain the match and stamp the insert ---------
          if (operation === 'upsert') {
            scoped.where = { ...(scoped.where ?? {}), academyId }
            scoped.create = stamp(scoped.create, academyId)
            return query(scoped)
          }

          // --- Everything else is filtered by the academy ---------------
          // Reads, aggregates, and mutations alike. A row belonging to another
          // academy does not match, so it is neither returned nor modified, and
          // Prisma raises not-found where its contract says it should.
          //
          // Applied unconditionally rather than only when a `where` is already
          // present. `updateMany` and `deleteMany` accept a call with no `where`
          // at all, and a conditional injection let exactly that call through
          // unfiltered — it updated every academy's rows. Building the filter
          // instead of extending one is what makes the default deny.
          scoped.where = { ...(scoped.where ?? {}), academyId }

          return query(scoped)
        },
      },
    },
  })

  return extended as unknown as PrismaClient
}
