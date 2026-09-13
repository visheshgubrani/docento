# 1. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

Docento is a rewrite of a closed-source LMS. The new repository is a fresh start
with a new database and no compatibility obligation to the previous system, which
means almost every structural question is open at once: tenancy, identity,
licensing, publishing semantics, provider boundaries.

Decisions at that level are expensive to reverse. Enrolling learners, holding
payment history, and shipping a public API all create commitments. If the
reasoning behind them lives only in a chat thread or a pull request, the next
person relitigates it from scratch — usually after building something
incompatible.

## Decision

Architecture decisions are recorded as numbered ADRs in `docs/adr/`, using the
pattern from Michael Nygard's original proposal:

- one decision per file, numbered sequentially, never renumbered;
- a short, immutable document — context, decision, consequences;
- **superseded, never edited.** When a decision changes, a new ADR supersedes the
  old one and both remain readable.

An ADR is required for a change to: the tenancy or identity model, the public
API surface, the authorization model, the licensing boundary, the data model's
core entities, or the dependency policy.

An ADR is _not_ required for a feature, a refactor, or an implementation detail,
even a large one. The bar is "would reversing this be expensive, and would a
new contributor plausibly question it?"

## Consequences

**What this buys.** The project has a memory. A contributor can read the ADR set
in an hour and understand not just how the system is shaped but what it traded
away. Reversals are cheap to argue about because the original reasoning is on the
record.

**What this costs.** Writing an ADR before implementing is friction, and the
format invites overuse. There is a real risk of ADRs that restate the obvious.
The bar above is deliberately high: if the consequence is "we would just change
it," it does not need an ADR.

**Index of accepted decisions:**

| #                                            | Decision                                             |
| -------------------------------------------- | ---------------------------------------------------- |
| [2](./0002-workspace-and-academy-tenancy.md) | Workspaces contain academies                         |
| [3](./0003-two-authentication-realms.md)     | Two isolated authentication realms                   |
| [4](./0004-academy-owned-courses.md)         | Courses belong to one academy; copying is explicit   |
| [5](./0005-immutable-published-releases.md)  | Published releases are immutable                     |
| [6](./0006-licensing-boundary.md)            | AGPL-3.0 application, Apache-2.0 SDK                 |
| [7](./0007-durable-jobs-on-postgres.md)      | Durable jobs on Postgres via pg-boss                 |
| [8](./0008-local-first-media.md)             | Local storage first, providers are pluggable         |
| [9](./0009-commerce-separation.md)           | Offers, orders, grants, and enrollments are separate |
| [10](./0010-fresh-schema-baseline.md)        | Fresh schema baseline, no legacy compatibility       |
