# Docento

**A self-hostable, AI-native course business platform** — authoring, a learner
experience, and a headless API — built in TypeScript.

The commercial model is hosting, managed infrastructure, and support. There is no
proprietary edition: everything in this repository is the whole product.

---

## Status: pre-alpha

Be aware of what you are cloning. **The foundation is complete and verified; the
product is being built on top of it.**

|                                                                      | State            |
| -------------------------------------------------------------------- | ---------------- |
| Monorepo, licensing, governance, CI                                  | Done             |
| Database schema, authentication, authorization, jobs, rate limiting  | Done, with tests |
| The application itself (authoring, publishing, learning, assessment) | **In progress**  |

Milestone A — the foundation — is complete and verified. Milestone B is the
product: authoring a course, publishing it as an immutable release, and a learner
enrolling, learning, being assessed and earning a verifiable certificate. While
that work is in flight, `apps/api` is still the previous closed-source Express
application on its own Prisma schema, and both it and its replacement are
temporary residents.

What you _can_ do right now is real: install, migrate the database, **seed a
working workspace, academy and owner account**, run the worker, and run the test
suite. See [ROADMAP.md](./ROADMAP.md) for what is next and how far along it is.

If you want a working LMS today, this is not it yet. If you want to help build
one, the foundation is a good place to start.

---

## Quickstart

Requirements: **Node 22+**, **pnpm 11+**, and **Docker** (or your own Postgres).

```bash
git clone https://github.com/visheshgubrani/docento.git
cd docento
pnpm install

# Postgres is the only required service.
docker compose up -d

# Create your local environment, then generate the secrets it needs.
cp packages/domain/.env.example packages/domain/.env   # then fill in the values
openssl rand -base64 48   # STAFF_AUTH_SECRET
openssl rand -base64 48   # LEARNER_AUTH_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY

pnpm db:migrate   # apply the schema
pnpm db:seed      # workspace, academy and owner account
pnpm test         # against a real Postgres
pnpm boundaries   # architecture rules
pnpm dev          # start the API, worker, and frontends
```

Nothing else is required. No Redis, no object storage, no paid API key. That is a
deliberate constraint rather than an accident — the difference between one
dependency and two is the difference between a five-minute install and an
afternoon of YAML.

---

## What Docento is trying to be

Three audiences, all first-class:

1. **Operators** who self-host and run an academy on their own infrastructure.
2. **API consumers** who want their own frontend and only the backend.
3. **Learners**, who interact with an academy and never see the platform.

Four decisions shape everything else, and each has a written record of _why_ in
[`docs/adr/`](./docs/adr/):

- **A workspace contains academies.** One business, several brands, without
  duplicating learners, keys, or billing.
  [ADR 2](./docs/adr/0002-workspace-and-academy-tenancy.md)
- **Staff and learners are separate authentication realms with separate tables.**
  A learner account belongs to exactly one academy, so two academies can hold the
  same email address with independent credentials — and isolation is a property
  of the schema rather than of remembering to add a filter.
  [ADR 3](./docs/adr/0003-two-authentication-realms.md)
- **Published releases are immutable.** Authors edit a draft; learners follow a
  release. A published quiz change cannot rewrite an attempt already in progress.
  [ADR 5](./docs/adr/0005-immutable-published-releases.md)
- **Permission and learning are separate.** Access is the union of live grants;
  enrollment records learning. A refund revokes one grant and never erases
  someone's progress. [ADR 9](./docs/adr/0009-commerce-separation.md)

[ARCHITECTURE.md](./ARCHITECTURE.md) is the full picture.

---

## Repository layout

```
apps/
  api/           HTTP surface (being rebuilt on packages/domain)
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

**Two rules matter more than the rest, and CI enforces both:**

- Business rules live in `packages/domain` and nowhere else. No frontend talks to
  Prisma; no controller re-implements a pricing or authorization rule.
  `pnpm boundaries` fails the build otherwise.
- An Apache-2.0 package must never import an AGPL-3.0 package. Dependency
  direction is one-way, or the permissive licence on the SDK becomes a lie.

---

## Licensing

Docento is not uniformly licensed, and that is deliberate.

| Path                                                                    | License       |
| ----------------------------------------------------------------------- | ------------- |
| `apps/*`, `packages/domain`, `packages/integrations`, `packages/config` | AGPL-3.0-only |
| `packages/contracts`, `packages/sdk`                                    | Apache-2.0    |

The application is AGPL so that anyone offering Docento as a network service
must publish their modifications. The SDK and its contracts are Apache-2.0 so
they can be used in proprietary software, including by companies that could not
otherwise adopt the project.

Because contributions are accepted under the
[Developer Certificate of Origin](https://developercertificate.org/) and **not** a
CLA, the project cannot be relicensed to a proprietary licence later. That is a
deliberate, permanent commitment — see [GOVERNANCE.md](./GOVERNANCE.md).

---

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) first. The short version:

- Commits must be signed off (`git commit -s`).
- Open an issue before writing code for anything that changes the data model,
  the public API, or the authorization model.
- Add tests with your change. Authorization and tenancy changes need a test that
  proves the _denial_ case, not only the permitted one.

Security issues: please follow [SECURITY.md](./SECURITY.md) and report privately.

---

## Documentation

| To understand                  | Read                                 |
| ------------------------------ | ------------------------------------ |
| How the system is put together | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Why a decision was made        | [`docs/adr/`](./docs/adr/)           |
| What is being built and when   | [ROADMAP.md](./ROADMAP.md)           |
| How decisions get made         | [GOVERNANCE.md](./GOVERNANCE.md)     |
| Contributing                   | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Reporting a vulnerability      | [SECURITY.md](./SECURITY.md)         |
