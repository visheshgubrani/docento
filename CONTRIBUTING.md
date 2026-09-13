# Contributing to Docento

Thanks for taking the time to contribute. This document covers what you need to
know to get a change merged. For the architecture you are contributing to, read
[ARCHITECTURE.md](./ARCHITECTURE.md) first.

## Before you start

- **Bugs and small fixes** — open a pull request directly.
- **Features and anything that changes the data model, the public API, or the
  authorization model** — open an issue first. These need agreement on the
  approach before code, because they are expensive to reverse.
- **Security issues** — do not open a public issue. Follow [SECURITY.md](./SECURITY.md).

## Developer Certificate of Origin

Every commit must be signed off. This is how the project records that you have
the right to submit your contribution under the project's license, and it
replaces a Contributor License Agreement.

Sign off with `git commit -s`, which appends a line to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

The name and email must be real and must match your commit author. By signing
off you agree to the [Developer Certificate of Origin](https://developercertificate.org/):

> By making a contribution to this project, I certify that:
>
> (a) The contribution was created in whole or in part by me and I have the
> right to submit it under the open source license indicated in the file; or
>
> (b) The contribution is based upon previous work that, to the best of my
> knowledge, is covered under an appropriate open source license and I have the
> right under that license to submit that work with modifications, whether
> created in whole or in part by me, under the same open source license (unless
> I am permitted to submit under a different license), as indicated in the file;
> or
>
> (c) The contribution was provided directly to me by some other person who
> certified (a), (b) or (c) and I have not modified it.
>
> (d) I understand and agree that this project and the contribution are public
> and that a record of the contribution (including all personal information I
> submit with it, including my sign-off) is maintained indefinitely and may be
> redistributed consistent with this project or the open source license(s)
> involved.

Rewriting history to add missing sign-offs is fine on a branch you own. Run the
check locally before pushing:

```bash
./scripts/check-dco.sh
```

## Licensing

Docento is **not** uniformly licensed. Which license applies depends on the
directory, and this is deliberate: the SDK and its contracts are meant to be
usable by anyone, including in proprietary products.

| Path | License |
| --- | --- |
| `apps/*` | AGPL-3.0-only |
| `packages/domain` | AGPL-3.0-only |
| `packages/integrations` | AGPL-3.0-only |
| `packages/ui` | AGPL-3.0-only |
| `packages/config` | AGPL-3.0-only |
| `packages/contracts` | Apache-2.0 |
| `packages/sdk` | Apache-2.0 |

**Enforced invariant: an Apache-2.0 package must never import an AGPL-3.0
package.** Dependency direction is one-way — `packages/contracts` is imported
*by* `packages/sdk` and by the applications, never the reverse. Otherwise the
Apache-2.0 packages would inherit AGPL obligations and stop being usable by the
people they exist for.

This rule is checked in CI:

```bash
pnpm boundaries
```

If you add an import that crosses the boundary in the wrong direction, CI fails
and the fix is almost always to move the shared code down into
`packages/contracts` rather than to relax the rule.

If you are contributing a new top-level package, state its license explicitly in
its `package.json` and add a `LICENSE` file to the package directory.

## Getting set up

Docento targets Node 22 or newer and uses **pnpm exclusively**. Other lockfiles
are gitignored and must not be committed — two install paths resolving to
different versions is a class of bug nobody enjoys.

```bash
git clone https://github.com/<owner>/docento.git
cd docento
pnpm install
```

Start the local stack. Postgres is the only required service:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

A full walkthrough, including the first-run setup that creates your owner
account and first academy, is in the [self-hosting docs](./apps/docs).

## Repository layout

```
apps/       api, worker, studio, learn, docs — runnable applications
packages/   domain, contracts, sdk, integrations, ui, config — libraries
docs/adr/   architecture decision records
docker/     compose files
```

Where a change belongs:

- **Business rules** (pricing, grading, enrollment, authorization) go in
  `packages/domain`. Not in a controller, not in a worker, not in a frontend.
- **Request validation and HTTP concerns** go in `apps/api`. Controllers
  validate input and invoke a domain operation — nothing more.
- **Background work** goes in `apps/worker`, invoking the same domain
  operations the API does.
- **Anything a frontend needs to know about the API shape** belongs in
  `packages/contracts`, which is the single source of truth for the public API
  and the generated OpenAPI document.
- **Never** let a frontend talk to Prisma, or reimplement an enrollment,
  grading, or payment rule. If a rule is needed on both sides, it moves to the
  API.

## Conventions

- **TypeScript everywhere.** No new JavaScript source files.
- **2-space indentation.** Run `pnpm format` before pushing.
- **Naming:** `PascalCase` for components, classes, and exported types;
  `camelCase` for functions and variables; `kebab-case` for route, utility, and
  feature filenames.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`. One concern per
  commit.
- **Absolute imports** (`@/…`) inside applications.
- **Validation** at the boundary with Zod. The schema is the type — do not
  hand-write a parallel TypeScript interface.

## Tests

Automated coverage is a release requirement, not an optional extra. Add tests
with your change, in the package that owns the behavior:

```bash
pnpm test                                  # everything
pnpm --filter @docento/domain test         # one package
pnpm test:e2e                              # Playwright flows
```

What must be covered when you touch it:

| You changed | Required test |
| --- | --- |
| Authorization or tenancy | Cross-tenant access attempts must fail. A positive test alone is not enough. |
| Money, checkout, or refunds | Idempotency: the same request twice produces one business effect. |
| Provider callbacks or webhooks | Duplicate and out-of-order delivery. |
| Quizzes or grading | Attempt limits, and that answer keys never leave the server. |
| The data model | A migration that applies cleanly to an empty database. |

## Pull requests

A good pull request here:

- explains **why**, not just what — link the issue;
- stays focused on one concern;
- lists the commands you ran;
- includes screenshots or a short recording for UI changes, on both mobile and
  desktop;
- calls out anything you deliberately did not do.

Reviewers will check that tenant isolation, authorization, and licensing
boundaries are intact before anything else. A change that is correct but
loosens one of those will be sent back.

## Accessibility

Learner and authoring flows target WCAG 2.2 AA. If your change adds or alters a
flow, it needs to work with a keyboard alone and behave correctly with a screen
reader. Accessibility regressions are treated as bugs, not polish.

## Getting help

Open a discussion or an issue. Questions about the architecture are welcome —
if something in [ARCHITECTURE.md](./ARCHITECTURE.md) is unclear, that is a
documentation bug and we would like to fix it.
