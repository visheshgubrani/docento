# @docento/studio

The staff and creator application: where someone signs in, creates a workspace
and an academy, authors a course, and publishes it.

## The tenancy model

Two levels, and they mean different things:

- A **workspace** is the tenant and the isolation boundary. Staff belong to a
  workspace and may belong to several; provider connections, service keys and
  members live here.
- An **academy** is a student-facing property inside a workspace. One workspace
  can run several without duplicating learners or staff. Courses belong to an
  academy. See [ADR 2](../../docs/adr/0002-workspace-and-academy-tenancy.md).

Routes carry both: `/w/[workspaceSlug]/a/[academySlug]/…`. The workspace in the
URL is checked against the session, never trusted.

## Authoring and publishing

Authors edit a **draft**. Publishing promotes it to an **immutable release**, so
a learner following a course never sees a half-finished edit, and a quiz already
in progress is never regraded by a later change. See
[ADR 5](../../docs/adr/0005-immutable-published-releases.md).

## What it is built from

`@docento/ui` — the shared design system: semantic tokens, the typefaces, and the
primitives. This application no longer carries its own copies of any of them, and
`src/app/globals.css` is three imports plus a single override (its headings use the
interface face rather than the editorial serif the marketing site sets them in).

The consequence worth knowing when editing CSS: a class is generated from the
sources Tailwind is told about, and the design system declares its own — so a
utility used only inside a primitive still exists here. That is why
`@docento/ui/styles/base.css` has `@source` lines in it.

`apps/learn` has not been migrated yet and still carries its own set.

## What it talks to

Only the public HTTP API (`apps/api`), through `@docento/sdk` — the same surface
a third party would use. That is deliberate: an API the maintainers do not use
is an API that quietly rots. It never imports `packages/domain` and never
touches the database.

Authentication is the **staff realm** of Better Auth at `/api/auth/staff`,
separate from the learner realm in `apps/learn`.

## Running it

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed                # prints the owner email and password
pnpm --filter @docento/studio dev
```
