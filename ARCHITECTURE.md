# Architecture

How Docento is put together, and why. This document is the orientation layer;
the reasoning behind individual structural decisions lives in
[`docs/adr/`](./docs/adr/), which is the authoritative record.

If you are contributing, read this first and then
[CONTRIBUTING.md](./CONTRIBUTING.md).

---

## What Docento is

A self-hostable course business platform: authoring, a learner experience, and a
headless API, with AI assistance treated as a first-class part of authoring
rather than a bolted-on feature.

Three audiences, all first-class:

1. **Operators** who self-host and run their own academy on their own
   infrastructure.
2. **API consumers** who want their own frontend and only the backend.
3. **Learners**, who interact with an academy and never see the platform.

The commercial model is hosting, managed infrastructure, and support. There is
no proprietary edition — everything in this repository is the whole product.

---

## The core model

```
User (staff)                              Learner (per academy)
  │                                         │
  └─ Member ──► Workspace                   └─ Enrollment ──► Course
                  │                                            │
                  ├─ Academy ─────────────────────────────────┤
                  │    ├─ Course (draft + published releases) │
                  │    │    └─ Module ──► Lesson              │
                  │    │                   ├─ Quiz            │
                  │    │                   └─ Assignment      │
                  │    ├─ Offer ──► price, currency, terms   │
                  │    ├─ Order ──► payment history           │
                  │    └─ AccessGrant ──┬────────────────────►┘
                  │                     └─ why access is allowed
                  └─ Provider connections (AI, media, payments, email, keys)
```

**Workspace** is the tenant and isolation boundary: staff, roles, provider
connections, operational settings, and the future managed-service contract.

**Academy** is a student-facing property: brand, domains, learner namespace,
catalog, courses, offers, enrollments, and learning records. One workspace can
have several, which is what makes multi-brand operation possible without
duplicating learners or billing. See
[ADR 2](./docs/adr/0002-workspace-and-academy-tenancy.md).

**Course** belongs to exactly one academy. Moving content between academies is
an explicit copy that carries content and provenance, never learners, orders, or
progress. See [ADR 4](./docs/adr/0004-academy-owned-courses.md).

**Access is the union of live grants.** A purchase, an instructor's decision, a
coupon, and an organization seat are all grants, and revoking one does not
disturb the others. Enrollment records _learning_; a grant records
_permission_. See [ADR 9](./docs/adr/0009-commerce-separation.md).

---

## Repository layout

```
apps/
  api/       HTTP surface. Validates input, invokes a domain operation.
  worker/    Durable jobs, outbox delivery, provider reconciliation.
  studio/    Staff and creator application.
  learn/     Multi-tenant learner application.
  docs/      Documentation site.
packages/
  domain/         Business rules, authorization, transactions, Prisma schema.
  contracts/      Apache-2.0. Zod schemas; the public API's source of truth.
  sdk/            Apache-2.0. Typed client, generated from contracts.
  integrations/   AI, media, storage, payments, email, jobs.
  config/         Base configuration and validated environment.
docs/adr/     Architecture decision records.
```

### The rule that matters most

**Business rules live in `packages/domain` and nowhere else.**

Controllers validate and call a domain operation. Workers call the same domain
operation. Frontends call the API. No frontend talks to Prisma, and no
controller or worker re-implements a pricing, grading, enrollment, or
authorization rule. If a rule is needed in two places, it moves into `domain`.

This is not stylistic. The fastest way for a multi-tenant LMS to leak data is for
a second code path to forget a tenant filter that the first one applies.

### The rule that matters second

**An Apache-2.0 package must never import an AGPL-3.0 package.**

`packages/contracts` and `packages/sdk` are Apache-2.0 so they can be used in
proprietary software. Everything else is AGPL-3.0. Dependency direction is
one-way, and it is enforced by `pnpm boundaries` in CI rather than by review.
See [ADR 6](./docs/adr/0006-licensing-boundary.md).

---

## Request flow

```
Client
  │  HTTPS, host determines academy
  ▼
proxy ──► apps/api
            ├─ resolve academy from verified domain (fail closed if unknown)
            ├─ resolve principal (staff | learner | service key | anonymous)
            ├─ validate request with a Zod contract
            ├─ authorize via can(principal, action, resource)
            ├─ invoke a domain operation in packages/domain
            └─ enqueue any follow-up work on the same transaction
                                        │
                                        ▼
                                   apps/worker
                                        ├─ pg-boss job
                                        ├─ external effect (idempotent)
                                        └─ outbox delivery, with history
```

