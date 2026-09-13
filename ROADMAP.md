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

Milestone A is complete. Milestone B is close: the domain layer, the contracts,
the generated OpenAPI document, the SDK, the HTTP surface and both frontends are
done and individually tested. What remains is the CI job that proves the loop end
to end, the media routes, and the container story. See below for what each
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

Every bullet above is built and tested in isolation. What the exit condition
still needs:

- **An end-to-end suite in CI.** Author → publish → enrol → complete → certify,
  driven against a fresh database, so the loop is proven rather than assembled
  from parts that each pass.
- **Media routes.** `packages/integrations` implements local and S3 storage and
  the domain carries `MediaAsset`, but `media.upload`, `media.complete` and
  `media.serve` are deliberately absent from the registry until the routes
  exist — the SDK's completeness test is what stops them being claimed.
- **Quiz and assignment authoring in `apps/studio`.** Both are implemented in
  the domain and reachable over HTTP; the studio edits lesson content and
  publishes, and the question editor is outstanding.
- **Containers.** A workspace-aware Dockerfile, a compose `app` profile running
  the API, worker and both frontends against Postgres alone, and a CI job that
  builds them.

**Debt this milestone clears.** Three carve-outs existed so the workspace gate
could be green while the legacy application was still in place. Two are gone —
`apps/api` is in the lint and typecheck gate like every other package, and the
Prisma-boundary rule no longer exempts it. The third remains:

| Carve-out                                   | Where                                                           | Removed when                    |
| ------------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| React Compiler rules downgraded to warnings | `apps/studio/eslint.config.mjs`, `apps/learn/eslint.config.mjs` | The affected hooks are reworked |

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
