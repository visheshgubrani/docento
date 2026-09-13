# Learner realm isolation spike — findings

Status: **passing.** All seven checks in
`src/auth/__tests__/learner-isolation.test.ts` are green against a real Postgres.

```bash
docker compose up -d postgres
pnpm --filter @docento/domain db:migrate
cd packages/domain && ./node_modules/.bin/vitest run
```

This file records what the spike established and the three findings that changed
the implementation. They are worth reading before touching authentication,
because each one cost real debugging time and none is guessable from the docs.

## Result

Two isolated authentication realms, each with its own tables, cookie prefix, and
secret. A learner account belongs to exactly one academy, two academies can hold
the same email address with independent credentials, and a session issued by one
academy cannot be resolved in another — verified under concurrent validation,
not only sequentially.

## Finding 1 — Better Auth does not necessarily write through the adapter you wrap

`createWithHooks` resolves its adapter through an async-local-storage lookup:

```js
// @better-auth/core/dist/db/context/transaction.mjs
const getCurrentAdapter = async (fallback) =>
  ensureAsyncStorage().then((als) => als.getStore()?.adapter || fallback)
```

The instance that resolves there is **not** always the one produced by wrapping
`prismaAdapter`. On the sign-up path, writes and the email-uniqueness read
bypassed the wrapper while direct calls such as
`ctx.internalAdapter.findUserByEmail` did not.

This produced learner rows with no academy attached, and later an unscoped
uniqueness check that let academy B see academy A's user and fail with
"User already exists".

**Consequence:** an adapter wrapper is not a reliable enforcement point on
request paths. Do not reintroduce one as the primary mechanism.

## Finding 2 — undeclared fields are silently dropped before insert

Adding `academyId` in a `databaseHooks` handler had no effect until the field was
declared on the model:

```ts
user: {
  modelName: 'learner',
  additionalFields: { academyId: { type: 'string', required: false } },
}
```

`transformInput` filters anything not in the resolved schema. The failure signals
this clearly once you know to look: the insert simply arrives without the column,
and Prisma reports the missing relation rather than an unknown field.

## Finding 3 — field names must be mapped, not assumed

Better Auth refers to the owning account as `userId` on the session and account
models. This schema calls those columns `learnerId`, because in this realm the
subject is always a learner. Without an explicit mapping the field is dropped:

```ts
account: {
  modelName: 'learnerAccount',
  fields: { userId: 'learnerId' },
}
```

## Where enforcement now lives

**`academy-prisma.ts` — the enforcement point.** `prismaAdapter` accepts any
Prisma client, so scoping the client applies to every query regardless of which
adapter instance Better Auth holds. Reads get `academyId` added to their filter,
or are post-filtered when the lookup key is a bare unique column; writes are
stamped; mutations verify ownership first.

Two details that are easy to get wrong:

- The `model` passed to a Prisma query extension is the **schema** name
  (`Learner`), not the camelCase name Better Auth uses. Matching only one casing
  silently disables all scoping — the guard accepts both.
- Prisma emits `@@unique` as a unique **index**, not a table constraint. Schema
  assertions must read `pg_indexes`; `table_constraints` reports only the primary
  key and yields a false failure.

**`academy-scope.ts` — defence in depth.** `academyDatabaseHooks` stamps the
academy through Better Auth's documented hook API, so a create stays scoped even
if a future release changes how adapters are resolved.

An adapter _wrapper_ also lived here. It was removed once scoping moved to the
client, because nothing constructed it any more — leaving it exported implied a
layer that was not in force, which is worse than having no layer at all.

**`staff.ts` — the organization plugin.** The plugin speaks in organizations and
stores `activeOrganizationId` on the session; the domain speaks in workspaces.
Both are mapped explicitly rather than renaming domain columns to match a
third-party vocabulary.

## What would invalidate this

A Better Auth upgrade that changes `transformInput`, adapter resolution, or the
organization plugin's field expectations. The test suite is the gate: if any of
these move, checks 1–5 fail loudly rather than silently widening access.
