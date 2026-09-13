# Milestone A — implementation review

Reviewed: 2026-09-11. Scope: the working tree at `/home/vishesh/docento` (710
uncommitted changes), the two-realm auth spike, `packages/{domain,config,integrations,contracts,sdk}`,
the CI workflows, `docs/adr/0001..0010`, and the top-level documents.

Method: every claim below was checked against the running system. Where a bug is
claimed, it was reproduced against the real Postgres before being written down.
Line numbers are from the reviewed revision.

---

## Verdict

The foundation is **real work and mostly good**. The tenancy model, the
authorization action table, the config loader, and the atomic rate limiter are
the parts I would keep without changes. The isolation spike genuinely passes, and
the three findings it records are correct and valuable.

It is **not ready to be declared complete**, for three reasons:

1. **One bug in the authorization entry point can silently allow cross-tenant
   access** (`can()` returns `allowed` when `resource.workspaceId` is omitted).
   Milestone B writes dozens of controllers against this function.
2. **A stranger's first `docker compose up` produces an empty database with no
   way to create the first workspace, academy, or account** — no seed, no
   bootstrap. The stated Milestone A exit criterion ("a new contributor can
   clone, run one command, and get a working install") is not met.
3. **CI fails on the first push**, in two independent jobs, and three of four
   Dockerfiles cannot build at all.

There is also a set of things _verified true_ that the milestone text claims
otherwise — most importantly that rate limiting is shared (the Postgres limiter
is built and tested but nothing calls it) and that the adapter wrapper is
enforcement (it is never constructed).

Nothing is committed and I changed nothing. All probe files I created have been
removed.

---

## What I verified myself

| Claim                                 | Result                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm boundaries`                     | **Passes.** 889 modules, 2253 deps, 0 violations                         |
| `pnpm lint`                           | Passes — 202 warnings, **0 errors** across 10 packages                   |
| `pnpm typecheck`                      | Passes — 9 packages                                                      |
| `pnpm test`                           | **75 tests pass** (config 28, domain 42, integrations 5)                 |
| `pnpm db:deploy` on an empty database | 3 migrations apply cleanly                                               |
| `apps/api` typecheck / lint           | **112 type errors / 33 lint errors** — exactly as documented             |
| `.env.example` → boot                 | Secrets validated; placeholders accepted (see #5)                        |
| Two-realm isolation                   | 12/12 green, including 12-way concurrent cross-academy session rejection |
| Rate limiter concurrency              | Correct: 20 concurrent against limit 3 admits exactly 3                  |

Two corrections to the milestone summary. First, I initially suspected a
rate-limit off-by-one because `remaining` reports `0` on the last _allowed_
request; I probed it and the limiter is correct — the boundary is right, the
reporting is just unusual. Second, my first gate run reported exit 0 for all four
commands while they had all failed, because the shell piped them through `tail`.
Anyone re-running these gates should not pipe them; `PIPESTATUS` is not `$?`.

---

## Blockers before Milestone B

### 1. `can()` allows access when the resource carries no `workspaceId` — CRITICAL

`packages/domain/src/authorization/can.ts:126` guards staff with
`if (resource.workspaceId && resource.workspaceId !== principal.workspaceId)`.
The `&&` means the containment check is skipped entirely when the caller does
not pass a workspace. Reproduced:

```
can(ownerOfWorkspaceA, 'course:update', { workspaceId: 'ws-B' })
  → { allowed: false, reason: 'The resource belongs to a different workspace.' }

can(ownerOfWorkspaceA, 'course:update', { courseId: 'course-in-ws-B' })
  → { allowed: true }

can(serviceKeyInWorkspaceA, 'course:update', { courseId: 'anything' })
  → { allowed: true }
```

The `Resource` type is all-optional, so TypeScript cannot catch a call site that
forgets the workspace. The doc comment says "Tenant containment is checked before
any role logic, so a sufficiently privileged principal from the wrong tenant is
still refused" — that is only true when the caller supplies the ID. The learner
branch has the same shape at `can.ts:72`.

This is exactly the bug class `ARCHITECTURE.md` says is the most severe in the
system, sitting inside the one function everything is required to call. The
staff denial tests all pass `{ workspaceId: WS }`, which is why they are green.

**Fix:** make the requirement structural rather than a convention. Either give
`Resource` a discriminated shape where tenant-scoped actions must carry a
workspace/academy, or add a lookup table of required resource fields per action
and fail closed when one is absent. A test that calls every action with `{}` and
asserts denial would have caught this.

### 2. `findUniqueOrThrow` silently returns `null`; `delete` returns `null` instead of throwing

`packages/domain/src/auth/academy-prisma.ts:122-137` and `:140-157`. Reproduced
against a real row in another academy:

```
findUniqueOrThrow({ where: { id: <row in academy A> } }) on academy B's client
  → returned null   (Prisma's contract is to throw)

delete({ where: { id: <row in academy A> } }) on academy B's client
  → returned null   (Prisma's contract is to throw)
```

Prisma types `findUniqueOrThrow` as non-nullable (`GetResult<…, never, …>`), so a
`null` here becomes an uncatchable `TypeError` at an arbitrary later line instead
of a clean `P2025`. The comment at `academy-prisma.ts:148-153` claims "delete
throws" while the code returns `null` from both branches — the `if` is dead.

**Fix:** throw Prisma's `NotFoundError` for both, or — better — drop the
post-filter entirely. Prisma's generated `WhereUniqueInput` already accepts
non-unique filters (`academyId?: StringFilter | string` is in
`LearnerWhereUniqueInput`), so `where: { ...args.where, academyId }` works
directly on `findUnique`, `findUniqueOrThrow`, `update`, and `delete`. That
removes the verify-then-mutate race in the `update`/`delete` path as well.

### 3. Shared rate limiting is built but not wired in — the milestone claim is not true

`consumeRateLimit` and `RATE_LIMIT_RULES` are exported from `packages/domain` and
referenced **only by their own test file**. Nothing in `staff.ts`, `learner.ts`,
or `apps/worker` calls them.

Meanwhile Better Auth's built-in limiter defaults to
`enabled: isProduction, storage: 'memory'` (`@better-auth/core/dist/context/create-context.mjs:170-175`),
so in production the sign-in endpoints are protected by a **per-replica
in-memory** limiter — the exact failure `packages/domain/src/rate-limit/index.ts`
exists to prevent. The `signIn` / `learnerSignIn` / `passwordReset` rules are
dead config.

**Fix:** pass Better Auth a database-backed `rateLimit.storage` (its `database`
strategy is closer to working than a custom hook), or attach `consumeRateLimit`
in a `before` hook on the auth paths, and add a test that asserts a sign-in
brute-force is actually throttled through the real endpoint.

### 4. CI fails on the first push — two jobs

- **`verify` job: `pnpm --filter @docento/api build` is not carved out.**
  `apps/api/package.json:6` is `"build": "tsc"`, and `tsc` exits 2 with 112 type
  errors. `lint:legacy` and `typecheck:legacy` were renamed out of the gate, but
  `build` was left in it. Either the API needs `"build": "tsc --noEmitOnError false || true"`
  (ugly), or the CI build job must exclude it until the port.
- **DCO job fails on the existing commit.** `c82858c` ("feat: Initial
  open-source release of Docento") carries no `Signed-off-by` trailer;
  `./scripts/check-dco.sh HEAD` exits 1. The workflow only runs on
  `pull_request`, so it will not fire until the first PR — and then it will
  report this commit. Since it is already pushed, either park the DCO check
  behind a `paths`/base filter until the history is clean, or accept that the
  first PR needs the base commit fixed.

The `build` job also runs with no Postgres service while `apps/studio` builds
`@docento/domain` (which constructs `PrismaClient` at import). That is probably
fine — `PrismaClient` connects lazily — but it is untested and worth confirming
rather than assuming.

### 5. A fresh clone can never be used — no seed, no bootstrap

`pnpm db:migrate` leaves zero workspaces, zero academies, zero users. There is no
seed script (`grep -rn seed` finds nothing), and no "create your first
workspace" flow exists in any app. `apps/api` is legacy and knows nothing about
workspaces or academies.

The Milestone A exit condition is "a new contributor can clone, read
CONTRIBUTING.md, run one command, and get a working install". Clone and install
work. "Working" does not: there is nothing to sign in to, because
`allowUserToCreateOrganization: true` only helps once someone can reach the
staff auth mount, and there is no API app serving it.

`CONTRIBUTING.md:114` also promises "the first-run setup that creates your owner
account and first academy, is in the [self-hosting docs](./apps/docs)" — that
document does not exist, and `apps/docs/content` is the legacy product's
documentation (see #9).

**Fix:** a `db:seed` script that creates one workspace + academy + owner, with
the owner's credentials printed once. This is also the fixture Milestone B's
end-to-end test needs.

### 6. All three Dockerfiles are broken by the monorepo move

`apps/api/Dockerfile:7-9`, `apps/learn/Dockerfile:14`, `apps/studio/Dockerfile:14`
all `COPY package.json pnpm-lock.yaml` from the app directory and run
`pnpm install --frozen-lockfile`. The app-level lockfiles were deliberately
deleted; the single lockfile is at the repo root. `pnpm install --frozen-lockfile`
in a directory with no lockfile fails, so no image builds.

`apps/api/Dockerfile` additionally runs `npx prisma generate` (line 15) in a
pnpm-only repo.

**Fix:** either build from the repo root context with a workspace-aware
Dockerfile (`pnpm deploy --filter …`), or add a `docker build` job to CI so this
cannot rot again. Right now nothing verifies these files at all.

### 7. Stored XSS in the learner player — CRITICAL, in code Milestone B inherits

`apps/learn/src/components/course-player/text-lesson-content.tsx:123-130` has a
hand-rolled sanitizer whose event-handler patterns only match _quoted_
attributes:

```js
.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
```

`<img src=x onerror=alert(document.cookie)>` passes through untouched and is
rendered by `dangerouslySetInnerHTML` at line 229. No sanitizer library is
installed anywhere in the repo. Any academy editor can store a payload that runs
for every learner. The TipTap-JSON path above it escapes correctly; only the
legacy-HTML fallback is unsafe.

**Fix:** DOMPurify at that one sink. A regex is not a sanitizer.

### 8. A legacy publishable key authorizes learner CRUD — CRITICAL

`apps/api/src/middlewares/auth.middleware.ts:396-409` labels the `pk_` branch
"Publishable Key (Public/Read-Only)", sets `req.project` with
`req.user = undefined`, and returns. `req.apiKeyAuth.type === 'publishable'` is
never consulted as an authorization signal anywhere (only for rate-limit keying
and analytics).

That branch is the sole gate for `authorizeProjectAccess`, which
`apps/api/src/routes/projects.routes.ts:772` applies to every `/:projectId` route,
including `GET /:projectId/end-users`, `POST /:projectId/end-users`,
`PATCH /:projectId/end-users/:id/status`, and `DELETE /:projectId/end-users/:id`.
The handlers check only `req.project`.

`ARCHITECTURE.md:193-195` states: "Publishable keys are public. They identify an
academy in a browser. They do not authenticate learners, do not grant paid-content
access, and do not substitute for authorization." The legacy app does the
opposite today. Since publishing happens before the port, this is a live
vulnerability in a public repository.

**Fix:** require a secret key on every end-user route; make
`authorizeProjectAccess` reject `pk_` by default with explicit opt-in for
read-only storefront routes only.

### 9. Identifiers from the closed-source product are still in the tree

- **"HeadlessLMS" appears 25 times** across `apps/docs/content/**`,
  `apps/api/src/utils/logger.ts:71` (the default structured-log `service` field),
  and two studio components. The docs site describes `Project` tenants,
  `MANAGED`/`DELEGATED` auth modes, and `POST /v1/delegated/login` — models the
  new architecture explicitly replaces (ADR 2, ADR 3).
- **A developer's local paths are committed**: `apps/docs/production-readiness-checklist.md`
  contains ten links to `/home/akira/LMS/...` (lines 34, 41–43, 115, 116, 139,
  229, 232, 233), exposing a username and the old `server/ | client/ | dogfood-client/`
  layout.

This is a release-blocking cleanup, not a Milestone B task. If the intent is to
ship the docs site as-is for now, the identity references still have to go.

### 10. Milestone summary claims "the working tree holds ~700 renames" — fine, but nothing is committed and the `.env.example` ships usable secrets

`packages/domain/.env.example:24-30` contains literal values for both auth
secrets and a valid all-zero 32-byte `ENCRYPTION_KEY`. The schema accepts them,
so a self-hoster who copies the file and does not read the README gets a
production install whose session-signing secrets are published on GitHub. The
comment says "replace-me", but nothing enforces it.

**Fix:** add a refinement that rejects the known placeholders, so validation
fails with the same actionable message it already produces for a missing
variable.

---

## Should fix before or during Milestone B

1. **The adapter wrapper is dead code, and both the ADR and the spike doc claim
   it is live enforcement.** `withAcademyScope` and `scopeAdapter` are exported
   from `packages/domain/src/index.ts:36-39` and **never constructed**.
   `learner.ts:53` passes only `createAcademyScopedPrisma(academyId)`.
   `academy-scope.ts:20-40` says "Reads are scoped by the adapter wrapper below.
   That is the layer which makes a token issued by one academy unfindable in
   another", and `SPIKE-FINDINGS.md` calls it "defence in depth". Both are wrong
   as written. Either wire it up or delete it and correct the documents — an
   unused security mechanism that the docs say is load-bearing is worse than
   neither.
2. **`createAcademyScopedPrisma` guards only four models.** `enrollment`,
   `lesson_progress`, `quiz_attempt`, `quiz_answer`, `certificate`,
   `assignment_submission`, `order`, `access_grant`, and `payment` are all
   academy-owned learner data and are **not** in `ACADEMY_SCOPED_MODELS`
   (`academy-prisma.ts:48-57`). Any domain operation that uses this client for
   those models gets no scoping at all, silently. The guard's docstring —
   "scoping the client applies to every query regardless of which adapter
   instance Better Auth happens to hold" — overstates what it does. Decide the
   boundary deliberately and encode it: either extend the set with a hard-coded
   deny-list of learner-owned models that must never appear, or rename the
   function to what it actually is (`createLearnerAuthScopedPrisma`) so nobody
   builds domain queries on it expecting tenant filtering.
3. **`expireIn` is not a pg-boss option; it is `expireInSeconds`.** `packages/integrations/src/jobs/index.ts:194-196`
   reads `declared.expireInSeconds` and then sends `sendOptions.expireIn = 60`.
   pg-boss 12 only reads `expireInSeconds` from the job options JSON. Verified
   against the store: `SELECT expire_seconds FROM pgboss_probe.job` returns
   **900** (the 15-minute queue default) for `webhook.deliver`, not 60. The
   comment "Bounded so a hostile endpoint cannot occupy a worker indefinitely" is
   not in effect. Related: `retryBackoff: true` with `retryDelay` defaulting to
   `0` makes backoff a no-op (the documented formula is `retryDelay * 2^n`), so
   `webhook.deliver` retries 8 times with **no delay at all** — a tight loop
   against a failing endpoint. Set `retryDelaySeconds` explicitly.
4. **`HandlerContext.attempt` is always `1`.** `jobs/index.ts:240` hard-codes it,
   and pg-boss's `Job` type exposes no retry count (only `JobWithMetadata` does).
   A handler cannot tell a first attempt from an eighth, which is precisely what
   idempotency code needs.
5. **`withMany`/transactional enqueue does not exist.** ADR 7 and
   `ARCHITECTURE.md:138-139` both state jobs are enqueued _inside_ the business
   transaction ("If the business change rolls back, the job does not exist").
   `JobQueue.enqueue` calls `this.boss.send()` and accepts no transaction client.
   This is Milestone B/D work, but it is described as already-true.
6. **`pnpm format` does not work and CI does not check it.** There is no root
   Prettier config and no root `.prettierignore`; `prettier --check .` reports
   **569 files** with style issues. The new code is written in a
   single-quote/no-semicolon style that no committed config describes, and
   `apps/learn/.prettierrc` conflicts with it. `CONTRIBUTING.md:133` and
   `AGENTS.md` both instruct contributors to run `pnpm format` before pushing —
   following that instruction would reformat the entire repository. Add the root
   config matching the existing style, a `.prettierignore`, and a
   `format:check` step in CI.
7. **`apps/api/prisma/**` contradicts ADR 10.** ADR 10 says "the closed-source
   schema is not carried forward, and the closed-source migrations are not
   included in the published repository." Both are tracked: 11 migration
   directories under `apps/api/prisma/migrations/` plus the schema itself. ADR 10
   also says "a single initial migration" while `packages/domain` has three.
   Either amend ADR 10 to scope its claim to `packages/domain`, or drop the
   legacy migrations from the release.
8. **`packages/config` declares `@eslint/js` and `typescript-eslint` inconsistently.**
   `@eslint/js` is a runtime `dependency` (correct, `eslint/index.js` imports it)
   while `typescript-eslint`, imported by the same file, is a `devDependency` —
   which `pnpm boundaries`'s `no-dev-deps-in-source` rule does not catch because
   the rule is scoped to `src/`.
9. **`ENCRYPTION_KEY` is required by config but read by nothing** in the new
   foundation — only the legacy `apps/api/src/utils/encryption.ts` uses it.
   Failing a fresh boot over an unused secret is defensible, but it should be a
   decision, not an accident.
10. **`packages/contracts` and `packages/sdk` are hand-written stubs presented as
    generated artifacts.** `ARCHITECTURE.md:211-214` and `CONTRIBUTING.md:134-135`
    say the OpenAPI document and the SDK are generated from contracts. No codegen
    exists; `sdk/src/index.ts` has two hand-written methods and `apps/api` still
    uses JSDoc swagger. `packages/sdk` declaring `@docento/contracts` is the only
    real dependency edge.

---

## Schema issues worth fixing now (cheap before data exists)

These are all in `packages/domain/prisma/schema.prisma`. ADR 10 makes this the
cheapest possible moment to change them.

1. **`Payment` is unique on `(provider, providerRef)` with no connection.** ADR 9
   and `ARCHITECTURE.md:316` say inbound events are deduplicated on
   `(connection, event id)`. A workspace with a test and a live Stripe connection
   would collide on provider references. `InboundEvent` has `connectionId`;
   `Payment` does not.
2. **`MediaAsset` is unique on `(provider, providerAssetId)` globally**, while
   the asset is workspace-owned and ADR 8 says "An asset stores the connection
   that produced it, permanently." The connection is not a column at all. Two
   workspaces on the same S3 bucket or OpenVOD project can produce the same
   provider asset id.
3. **`Lesson.mediaAssetId` has no foreign key**, and **`LessonProgress.lessonId`
   has no foreign key** (correctly, since it must survive republication) — but
   `MediaAsset.referenceCount` exists precisely to make deletion safe. Without an
   FK or an explicit reference table, that counter cannot be kept correct, and
   ADR 8's "Getting this wrong deletes another course's video" is unguarded.
4. **Cascading deletes reach financial and credential records.** `Payment`,
   `Refund`, `Order`, and `Certificate` all `onDelete: Cascade` from `Learner` or
   `Course`. ADR 9 says "Financial history is immutable and auditable" and ADR 5
   says an issued certificate "remains valid and verifiable, permanently", while
   `Certificate` already has `revokedAt`/`revocationReason`. Deleting a learner
   erases both, and a GDPR erasure request would destroy the records you are
   obliged to keep. Decide this deliberately.
5. **`StaffSession.activeWorkspaceId` is never written.** The organization plugin
   writes `activeOrganizationId`; the migration that added it is named
   `20260911112525_org_plugin_fields`. `activeWorkspaceId` is a vestige of an
   earlier design. Its Prisma `@@map` is correct — the snake_case case-conversion
   gap I looked for is not a real issue.
6. **`StaffUser.banned/banReason/banExpires` and `StaffSession.impersonatedBy`
   are unused** — the admin plugin is not enabled on `staffAuth`. The feature is
   advertised by the schema comments and does not exist. `Member.role` also has no
   CHECK constraint and `can()` rejects any role that is not `owner`/`admin`,
   while Better Auth's organization defaults include `member` — a membership
   created by the plugin with `role: 'member'` would be denied everything with
   "Unrecognised staff role".

---

## Documentation that is wrong

Verified in the documents themselves; every one of these will mislead a
contributor.

| Where                                                                                            | Says                                                                                                                                                  | Actually                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ARCHITECTURE.md:83`, `CONTRIBUTING.md:69,120`, `docs/adr/0006:36`, `.dependency-cruiser.cjs:26` | `packages/ui` exists, AGPL                                                                                                                            | No such directory                                                                                                                                                                                                                                                                                                              |
| `ARCHITECTURE.md:86`, `CONTRIBUTING.md:122`                                                      | `docker/` holds compose files                                                                                                                         | Compose is at the repo root; no `docker/`                                                                                                                                                                                                                                                                                      |
| `ARCHITECTURE.md:326-335`                                                                        | "one `docker compose up`: proxy, Studio, Learn, API, worker, and Postgres … the compose file demonstrates the correct wiring" (shared uploads volume) | `docker-compose.yml` defines **only** `postgres` and one volume                                                                                                                                                                                                                                                                |
| `ARCHITECTURE.md:284-299`, `docs/adr/0008:42-58`                                                 | Media provider interface, local/S3/OpenVOD adapters, short-lived playback URLs                                                                        | No media code anywhere; only Prisma models and env vars                                                                                                                                                                                                                                                                        |
| `ARCHITECTURE.md:251-258`                                                                        | "Two supported flows at launch, both complete" (AI)                                                                                                   | No AI code anywhere                                                                                                                                                                                                                                                                                                            |
| `ARCHITECTURE.md:138-139`, `docs/adr/0007:33-37`                                                 | Jobs enqueued inside the business transaction, using pg-boss ORM transaction adapters                                                                 | `JobQueue.enqueue` takes no transaction and calls `boss.send()` directly                                                                                                                                                                                                                                                       |
| `CONTRIBUTING.md:162`                                                                            | `pnpm test:e2e  # Playwright flows`                                                                                                                   | No such script, no Playwright anywhere                                                                                                                                                                                                                                                                                         |
| `CONTRIBUTING.md:114`                                                                            | First-run setup that creates your owner account and first academy, in `apps/docs`                                                                     | No such document; `apps/docs` is legacy content                                                                                                                                                                                                                                                                                |
| `docs/adr/0003:45`, `ARCHITECTURE.md:155`                                                        | Learner tables are `learner_user`, …                                                                                                                  | The table is `learner` (mapped); only three of the four carry `academyId` in a unique key                                                                                                                                                                                                                                      |
| `docs/adr/0003:45` wording                                                                       | "Carries `academyId` … in every unique key"                                                                                                           | False for `learner_session` (unique on `token` alone), `learner_account` (no unique at all), `learner_verification` (composite includes it). Only `learner` does. The isolation test asserts this for `learner` and then claims the same property for tables it never checks                                                   |
| `docs/adr/0003`                                                                                  | "isolation is a property of the schema", "structural"                                                                                                 | True only in the sense that rows are stamped with `academyId`. The single `learner_session` table keyed on a global `token` is _behavioral_ isolation, which the ADR explicitly rejects as the alternative. Rejection works because the scoped client filters — the same "remember the filter" property the ADR argues against |
| `docs/adr/0003:91`                                                                               | "gated by a publishable key, an origin check, rate limiting, and optionally a captcha"                                                                | None of those is wired to the learner realm                                                                                                                                                                                                                                                                                    |
| `docs/adr/0010:36-37`                                                                            | Closed-source schema and migrations not published                                                                                                     | Both tracked under `apps/api/prisma/`                                                                                                                                                                                                                                                                                          |
| `README.md:19`                                                                                   | "Monorepo, licensing, governance, CI \| Done"                                                                                                         | CI's build job fails; see #4                                                                                                                                                                                                                                                                                                   |
| `SECURITY.md:10`                                                                                 | Email maintainers listed in `GOVERNANCE.md`                                                                                                           | `GOVERNANCE.md` lists no maintainers or emails                                                                                                                                                                                                                                                                                 |
| `CODE_OF_CONDUCT.md:40`                                                                          | `[INSERT CONTACT METHOD]`                                                                                                                             | Placeholder never filled                                                                                                                                                                                                                                                                                                       |
| `README.md:55`                                                                                   | "75 tests against a real Postgres"                                                                                                                    | 75 is exact, but only 26 touch Postgres; the other 49 are pure unit tests                                                                                                                                                                                                                                                      |
| `.github/ISSUE_TEMPLATE/config.yml:8`                                                            | GitHub Discussions link                                                                                                                               | Discussions must be enabled manually or the link 404s                                                                                                                                                                                                                                                                          |

**Below the top-level docs, `apps/docs/content/**` is the legacy product's
documentation** — `Project` tenants, `MANAGED`/`DELEGATED` auth modes,
`POST /v1/delegated/login`, "sign up at the main dashboard", plus links to
`/courses`, `/videos`, and `/api-reference` pages that do not exist, and a claim
that an empty `allowedOrigins` means `*` when the code 403s. It is indexed by
`/llms.txt`, so language models will read it as current. Either replace it or
mark it clearly.

Also worth a decision: `CONTRIBUTING.md:128-131` and `README.md` describe a
Playwright E2E suite and a mandatory coverage table as if they exist. The
coverage table is a good aspiration; presenting it as current is not.

---

## Things I would not change

- **`academy-prisma.ts` as the enforcement point, with the reasoning recorded.**
  The analysis of async-local storage is correct and the conclusion — enforce
  below Better Auth — is the right call. The module docstring is one of the best
  pieces of writing in the repo.
- **`SPIKE-FINDINGS.md`.** All three findings are real and non-obvious, and
  finding 2 (`additionalFields` required or `transformInput` drops the column) is
  exactly the kind of thing that costs an afternoon.
- **The authorization action table** (`actions.ts`). Explicit, reviewable,
  compile-time-checked, and the `SESSION_ONLY_ACTIONS` / `OWNER_ONLY_ACTIONS` /
  `INSTRUCTOR_ACTIONS` / `GRADER_ACTIONS` split is well-reasoned. The 21 tests
  are genuinely good.
- **The rate limiter.** Single atomic statement, correct under 20-way
  concurrency, identity hashed so the table holds no emails or IPs, and the
  `pruneRateLimits` job exists. The only nit is that `remaining: 0` on an allowed
  request reads oddly; the behaviour is right.
- **`packages/config/src/env.ts`.** Collects every problem at once, never throws
  at import, `loadIntegration` distinguishes "unconfigured" from "broken" — this
  is the strongest module in the repo. 28 tests.
- **`packages/contracts`.** The envelope, `ERROR_CODES`, integer minor units on
  `Money`, and the deliberate absence of a `lessonBody` in `lessonPreviewSchema`
  are all correct.
- **The `no-dev-deps-in-source` and `doNotFollow` comments in
  `.dependency-cruiser.cjs`.** The note about not adding `node_modules` to
  `exclude` is the kind of thing people get wrong.

---

## Smaller items

- `apps/learn/src/lib/fetch-api.ts:3-4` reads `LMS_API_URL` and
  `LMS_SECRET_API_KEY` with `!` at module scope and there is no
  `apps/learn/.env.example`. A clean clone builds `undefined` into every API URL.
  The new config package exists precisely to prevent this — the legacy apps
  should eventually route through it.
- `apps/studio` has no `.dockerignore` while `COPY . .` is used; a local
  `.env.local` would be baked into the published bundle.
- `apps/studio` depends on `xlsx@^0.18.5`, whose prototype-pollution and ReDoS
  CVEs are fixed only in versions not published to npm. Expect it to be the first
  `npm audit` finding.
- `apps/studio/src/.../upload-video.ts` ships ~30 `console.log('[SDK_DEBUG]…')`
  lines, including a `window.fetch` wrapper that logs every request's headers.
- `.agents/skills/**` and two `skills-lock.json` files are AI-agent tooling
  artifacts with no explanation in any document. Either document them or drop
  them; `apps/api/.agents/skills/openrouter-typescript-sdk/SKILL.md` is
  especially odd since the app does not depend on OpenRouter.
- `apps/learn` (React 19.2.3, Next 16.1.6), `apps/studio` (React 19.2.5, Next
  16.2.4) and `apps/docs` (Next 16.1.4) have divergent framework versions. The
  `better-auth`/`zod`/`typescript` catalog is a good pattern; frontend versions
  deserve the same treatment eventually.
- `apps/learn/package.json` lists `shadcn` (a CLI) as a runtime dependency.
- The learner realm has no `emailAndPassword.sendResetPassword`, so
  `forgetPassword` writes a token and delivers nothing. Fine for pre-alpha, worth
  a comment.
- `.github/CODEOWNERS` uses `@visheshgubrani`, inferred from the remote. Correct
  as far as I can tell, but it is still an inference.
- `apps/api/.env.example` is stale in ways that will bite: it documents
  `CORS_ORIGIN` while `cors.middleware.ts:34` reads `CLIENT_ORIGIN`, and it omits
  `ENCRYPTION_KEY`, without which `utils/encryption.ts` throws at import.

---

## Suggested order

1. Fix `can()` (#1) — everything in Milestone B is written against it.
2. Fix the two scoped-client contracts (#2), and decide the model-coverage
   boundary (#2 in "should fix").
3. Wire `consumeRateLimit` into the auth realms, or say plainly that Better Auth's
   limiter is what runs.
4. Add a seed script (#5) — this is the missing half of the exit criterion.
5. Make CI green (API build carve-out; DCO on the initial commit) and add a
   `docker build` job.
6. Fix the legacy XSS (#7) and the publishable-key authorization (#8) before the
   repository is announced anywhere.
7. Delete the closed-source identifiers and the leaked local paths (#9).
8. Correct the documents in the table above. The architecture is good; several of
   the documents describe a system that is one milestone ahead of the code, and
   that is the fastest way to lose a contributor's trust on day one.
9. Then start Milestone B.