Two properties are load-bearing:

- **Academy context comes from a verified domain, never from a request body,
  query parameter, or header.** An unknown host fails closed rather than
  defaulting.
- **Jobs are enqueued inside the transaction that caused them** — the target. As
  of today `JobQueue.enqueue()` takes no transaction client, so the commit and
  the enqueue are separate and a crash between them loses the job. Wiring
  pg-boss's ORM transaction adapters is tracked follow-up work; the gap is noted
  in `packages/integrations/src/jobs/index.ts` so it is visible at the call site
  rather than only here.

---

## Authentication: two isolated realms

There are two populations and their requirements genuinely differ. Staff belong
to workspaces and may belong to several. Learners belong to exactly one academy,
and two academies may have learners with the same email address.

These are served by **two Better Auth instances with separate tables and separate
cookie namespaces**:

|               | Staff             | Learner                                         |
| ------------- | ----------------- | ----------------------------------------------- |
| Base path     | `/api/auth/staff` | `/api/auth/learners`                            |
| Tables        | `staff_*`         | `learner_*`                                     |
| Scope         | Spans workspaces  | Carries `academyId` in every row and unique key |
| Cookie prefix | `docento-staff`   | `docento-learner`                               |

Isolation is **structural** — a learner session from one academy is a row in
that academy's table, and a query in another academy's context cannot return it
regardless of how the filter is written. The alternative, one instance with a
scoped adapter, makes isolation _behavioral_: every read path must remember to
filter, and one forgotten `where` clause is a cross-tenant leak.

Equality of email never merges a staff identity with a learner identity, or two
learners. See [ADR 3](./docs/adr/0003-two-authentication-realms.md).

---

## Authorization

One function: `can(principal, action, resource)` in `packages/domain`. Every
controller, worker, export, and bulk operation calls it. There are no ad-hoc
route-level permission checks.

Principals are discriminated: **staff**, **learner**, **service key**, or
**anonymous**.

| Interface                        | Required to be                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| Workspace and academy management | A staff permission, or an explicitly scoped service key                |
| Public catalog                   | Public published data only                                             |
| Learner operations               | An academy-bound learner session, or a delegated credential            |
| AI jobs and events               | An authorized actor **plus** access to the job's academy and resources |
| Provider callbacks               | Verified with the connection's own signature                           |

Three rules that are easy to get wrong:

1. **A service key never impersonates its creator or the workspace owner.** It
   carries scopes. Nothing about a key implies a user identity, and billing,
   key administration, and destructive workspace deletion require a real staff
   session rather than a key.
2. **Publishable keys are public.** They identify an academy in a browser. They
   do not authenticate learners, do not grant paid-content access, and do not
   substitute for authorization.
3. **Origin checks are browser protections, not authentication.** They reduce
   casual cross-site abuse. They are not proof of identity and are never treated
   as such.

Staff membership is at the workspace level. Per-academy and per-course grants —
"this instructor may grade these two courses" — are a separate assignment layer,
because organization roles cannot express them.

---

## Public API

A single versioned surface at `/api/v1`, with authentication endpoints under
`/api/auth/*`.

The API is described by **Zod schemas in `packages/contracts`**, which are the
single source of truth. The OpenAPI document and the SDK are both generated from
them, so a change to a contract cannot leave the documentation or the client
behind.

Conventions:

- stable, machine-readable error codes;
- a request id on every response, matching the logs;
- cursor pagination on collections;
- optimistic concurrency for editing, with an explicit conflict response;
- idempotency keys for checkout, refunds, and other retryable mutations.

---

## Content: drafts and published releases

Authors edit a **draft**. Publishing promotes it to an **immutable release**.
Autosave, AI generation, and reordering never touch live content, and publishing
is atomic.

Lesson identities are stable across releases, so progress stays attached to the
right content. Quiz definitions and grading rules are snapshotted when an
attempt starts, so a published edit can never rewrite an attempt already in
progress.

For learners following updates:

- completed lessons stay completed;
- removed lessons leave the completion denominator but not the historical record;
- unmaterialized rules do not silently revoke purchased access — unpublishing
  stops discovery, it does not expire enrollments;
- issued certificates remain valid and verifiable.

