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

- **The frontends have not been rebuilt yet.** `apps/studio` and `apps/learn`
  still call the legacy API's URLs, which the new API does not serve. A complete
  academy cannot be run end to end from the browser today; the domain and the
  HTTP surface beneath it are complete and tested.

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

| You changed              | Required test                                                         |
| ------------------------ | --------------------------------------------------------------------- |
| Authorization or tenancy | Cross-tenant attempts must fail. A positive test alone is not enough. |
| Money, checkout, refunds | Idempotency: the same request twice produces one business effect.     |
| Provider callbacks       | Duplicate and out-of-order delivery.                                  |
| Quizzes or grading       | Attempt limits; answer keys never leave the server.                   |
| The schema               | A migration that applies cleanly to an empty database.                |

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

| Debt                                                                | Why it exists                                                                                                    |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| React Compiler rules downgraded to warnings in `studio` and `learn` | Real violations in code being replaced. Downgraded rather than disabled, so the work stays visible in every run. |

Two carve-outs are gone: `apps/api` is in the lint and typecheck gate like every
other package, and the Prisma-boundary rule no longer exempts it. Both were
written with the condition for their removal, and removing them was part of
finishing the port.

## Before you push

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries
```

All four must pass. `pnpm boundaries` is the one people forget.
