# 2. Workspaces contain academies

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

The previous system had a single entity, `Project`, that was simultaneously:

- the tenant and isolation boundary,
- the billing subject,
- the holder of one publishable key,
- the holder of one authentication mode (`MANAGED` or `DELEGATED`),
- the holder of one custom domain,
- the holder of one branding configuration.

The consequence was structural: one project could only ever be one
student-facing site. An operator who wanted to sell the same catalogue under two
brands, or run a main academy and a certification academy, had to create two
projects — which meant two sets of end users, two sets of API keys, two billing
relationships, and no shared team or content.

Those are not the same concern. "Who owns this and pays for it" and "what does a
student see at this domain" change for different reasons, at different times,
and are managed by different people in a large organisation.

## Decision

Split the concept into two levels.

**Workspace** — the tenant. Owns staff membership and roles, provider
connections (AI, storage, payments, email), operational settings, publishable
system configuration, and — later — the managed-service contract. This is the
isolation boundary and the billing subject.

**Academy** — a student-facing property inside a workspace. Owns brand,
domains, the learner identity namespace, the catalog, offers, courses,
enrollments, and learning records.

A workspace contains one or more academies. Creating a workspace creates one
academy by default, so the common case stays a single step and the two-level
model costs nothing for the operator who never needs more than one.

Staff membership is at the workspace level. Per-academy and per-course grants
are a separate assignment layer, because organization roles cannot express
"this instructor may grade these two courses" — see
[ADR 4](./0004-academy-owned-courses.md) for the course-level consequences.

## Consequences

**What this buys.**

- Multi-brand operation without duplicating learners, keys, or billing.
- Billing attaches to the tenant, not to a person, which is what a business
  customer expects.
- Learner identity is naturally academy-scoped, which is the prerequisite for
  the isolation model in [ADR 3](./0003-two-authentication-realms.md).
- Provider connections can be shared across academies (one payment account for
  the business) while still allowing a per-academy override.

**What this costs.**

- One more join everywhere. Every tenant-owned resource needs both identifiers
  where it previously needed one, and every query must filter on the right one.
  Getting this wrong is a cross-tenant leak, which is the most severe bug class
  in the system.
- Two concepts to explain, in the docs, the UI, and the API.
- A migration-free fresh start makes this cheap now. It would have been close to
  impossible later without breaking every URL and every API key.

**Deliberate limit.** Courses are *not* shared between academies. That is a
separate decision with its own trade-offs — see
[ADR 4](./0004-academy-owned-courses.md).