Completion is computed server-side. Client playback reports indicate progress;
they are not proof of attendance. See
[ADR 5](./docs/adr/0005-immutable-published-releases.md).

---

## AI

Two supported flows at launch, both complete:

1. **Authoring** — brief or source material → outline → human edits → draft
   lessons and quizzes → review → publish.
2. **Learning** — a lesson and course tutor that cites the material it used and
   can explain more simply.

Providers are **OpenAI-compatible** endpoints and **Anthropic**. Capabilities are
recorded per configured model, because an OpenAI-compatible endpoint is not
necessarily compatible in structured output, tools, vision, or usage reporting.

Everything else about the AI layer follows from three constraints:

- **Review before publish.** Invalid generations fail visibly and never
  partially publish content.
- **Durable, not held open.** Generation is a resumable job with stored step
  results, not a long-lived HTTP request.
- **Optional and bounded.** No AI feature errors when unconfigured. There are
  workspace budgets, per-user rate limits, per-job output limits, and a
  per-academy kill switch.

Retrieval uses Postgres full-text search, filtered by academy, enrollment,
published release, and learner visibility **before** context is assembled. Quiz
answer keys and private grading material are never included. A local-only
configuration never silently sends content to an external service, and custom
endpoints are subject to an explicit egress policy.

---

## Media

Storage, processing, and playback are separate capabilities behind one provider
interface. The default install uses local filesystem storage with
browser-native playback and needs no external account.

Providers — local, S3-compatible, OpenVOD, and managed video services — are
optional adapters. **Provider selection is per asset**, not per workspace:
changing a workspace default affects new uploads and never rewrites how existing
media is served.

Playback URLs are resolved server-side and are short-lived, and access is checked
at play time against enrollment rather than at render time. See
[ADR 8](./docs/adr/0008-local-first-media.md).

OpenVOD is deployed independently and reached over its API. Its Cloudflare and
Modal requirements are OpenVOD's, not Docento's, and are never part of a basic
install.

---

## Reliability

Background work runs on **pg-boss**, backed by the same Postgres instance, so a
self-hosted install needs exactly one stateful service.

External effects are treated as **retryable delivery with idempotent effects**,
never as exactly-once execution. Exactly-once across a network boundary is not
achievable, and pretending otherwise produces duplicate side effects that are
worse than honest at-least-once with idempotency keys.

- Outbound webhooks go through a transactional outbox with per-endpoint filters,
  signing-secret rotation, delivery history, and explicit replay.
- Inbound provider callbacks are deduplicated on `(connection, event id)` and
  applied transactionally, with scheduled reconciliation for events that arrive
  late or out of order.
- Retries are bounded with backoff. Terminal failures are inspectable.

See [ADR 7](./docs/adr/0007-durable-jobs-on-postgres.md).

---

## Deployment

Today the repository ships **one** container definition: `postgres`, in
`docker-compose.yml` at the repository root. That is the whole required stack,
and it is deliberate — the difference between one dependency and two is the
difference between a five-minute install and an afternoon of YAML.

Running the applications in containers is the target, not the current state:

| Component                  | Today                                                    | Target                                                         |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| Postgres                   | `docker compose up -d`                                   | unchanged                                                      |
| API, worker, Studio, Learn | `pnpm dev` against that Postgres                         | an `app` compose profile, built from one workspace-aware image |
| Uploads                    | `LOCAL_STORAGE_DIR` on the host, default `.data/uploads` | a shared volume when API and worker run as separate containers |

**Deployment invariant:** when the API and worker run as separate containers
with local storage, both must mount the same uploads volume. The failure mode is
a worker that silently cannot find files, so the compose file must demonstrate
the wiring rather than leaving it to the documentation.

Optional: Redis, object storage, external AI providers, and OpenVOD. None is
required for a working install.

Configuration is validated at startup with a clear failure message. An unused
provider never crashes the process at import time.

---

## Where to go next

| To understand                | Read                                 |
| ---------------------------- | ------------------------------------ |
| Why a decision was made      | [`docs/adr/`](./docs/adr/)           |
| How to contribute            | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| What is being built and when | [ROADMAP.md](./ROADMAP.md)           |
| How decisions get made       | [GOVERNANCE.md](./GOVERNANCE.md)     |
| Reporting a vulnerability    | [SECURITY.md](./SECURITY.md)         |

If something in this document is wrong or misleading, that is a bug. Open an
issue or a pull request against it.
