# 3. Two isolated authentication realms

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

The system has two populations with genuinely different requirements.

**Staff** are business users. One person may belong to several workspaces,
because consultants and agencies work across clients. Their identity is
global.

**Learners** belong to exactly one academy. Two academies may have a learner
with the same email address — the same human, or a different one, and we have no
way to know. Each academy's learners need their own password, their own recovery
flow, and their own session.

The previous system handled this by running two entirely separate auth
implementations: Better Auth for staff, and a hand-rolled JWT stack for learners
with a `ManagedUser` row holding a bcrypt password, a hashed refresh token, and
a shared `JWT_SECRET`. That worked, but it meant two session-revocation stories,
two sets of auth bugs to reason about, and a learner sign-up endpoint that
required a *secret* API key — which forced the student-facing application to hold
full tenant-admin credentials.

Three specific problems had to be solved:

1. Better Auth's `user` table has a globally unique email. Two academies cannot
   both register `learner@example.com` in one table.
2. Sessions are resolved by token, not by academy. In a single instance, a
   session lookup has no inherent academy scope, so isolation depends on every
   read path remembering to filter.
3. Equal emails must never merge a staff account with a learner account, or two
   learner accounts.

## Decision

Run **two `betterAuth()` instances**, one per realm, with entirely separate
tables and cookie namespaces.

| | Staff realm | Learner realm |
| --- | --- | --- |
| Base path | `/api/auth/staff` | `/api/auth/learners` |
| Tables | `staff_user`, `staff_account`, `staff_session`, `staff_verification` | `learner_user`, `learner_account`, `learner_session`, `learner_verification` |
| Scope | Spans workspaces | Carries `academyId` on every row, in every unique key |
| Cookie prefix | `docento-staff` | `docento-learner` |
| Organization plugin | Yes | No |

The staff instance uses Better Auth's organization plugin, mapped onto the
workspace and membership tables, for membership and invitations.

The learner instance is configured with `academyId` as an immutable part of its
context. That context is resolved from the **verified academy domain** on every
request and passed in; there is no mutable "current academy" stored anywhere.
Unknown hosts fail closed rather than falling back to a default academy.

## Why not one instance with a scoped adapter

This was the obvious first design and it was rejected deliberately.

Separate tables make cross-academy rejection **structural**: a learner session
issued by academy A is a row in academy A's table with academy A's academy id,
and a query in academy B's context cannot return it no matter how the filter is
written. Isolation is a property of the schema.

A single instance with a scoped adapter makes isolation **behavioral**: every
read and write path must remember to apply the scope, and one forgotten `where`
clause is a cross-tenant leak. It also puts the project's worst bug class behind
the correctness of a third-party adapter's query construction.

Structural isolation is worth the duplication of four tables.

## Consequences

**What this buys.**

- Independent credentials, recovery, and sessions per academy, with no shared
  email namespace.
- A learner session from one academy cannot be presented at another, including
  under concurrent requests.
- Staff and learner accounts can share an email with no merge risk.
- One auth implementation instead of two. The hand-rolled learner JWT stack is
  deleted entirely.
- Learner sign-up no longer needs a secret key. It is gated by a publishable
  key, an origin check, rate limiting, and optionally a captcha — which is what
  makes a multi-tenant student application safe to deploy.

**What this costs.**

- Four duplicated tables and two instances to configure, document, and migrate.
- Learner social login cannot use per-academy OAuth credentials without
  per-academy redirect URIs, which is unbounded across custom domains. The
  default is platform-level OAuth with academy-branded flows.
- Email deliverability is similarly constrained: one verified platform sender by
  default, with per-academy DKIM available as advanced configuration.
- Cross-academy learner accounts are impossible by construction. This is
  intentional — a discoverable learner marketplace would require global
  identity, and that is not a goal.

**Verification gate.** Because this is the highest-risk decision in the
architecture and depends on third-party adapter semantics, it is proven before
anything is built on top of it. The spike must demonstrate, with tests:

1. the same email registers independently in two academies;
2. passwords are independent;
3. verification and reset tokens are academy-scoped and non-replayable;
4. a session token from academy A is rejected on academy B, concurrently;
5. staff and learner identities with the same email do not interact;
6. absent academy context errors rather than widening;
7. every learner table carries `academyId` in its unique keys.

**Fallback.** If the two-instance approach cannot be made to work, the fallback
is one instance with a fully scoped adapter — but only if it passes the same
seven checks. Partial isolation is not acceptable, and Milestone B does not
start until one of the two passes.

**Verified against:** Better Auth 1.7.x. Core tables accept `modelName` for
table mapping and cookies accept `cookiePrefix`, so both mechanisms this depends
on are supported by the installed version rather than assumed.

**Outcome — spike passed.** All seven checks are green against a real Postgres
in `packages/domain/src/auth/__tests__/learner-isolation.test.ts`.

**Where enforcement lives.** The spike disproved the obvious approach. Wrapping
Better Auth's *adapter* is not reliable: on request paths Better Auth resolves
its adapter through async-local storage, and the instance it resolves is not the
one a wrapper replaces. Reads issued during sign-up therefore searched every
academy, and the email-uniqueness check rejected a legitimate second academy.

Enforcement is instead at the **database client**, below Better Auth, because
`prismaAdapter` accepts any Prisma client. The adapter wrapper and
`databaseHooks` remain as defence in depth. The reasoning, and the two
non-obvious details that make the scoping either work or silently do nothing, are
recorded in `packages/domain/src/auth/__tests__/SPIKE-FINDINGS.md`. Read that
before changing anything in the auth path.
