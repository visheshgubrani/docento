# Roadmap

What is being built, in what order, and what is deliberately not being built
yet. For the architecture behind this, read [ARCHITECTURE.md](./ARCHITECTURE.md).

## The shape of the product

A complete, self-hostable course business platform: AI-assisted authoring, a
polished learner application, and a headless API for people who want to build
their own frontend.

The commercial model is hosting, managed infrastructure, and support — not a
feature-gated edition. **Everything in this repository is the whole product.**

## Where we are

Milestone A is complete. Milestone B is in progress: the domain layer, the
contracts, the generated OpenAPI document, the SDK and the HTTP surface are
done and tested. The two frontends have not been rebuilt onto them yet, and the
storage, email and container work is outstanding. See below for what each
milestone covers and how far along it is.

## Milestones

Each milestone has an exit condition. It is not done until the condition is met,
not until the code is merged.

### A. Prove the foundation

The scaffolding everything else depends on.

- Two isolated authentication realms (staff and learner) with proven isolation
- One authorization check path (`can(principal, action, resource)`)
- Shared rate limiting that works behind more than one replica
- Monorepo boundaries with the license-import rule enforced in CI
- Fresh database baseline, single package manager
- Configuration that fails fast and explains itself
- Compose onboarding that works with Postgres alone

**Exit:** a new contributor can clone, read `CONTRIBUTING.md`, run one command,
and get a working install — and CI enforces the boundaries that keep it that way.

### B. Complete free learning

The core loop, end to end, with no payments and no external services.

- A staff member creates a workspace and an academy
- Authors a course with modules and lessons
- Publishes it as an immutable release
- A learner registers, browses the catalog, and enrolls
- Completes lessons, takes quizzes (including sections, negative marking, and
  time windows), submits assignments
- Earns a certificate that can be publicly verified

**Exit:** the whole loop runs in CI with only Postgres running.

**Debt this milestone clears.** Three carve-outs exist so the workspace gate can
be green while the legacy application is still in place. All three are removed
when the port completes, and none of them applies to new code:

| Carve-out                                       | Where                                                           | Removed when                                                        |
| ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/api` excluded from lint and typecheck     | `apps/api/package.json` (`lint:legacy`, `typecheck:legacy`)     | The app runs on `packages/domain` rather than its own Prisma schema |
| `apps/api` exempt from the Prisma-boundary rule | `.dependency-cruiser.cjs`                                       | Same                                                                |
| React Compiler rules downgraded to warnings     | `apps/studio/eslint.config.mjs`, `apps/learn/eslint.config.mjs` | The affected screens are reworked                                   |

The React rules are downgraded rather than disabled, so the violations stay
visible in every lint run instead of disappearing.

### C. Complete AI and media

- Reviewed AI authoring: brief → outline → human edits → draft lessons and
  quizzes → review → publish, as durable resumable jobs
- A grounded learner tutor that cites the material it used
- Local video playback, S3-compatible storage, and OpenVOD integration
- A kill switch that disables AI per academy without a deploy

**Exit:** the same authoring flow produces valid output against both a local
OpenAI-compatible endpoint and Anthropic, and no AI feature 500s when
unconfigured.

### D. Complete paid learning

- Stripe and Razorpay checkout
- Access grants that are separate from orders and enrollments
- Full and partial refunds with correct access consequences
- Reconciliation for delayed and out-of-order provider callbacks
- Observable, replayable webhook delivery

**Exit:** duplicate and out-of-order callbacks cannot produce a wrong business
state, verified by tests.

### E. Public beta

- SDK example and complete API reference
- Self-hosting, upgrade, and backup/restore documentation
- WCAG 2.2 AA verification across authoring and learning flows
- Security regression suite covering the tenant boundaries
- Reproducible release images

**Exit:** a stranger can self-host, upgrade, and restore from backup using only
the documentation.

## Not in scope yet

These are real and wanted. They are not launch scope, because shipping a smaller
thing that works beats shipping a larger thing that half works.

| Deferred                                                       | Why                                                                                                                          |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Shared or cross-academy course libraries                       | Academy-owned courses with explicit copying cover the need. Sync and unlisting semantics are a large problem to solve early. |
| Cohorts, drip scheduling, learning paths                       | Depends on the release model being settled first.                                                                            |
| SCORM, xAPI, cmi5                                              | A substantial integration requiring an LRS. High value for institutional buyers, post-beta.                                  |
| Discussions, Q&A, notifications                                | Needs the notification model, which needs the outbox proven at scale.                                                        |
| More payment and video providers                               | Stripe, Razorpay, OpenVOD, and S3 cover the launch audience.                                                                 |
| Adaptive practice, auto-grading, translation, image generation | The two AI flows must meet quality targets first.                                                                            |
| i18n and RTL                                                   | Real work across every surface. Doing it badly is worse than not doing it.                                                   |
| Audit log                                                      | Needs stable event definitions.                                                                                              |
| SSO (SAML/OIDC) and SCIM                                       | Enterprise operations, deliberately after the OSS product is reliable.                                                       |
| Managed cloud provisioning                                     | Must call the same domain APIs and leave self-hosted operation fully independent.                                            |

## How priorities are set

In rough order:

1. **Correctness of tenant isolation and authorization.** Nothing outranks this.
2. **Self-hosting that works.** If a self-hoster cannot install, upgrade, or
   restore, nothing else matters.
3. **The core learning loop.** Authoring, publishing, learning, assessment.
4. **AI that is reviewed, grounded, and optional.**
5. **Everything else.**

If you want to work on something in the deferred table, open an issue and make
the case. Priorities change when someone shows up to do the work — but that
conversation needs to happen before the pull request, not after.
