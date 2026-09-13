/**
 * Academy scoping for the learner authentication realm.
 *
 * ## The problem
 *
 * Better Auth resolves a session by token, not by tenant. A session lookup has
 * no inherent academy scope, so in a single shared set of tables, isolation
 * would depend on every read path remembering to add a filter — and one
 * forgotten `where` clause is a cross-tenant leak, the most severe bug class in
 * this system.
 *
 * The learner realm therefore uses its own tables (`learner*`), each of which
 * carries `academyId` in its unique keys, and every operation is confined to one
 * academy.
 *
 * See docs/adr/0003-two-authentication-realms.md.
 *
 * ## Where enforcement actually lives
 *
 * **`academy-prisma.ts` is the enforcement point.** It scopes the Prisma client
 * that `prismaAdapter` is given, so it applies to every query regardless of
 * which adapter instance Better Auth resolves. See that file for why wrapping
 * the adapter is not sufficient.
 *
 * **This module is defence in depth.** `academyDatabaseHooks` stamps the
 * academy through Better Auth's documented hook API, so a create is scoped even
 * if a future release changes how adapters are resolved.
 *
 * An adapter *wrapper* previously lived here too. It was removed because it was
 * dead: nothing constructed it once scoping moved to the client, and leaving it
 * exported implied a layer that was not in force.
 *
 * The isolation test suite is the real gate. If any of this changes, those tests
 * fail loudly rather than silently widening access.
 */

/** Models in the learner realm, by their Prisma name. Every one carries `academyId`. */
export const LEARNER_REALM_MODELS = [
  'learner',
  'learnerSession',
  'learnerAccount',
  'learnerVerification',
] as const

/**
 * The same models as a lookup set, accepting both casings.
 *
 * Prisma reports model names as written in the schema (`Learner`), while Better
 * Auth and the rest of this package use camelCase. A guard that matched only one
 * form would silently disable all scoping, so both are accepted and the set is
 * defined once here rather than repeated per module.
 */
export const ACADEMY_SCOPED_MODEL_NAMES: ReadonlySet<string> = new Set(
  LEARNER_REALM_MODELS.flatMap((model) => [
    model,
    model.charAt(0).toUpperCase() + model.slice(1),
  ]),
)

export class AcademyScopeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AcademyScopeError'
  }
}

/** Stamp the academy onto a row being created, refusing a conflicting value. */
export function scopeData<T extends Record<string, unknown>>(
  data: T,
  academyId: string,
): T & { academyId: string } {
  const existing = data.academyId

  if (existing !== undefined && existing !== null && existing !== academyId) {
    throw new AcademyScopeError(
      `Refusing to create a learner-realm row for academy "${String(
        existing,
      )}" inside the context of academy "${academyId}".`,
    )
  }

  return { ...data, academyId }
}

/**
 * Build the `databaseHooks` that stamp an academy onto every learner-realm row
 * as it is created.
 *
 * This is the write-side enforcement point, and it uses the documented hook API
 * rather than adapter internals — see the module comment for why.
 */
export function academyDatabaseHooks(academyId: string) {
  if (!academyId) {
    throw new AcademyScopeError(
      'Cannot build learner database hooks without an academy.',
    )
  }

  const beforeCreate = async <T extends Record<string, unknown>>(data: T) => ({
    data: scopeData(data, academyId),
  })

  return {
    user: { create: { before: beforeCreate } },
    session: { create: { before: beforeCreate } },
    account: { create: { before: beforeCreate } },
    verification: { create: { before: beforeCreate } },
  }
}
