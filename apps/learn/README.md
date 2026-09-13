# @docento/learn

The learner application: the surface a student of an academy actually uses —
catalogue, enrolment, the lesson player, quizzes, assignments and certificates.

It is a **multi-tenant** application in the sense that one deployment serves any
number of academies, but a single visitor is only ever in one. The academy comes
from the request host, resolved against `AcademyDomain` on the server, and every
API call is made with that context already attached. Nothing in a page, a form,
or a cookie can change which academy a request belongs to.

## What it talks to

Only the public HTTP API (`apps/api`), through `@docento/sdk`. It never imports
`packages/domain` and never touches the database — a frontend that can query
Prisma is a second code path that can forget a tenant filter.

Authentication is the **learner realm** of Better Auth, mounted at
`/api/auth/learners`. It is a different realm from the staff one used by
`apps/studio`: different tables, different cookie prefix, and equal email
addresses deliberately never merge across realms. See
[ADR 3](../../docs/adr/0003-two-authentication-realms.md).

## Running it

```bash
pnpm install
docker compose up -d        # Postgres
pnpm db:migrate
pnpm db:seed                # demo academy + owner account
pnpm --filter @docento/learn dev
```

Configuration comes from the validated environment in `packages/config`; a
missing or malformed value fails at startup with a report listing every problem
at once, rather than producing `undefined` in a URL.

## Tests

```bash
pnpm --filter @docento/learn test
```

Tests run against a real Postgres where they touch the database, because the
guarantees being checked are database properties. The HTML sanitizer and the
lesson renderer have direct unit tests, since they are the two places
author-supplied content reaches the DOM.
