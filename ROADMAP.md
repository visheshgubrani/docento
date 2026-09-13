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

Milestone A is complete. Milestone B is implemented and verified: the loop runs
end to end over HTTP against a real database, in CI, with Postgres as the only
service. Media is stored and served with entitlement checked per request, both
frontends reach the API from the browser, studio authors quizzes and
assignments, and there are container images for all four services.

What is left before the milestone is formally closed is time in CI on `main`
rather than new work — see the milestone's exit condition below.

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

Every bullet above is built, and the loop is now proven rather than assembled
from parts that each pass. What closed it:

- **An end-to-end suite.** `apps/api/src/__tests__/free-loop.test.ts` drives the
  SDK against the app over real HTTP requests, against real Postgres, through
  author → publish → enrol → complete → certify and a stranger verifying the
  certificate by its id. It runs in CI's `verify` job, whose only service is
  Postgres. It found two bugs the isolated tests could not: the SDK omitted the
  API mount from every URL it built, and nothing in the domain completed a quiz
  lesson when its attempt passed.
- **Media routes.** Four registry operations — `media.create`, `media.complete`,
  `media.list`, `media.delete` — plus two byte routes, `PUT /media/upload/{key}`
  and `GET /media/{academyId}/{assetId}`, which are deliberately outside the
  registry because the registry describes JSON operations and neither of these
  is one. Serving is authorized per request by `authorizeMediaServe`: the caller
  must reach the academy, and a learner must additionally have access to a course
  whose published release uses the asset, so entitlement is re-checked at play
  time against enrollment rather than when a URL was handed out.
- **Quiz and assignment authoring in `apps/studio`.** Both editors are on the
  lesson page. Closing this needed a server-side gap fixed first: no staff-facing
  quiz read existed anywhere, and `quiz.upsert` answers with a `quizId` that
  nothing returned again — so an editor could create a quiz, add one question,
  and lose the ability to add a second one on the next page load. `quiz.get`
  returns the quiz with its answer keys, behind `course:read`; it is the only
  response in the API that carries one, and the OpenAPI test names that exception
  explicitly rather than relaxing the rule.
- **Containers.** One workspace-aware `Dockerfile` with a target per service, a
  compose `app` profile running the API, worker and both frontends against
  Postgres alone, and an `images` CI job that builds all four. The API and the
  worker mount the same uploads volume, because ADR 0008 makes that a deployment
  invariant rather than a preference.

**Debt this milestone clears.** Three carve-outs existed so the workspace gate
could be green while the legacy application was still in place. All three are
gone: `apps/api` is in the lint and typecheck gate like every other package, the
Prisma-boundary rule no longer exempts it, and neither frontend downgrades a rule
any more. In `apps/studio` the remaining violations were nine, seven of them in
hooks nothing imported; the dead hooks and one unused component are deleted, so
every rule the port downgraded now gates the application.

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

**Deferred, and not the current focus.** Payments are wanted and will be built;
they are not being built now. The product being finished first is the free
learning loop, because a payment integration on top of a loop that is not proven
is two problems to debug at once — and because the commercial model here is
hosting and support, not a paid edition, so nothing about the free product is
waiting on a checkout.

The groundwork is already in place and deliberately so: `AccessGrant` is a
separate model from `Enrollment` and from orders, so entitlement is already a
question the domain answers independently of how it was paid for. `enroll` mints
a `FREE` grant today, and a checkout is another way to create one rather than a
change to how access is checked.

When this milestone is picked up:

- Stripe and Razorpay checkout
- Access grants that are separate from orders and enrollments
- Full and partial refunds with correct access consequences
- Reconciliation for delayed and out-of-order provider callbacks
- Observable, replayable webhook delivery

**Exit:** duplicate and out-of-order callbacks cannot produce a wrong business
state, verified by tests.

Nothing in this milestone is a prerequisite for milestones C or E, and no
scaffolding for it should be added before it is worked on: a half-built checkout
is a worse answer than an honest absence.

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
| **Payments — Stripe and Razorpay (milestone D)**               | Wanted, and deliberately after the free loop is proven rather than before. Milestone D lists what it covers.                 |
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
