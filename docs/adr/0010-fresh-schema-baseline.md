# 10. Fresh schema baseline, no legacy compatibility

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

Docento is derived from a closed-source LMS. The existing implementation contains
roughly eleven thousand lines of working business logic — commerce, quiz
grading, certificate issuance, checkout, enrollment — that represents real
solved problems. It also contains a data model carrying thirteen migrations of
accumulated decisions, several of which the architecture decisions in this
directory now contradict:

- a single `Project` entity where the model now needs a workspace and an
  academy ([ADR 2](./0002-workspace-and-academy-tenancy.md));
- one Better Auth instance plus a hand-rolled learner JWT stack, where the model
  now needs two isolated realms
  ([ADR 3](./0003-two-authentication-realms.md));
- globally unique course slugs, a `Float` price, a default currency, and unique
  `(parent, order)` constraints that turn every reorder into constraint
  juggling;
- course content that is directly mutable, with no draft/release distinction
  ([ADR 5](./0005-immutable-published-releases.md));
- provider configuration smeared across columns on the tenant.

Two facts make the choice straightforward. The OSS repository had not yet been
published, and the closed-source deployment runs a different database entirely —
so there are no existing OSS installations to migrate, no OSS upgrade path to
preserve, and no users whose data would need a transformation. The compatibility
problem that normally makes a rewrite irresponsible does not exist here.

## Decision

The OSS repository starts with a **new schema and a single initial migration**,
under `packages/domain/prisma/migrations`. The closed-source schema is not
carried forward into it.

**The legacy migrations are still in the tree**, under
`apps/api/prisma/migrations`. That is not an oversight: the legacy application
still runs on its own schema and needs its history to start. They are deleted,
along with `apps/api/prisma`, when the port completes in Milestone B. Until then
the repository contains two Prisma schemas, which is why `apps/api` generates its
client to a separate output path.

What is reused is **implementation logic, not data or interfaces**. The
working commerce, grading, certificate, and enrollment logic is ported into the
new `packages/domain` module and adapted to the new model. Behavior that is
currently correct should come out of the port still correct — but it is reviewed
and re-tested against the new invariants rather than assumed to transfer.

The public API surface is new. There is no compatibility layer, no versioned
shim, and no obligation to match the closed-source API's shapes. The opportunity
is taken to fix the structural problems that were cheap to fix once:

| Previously                                                         | Now                                                                                                                                 |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Simple integer positions with unique `(parent, order)` constraints | Integer positions with transactional reorder plus a revision check, so concurrent edits conflict loudly instead of corrupting order |
| `Course.slug` globally unique                                      | Unique per academy                                                                                                                  |
| `Float` price, `Int` amounts with a default currency               | Integer minor units on an `Offer` ([ADR 9](./0009-commerce-separation.md))                                                          |
| Loose `videoUrl` / `videoId` / `videoStatus` columns on the lesson | A `VideoAsset` row recording the provider that produced it ([ADR 8](./0008-local-first-media.md))                                   |
| OpenAPI hand-written as JSDoc comments across route files          | Generated from Zod contracts, which are the single source of truth                                                                  |
| Fire-and-forget webhook delivery with no record                    | Transactional outbox with delivery history and replay ([ADR 7](./0007-durable-jobs-on-postgres.md))                                 |

## Consequences

**What this buys.**

- The data model matches the architecture, with no compatibility residue forcing
  awkward compromises in a brand-new codebase.
- Six years of accumulated migration history does not become permanent
  archaeology in a repository that has not shipped yet.
- The porting work is a review pass with new tests, which finds real bugs in the
  transferred logic — several were found this way while scoping the work.

**What this costs.**

- **The existing implementation cannot be copied wholesale.** Anything ported
  must be read, understood, and adapted. This is slower than moving files and it
  is the main cost of this decision.
- Working behavior can regress by omission during the port. Assessment
  capability is the specific risk: quiz sections, negative marking, per-question
  negative points, partial marking, mock-test time windows, and attempt limits
  all exist and work today
  ([ADR 5](./0005-immutable-published-releases.md) covers the snapshot rule).
  They are launch scope, and the acceptance suite must cover them, because
  dropping a working feature during a rewrite is the fastest way to lose user
  trust.
- The closed-source deployment and the OSS project diverge permanently. Fixes on
  one side do not flow to the other automatically, and that is a deliberate,
  accepted outcome rather than something to reconcile later.

**Explicitly rejected.** A compatibility-first approach with the closed-source
schema as the baseline and incremental migrations toward the new model. It
would have preserved a migration path nobody needs, at the cost of carrying
every constraint this ADR removes into a repository with no users yet.
