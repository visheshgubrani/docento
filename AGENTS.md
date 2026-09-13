# Repository Guidelines

Guidance for working in this repository, human or agent. Read
[ARCHITECTURE.md](./ARCHITECTURE.md) first — it explains *why* the constraints
below exist.

## Current state

The project is **pre-alpha**. The foundation is complete and verified; the
product is being built on it. Read [ROADMAP.md](./ROADMAP.md) before assuming a
feature exists.

The single most important thing to understand:

> `apps/api` is the previous closed-source Express application. It still runs on
> **its own Prisma schema** at `apps/api/prisma/schema.prisma` and has **not**
> been ported onto `packages/domain`. The two coexist during the port.

Consequences you will hit:

- There are two Prisma schemas. `apps/api` generates to
  `apps/api/src/generated/prisma` (gitignored) precisely so that generating the
  domain client does not overwrite it. Do not remove that `output` setting.
- `apps/api` has pre-existing lint and type errors. Its gate scripts are named
  `lint:legacy` and `typecheck:legacy` and are deliberately excluded from the
  workspace gate until the port. Run them directly with
  `pnpm --filter @docento/api typecheck:legacy`.
- You cannot run a complete academy end to end yet.

## Layout

```
apps/
  api/           HTTP surface (legacy, being ported)
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
it moves *down* into `contracts` — do not relax the rule.

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

| You changed | Required test |
| --- | --- |
| Authorization or tenancy | Cross-tenant attempts must fail. A positive test alone is not enough. |
| Money, checkout, refunds | Idempotency: the same request twice produces one business effect. |
| Provider callbacks | Duplicate and out-of-order delivery. |
| Quizzes or grading | Attempt limits; answer keys never leave the server. |
| The schema | A migration that applies cleanly to an empty database. |

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

| Debt | Why it exists |
| --- | --- |
| `apps/api` excluded from the lint and typecheck gate | Legacy app replaced during the port. Scripts renamed; the reason is in its `package.json` and in ROADMAP.md. |
| React Compiler rules downgraded to warnings in `studio` and `learn` | Real violations in code being replaced. Downgraded rather than disabled, so the work stays visible in every run. |
| `apps/api` exempt from the Prisma-boundary rule | Same reason. The exemption is in `.dependency-cruiser.cjs` with a comment explaining when it is removed. |

## Before you push

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm boundaries
```

All four must pass. `pnpm boundaries` is the one people forget.
