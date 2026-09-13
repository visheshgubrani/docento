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

What is left before it is formally closed is time in CI on `main` rather than new
work — see the milestone's exit condition below.

**The next scope is milestone C, and the first half of it is the product UI.**
The port replaced the commercial application with minimal shells: the API, the
domain and the SDK are complete and tested, and only some of what they can do is
reachable by a person. 23 of the 61 operations have no screen at all. That is the
work — not a rebuild of the deleted commercial dashboard, most of which belongs to
the deferred payments milestone or to nothing.

Two things follow from that, and they shape the order:

- **The UI is the least verified part of this repository.** The domain and API
  have 511 tests including the end-to-end loop; the UI has almost none, and the
  one bug that mattered — the learner application's browser calls never reaching
  the API — was found by reading a config file. The compose `app` profile is what
  makes closing that possible, so a browser-level suite belongs to the UI work
  rather than after it.
- **Milestone E cannot start until C is done.** Its exit condition is that a
  stranger can self-host and use the product, and its accessibility work is an
  audit of screens. There is nothing to audit yet.

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

### C. The product UI, with AI and media

This milestone has two halves on purpose. The AI surfaces — a brief, an outline,
draft lessons to review, a tutor — _are_ screens, so building them before the
product UI exists would mean designing the authoring experience twice. They are
one milestone because they are one body of work, not two.

#### The product UI

The port deleted the commercial application's UI along with the features it
served: 42 studio pages and 18 learner pages. Most of that is **not** work to be
redone. Billing, coupons, transactions, pricing, checkout, purchase receipts,
webhook and payment settings, and the marketing and blog pages went because the
features went — they belong to milestone D, or to nothing. Rebuilding them now
would be rebuilding a product that was deliberately removed.

What is genuinely missing is narrower and measurable: **23 of the 61 API
operations have no UI anywhere.** They come to seven areas:

| Missing                               | What it costs today                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Curriculum management                 | A course can be built but not reorganised: no rename, reorder or delete for modules and lessons, no course settings, no archiving, no release history.                     |
| Grading                               | A learner can submit an assignment and nobody can mark it. The submissions list, grade entry and the quiz gradebook are all reachable over HTTP with no screen.            |
| Media library and upload              | No upload anywhere in the product. The API creates an asset, hands back an upload address and serves the bytes; nothing can attach a video to a lesson.                    |
| Service keys                          | The headless API's own credentials have no screen, so an operator cannot issue or revoke a key without `curl`.                                                             |
| Password reset and email verification | Both are implemented, rate-limited and wired to the email integration — and neither application has a page for them. An operator who forgets their password is locked out. |
| Learner progress and attempt history  | A learner sees a percentage and nothing behind it: no per-lesson detail, no history of their own attempts.                                                                 |
| Public academy profile                | `catalog.academy` exists and nothing renders it, so an academy has no public page.                                                                                         |

#### Testing the UI, which is the part that is actually unverified

The domain and the API are covered by 511 tests, including the end-to-end loop.
The UI is covered by almost nothing: its server components, its forms and the
browser proxy are verified by reading them. That is not a theoretical gap — the
learn application could not reach the API from a browser at all, and the only
reason it is fixed is that the missing proxy was found by reading the config
rather than by a test. A unit test cannot tell you that enrolling works when the
session cookie is first-party.

The compose `app` profile now runs the whole stack against Postgres alone, which
is what makes this closable: a browser-level suite (Playwright) driving that
stack in CI. It belongs to this milestone rather than to E because the screens
are being built here, and a browser test written afterwards tests what somebody
remembered to write.

#### AI and media

- Reviewed AI authoring: brief → outline → human edits → draft lessons and
  quizzes → review → publish, as durable resumable jobs
- A grounded learner tutor that cites the material it used
- Local video playback, S3-compatible storage, and OpenVOD integration
- AI provider connections as a per-academy setting, with the kill switch that
  disables AI without a deploy

#### Carried over from B, deliberately

Two things were found while finishing B and left on purpose rather than dropped
quietly:

- **Short-lived playback URLs.** ADR 0008 says a client never receives a durable
  media URL. Entitlement _is_ re-checked on every request, which is the security
  half; the URL itself is still stable. Signed, expiring playback URLs belong
  with the player work here.
- **Unreachable schema.** `MediaAsset.status = FAILED` is never set,
  `thumbnailUrl`, `durationSeconds` and `MediaCaption` are written by nothing, and
  the `openvod` and `external` providers are declared with no adapter. Either they
  get a code path here or the columns go: a column nothing writes is a promise the
  schema makes on the code's behalf.

**Exit:** a person can complete the whole loop in a browser — author, publish,
enrol, learn, be assessed, certify, verify — with the browser suite proving it
against the compose stack; the same authoring flow produces valid output against
both a local OpenAI-compatible endpoint and Anthropic; and no AI feature 500s
when unconfigured.

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
