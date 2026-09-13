# Repository Guidelines

Guidance for working in this repository, human or agent. Read
[ARCHITECTURE.md](./ARCHITECTURE.md) first — it explains _why_ the constraints
below exist.

## Current state

The project is **pre-alpha**. The foundation is complete and verified; the
product is being built on it. Read [ROADMAP.md](./ROADMAP.md) before assuming a
feature exists.

The single most important thing to understand:

> There is **one** database schema, in `packages/domain`, and **one** query
> path. The closed-source Express application and its Prisma schema are gone.
> Every consumer — the API, the worker, both frontends — goes through a domain
> operation.

The consequence you will hit:

- **The free-learning loop is proven end to end, in CI.** Both frontends call
  `@docento/sdk` over HTTP, and `apps/api/src/__tests__/free-loop.test.ts` drives
  the SDK against the app over real requests — author, publish, enrol, complete,
  certify, verify — against real Postgres. It runs in CI's `verify` job, whose
  only service is Postgres. Treat a change that breaks it as breaking the
  milestone's exit condition rather than one test among many.
- **Media moves bytes outside the operation registry, on purpose.** Four
  operations are registered — `media.create`, `media.complete`, `media.list`,
  `media.delete` — and two routes are not: `PUT /media/upload/{key}` and
  `GET /media/{academyId}/{assetId}`. The registry describes JSON operations with
  a response schema a generated client can unwrap, and a byte stream is neither.
  `media.upload` and `media.serve` are therefore _names that will never exist as
  operations_; the anti-drift test in `apps/api/src/__tests__/routes.test.ts`
  asserts the two byte routes exist so they cannot be dropped silently.
- **Serving media is authorized per request.** `authorizeMediaServe` requires the
  caller to reach the academy and, for a learner, to have access to a course
  whose _published release_ uses the asset. The second half is the one that
  matters: `media:serve` is granted academy-wide, so the check alone would hand
  any learner every video in the academy.
- **Payments are out of scope for now.** Stripe and Razorpay are deferred, not
  cancelled — see milestone D in `ROADMAP.md`. The groundwork is deliberate:
  `AccessGrant` is separate from `Enrollment`, so entitlement does not depend on
  how it was paid for. Do not add checkout scaffolding ahead of the work.

## Layout

```
apps/
  api/           HTTP surface. Validates, resolves context, invokes a domain operation.
  worker/        durable jobs, outbox delivery, scheduled maintenance
  studio/        staff and creator application
  learn/         multi-tenant learner application
  docs/          documentation site
packages/
  domain/        business rules, authorization, Prisma schema, migrations
  contracts/     Apache-2.0. Zod schemas — the public API's source of truth
  sdk/           Apache-2.0. Typed client, derived from contracts
  integrations/  jobs today; AI, media, storage, payments, email next
  config/        validated environment and the shared ESLint preset
docs/adr/        architecture decision records
```

## Commands

pnpm only. Other lockfiles are gitignored and must not be committed.

```bash
pnpm install
docker compose up -d      # Postgres on 5433, the only required service
pnpm db:migrate           # apply the schema
pnpm dev                  # all apps
pnpm test                 # turbo, all packages
pnpm typecheck
pnpm lint
pnpm boundaries           # architecture rules — run before pushing
```

To run the product itself in containers rather than from the checkout — the API,
worker and both frontends, against Postgres alone — use the `app` profile. It
requires three secrets that have no safe default and fails closed without them:

```bash
docker compose --profile app up -d --build
```

Per package: `pnpm --filter @docento/domain test`.

Environment lives in `packages/domain/.env` (copy from `.env.example`). It is
validated at startup — a missing or malformed value produces a report listing
every problem at once, along with the command to generate a replacement.

## Rules that are enforced, not suggested

These fail the build. They are not style preferences.

**Business rules live in `packages/domain` and nowhere else.** Controllers
validate and invoke a domain operation. Workers invoke the same operation. No
frontend talks to Prisma; no controller re-implements pricing, grading,
enrollment, or authorization.

**An Apache-2.0 package must never import an AGPL-3.0 package.**
`packages/contracts` and `packages/sdk` are Apache-2.0 so they stay usable in
proprietary software. Dependency direction is one-way. If you need shared code,
it moves _down_ into `contracts` — do not relax the rule.

**Only `packages/domain` may import `@prisma/client`.** A second query path is
how a tenant filter gets forgotten.

**All authorization goes through `can(principal, action, resource)`.** No
route-level permission checks. Scoped grants below the workspace level are a
separate question — ask `canViaAssignment` as well, rather than assuming a role
check covered them.

## Working on authentication

Read
[`packages/domain/src/auth/__tests__/SPIKE-FINDINGS.md`](./packages/domain/src/auth/__tests__/SPIKE-FINDINGS.md)
before changing anything in the auth path. It records three findings that cost
real debugging time and are not guessable from the Better Auth documentation:

1. Better Auth does not reliably write through an adapter you wrap — on request
   paths it resolves adapters through async-local storage.
2. Undeclared fields are silently dropped before insert; `additionalFields` is
   required for a custom column to survive.
3. Field names must be mapped, not assumed (`userId` versus the domain's
   `learnerId`).

Two non-obvious details that make academy scoping either work or silently do
nothing:

- A Prisma query extension receives the **schema** model name (`Learner`), not
  the camelCase name Better Auth uses. The guard accepts both; do not narrow it.
- Prisma emits `@@unique` as a unique **index**, so schema assertions must read
  `pg_indexes`, not `table_constraints`.

Isolation is enforced at the **database client** (`academy-prisma.ts`), with the
adapter wrapper and `databaseHooks` as defence in depth. The isolation suite is
the gate: if it fails, do not build on top of it.

## Testing

Tests run against a real Postgres, because the guarantees are database
properties — unique indexes and atomic statements. A mocked client would test
nothing that matters.

Required when you touch the corresponding area:

| You changed              | Required test                                                                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization or tenancy | Cross-tenant attempts must fail. A positive test alone is not enough.                                                                                                                           |
| Money, checkout, refunds | Idempotency: the same request twice produces one business effect.                                                                                                                               |
| Provider callbacks       | Duplicate and out-of-order delivery.                                                                                                                                                            |
| Quizzes or grading       | Attempt limits; answer keys never leave the server. `quiz.get` is the one exception — staff-only, behind `course:read` — and the OpenAPI test names it so a second one cannot appear unnoticed. |
| The schema               | A migration that applies cleanly to an empty database.                                                                                                                                          |

## Conventions

- TypeScript everywhere. 2-space indent. Run `pnpm format` before pushing.
- `PascalCase` for components and types, `camelCase` for functions and
  variables, `kebab-case` for route and utility filenames.
- Conventional Commits, one concern per commit.
- Validate at the boundary with Zod. The schema is the type; do not hand-write a
  parallel interface.
- Commits must be signed off (`git commit -s`). See
  [CONTRIBUTING.md](./CONTRIBUTING.md).

## Known debt, tracked and deliberate

Do not "fix" these without reading the reasoning first. Each is recorded where
it lives.

There are none outstanding. The carve-outs that existed while the legacy
application was being replaced are all gone: `apps/api` is in the lint and
typecheck gate like every other package, the Prisma-boundary rule no longer
exempts it, and neither frontend downgrades a rule. Each was written with the
condition for its removal, and removing them was part of finishing the port.

What replaced them is the gate itself. If something needs a downgrade to pass,
that is a conversation to have in the pull request — with the condition for
removing it written down — rather than a rule quietly relaxed.

## Before you push

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries
```

All four must pass. `pnpm boundaries` is the one people forget.
