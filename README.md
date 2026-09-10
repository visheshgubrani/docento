# Docento

**The modern open-source headless LMS** built in **TypeScript**. Give your customers full control over frontends, domains, branding and auth (managed or delegated) while you run the learning infrastructure, users, enrollments, progress, quizzes, API keys, analytics-ready events, and more.

> Make learning a product, not a platform. Build beautiful frontends, we handle the hard bits.

---

[![npm version](https://img.shields.io/badge/npm-10.9.3-blue)]() [![license](https://img.shields.io/badge/license-MIT-green)]()

## Table of contents

1. [Why Docento?](#why-docento)
2. [Core concepts](#core-concepts)
3. [Quickstart — Developer flow](#quickstart---developer-flow)
4. [API surface (examples)](#api-surface-examples)
5. [TypeScript client example](#typescript-client-example)
6. [Auth modes: Managed vs Delegated](#auth-modes-managed-vs-delegated)
7. [Branding & Custom Domains](#branding--custom-domains)
8. [Security & API keys](#security--api-keys)
9. [Events & Webhooks](#events--webhooks)

---

## Why Docento?

- **Ship fast**: You own the UX — we expose stable APIs for everything else (users, courses, modules, lessons, quizzes, enrollments, progress).
- **Multi-tenant**: Each customer is a `Project` with isolated data, API keys and settings.
- **Flexible auth**: Managed users (we handle authentication) or delegated users (you authenticate, we store a reference).
- **Branding-first**: Customers can attach domains, logos, and full-branding config while using the same backend.
- **TypeScript everywhere**: Designed and implemented in TypeScript for DX and safety.

---

## Core concepts

- **Project** — your customer's tenant. Contains courses, API keys, and end users.
- **ApiKey** — project-scoped secrets for server-to-server interactions.
- **EndUser** — the learner (managed or delegated).
- **Course / Module / Lesson** — content hierarchy. Lessons can be VIDEO, TEXT, QUIZ, FILE.
- **Enrollment** — a learner's enrollment into a course (progress tracked).
- **Progress** — lesson-level progress and watch-durations.
- **Quiz / Question / QuizAttempt / Answer** — assessment model for proctored/auto-scored quizzes.

---

## Quickstart — Developer flow

### 1) Clone & install

```bash
git clone https://github.com/visheshgubrani/docento.git
cd docento
npm install        # or pnpm / yarn
```

### 2) Environment

Create a `.env`:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/docento
JWT_SECRET=some-very-long-secret
PORT=4000
CLIENT_URL=http://localhost:5173
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
LOG_LEVEL=info
LOG_PROVIDER_URL=
LOG_PROVIDER_TOKEN=
LOG_PROVIDER_FORMAT=ndjson
LOG_PROVIDER_HEADERS={"x-dataset":"lms-server"}
```

Replace `re_xxxxxxxxx` with your real Resend API key.

Structured logs are emitted as JSON to stdout by default. To forward them to a log provider, point `LOG_PROVIDER_URL` at the provider's HTTP ingest endpoint, optionally set `LOG_PROVIDER_TOKEN`, and use `LOG_PROVIDER_HEADERS` for any provider-specific headers. Requests now carry and return an `x-request-id`, and the same ID is attached to all logs produced while that request is in flight.

### 3) Migrate & run (Prisma + TS)

```bash
npm prisma migrate dev --name init
npm dev          # runs TypeScript app with hot reload
```

### 4) Create a Project & API key (example using curl)

```bash
curl -X POST http://localhost:4000/v1/projects \
  -H "Authorization: Bearer lms_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Academy","slug":"acme","authMode":"MANAGED"}'
```

Create an API key for the project:

```bash
curl -X POST http://localhost:4000/v1/projects/acme/api-keys \
  -H "Authorization: Bearer lms_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Server Key"}'
```

---

## API surface (examples)

> The API is RESTful and JSON-first. All endpoints are namespaced by project when relevant.

### Project-level

- `POST /v1/projects` — create a project (tenant)
- `GET  /v1/projects/:projectId` — fetch project metadata
- `POST /v1/projects/:projectId/api-keys` — create API key

### Users & Auth

- `POST /v1/projects/:projectId/end-users` — create an end user (managed or delegated reference)
- `POST /v1/projects/:projectId/auth/managed/login` — managed user login (returns JWT)
- `POST /v1/projects/:projectId/auth/delegated/verify` — create delegated reference if you handle login

### Course & Content

- `POST /v1/projects/:projectId/courses` — create course
- `POST /v1/projects/:projectId/courses/:courseId/modules` — create module
- `POST /v1/projects/:projectId/modules/:moduleId/lessons` — create lesson (video/text/quiz/file)
- `GET  /v1/projects/:projectId/courses/:courseId` — get public course (for custom frontends)

### Enrollment & Progress

- `POST /v1/projects/:projectId/courses/:courseId/enrollments` — enroll a user
- `PATCH /v1/projects/:projectId/lessons/:lessonId/progress` — update progress
- `GET   /v1/projects/:projectId/end-users/:endUserId/progress` — pull user progress

### Quizzes

- `POST /v1/projects/:projectId/quizzes/:quizId/attempts` — start/submit an attempt
- `GET  /v1/projects/:projectId/quizzes/:quizId/attempts/:attemptId` — fetch result

---

## TypeScript client example

Below is a minimal example showing how a customer frontend/backend might call your API using a server API key.

```ts
// lms-client.ts — small convenience wrapper
import axios from 'axios'

export class LMSClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  private headers() {
    return { Authorization: `Bearer ${this.apiKey}` }
  }

  async createEnrollment(
    projectSlug: string,
    courseId: string,
    endUserId: string
  ) {
    const url = `${this.baseUrl}/v1/projects/${projectSlug}/courses/${courseId}/enrollments`
    const { data } = await axios.post(
      url,
      { endUserId },
      { headers: this.headers() }
    )
    return data
  }

  async updateProgress(
    projectSlug: string,
    lessonId: string,
    endUserId: string,
    payload: { watchedDuration: number; isCompleted?: boolean }
  ) {
    const url = `${this.baseUrl}/v1/projects/${projectSlug}/lessons/${lessonId}/progress`
    const { data } = await axios.patch(
      url,
      { endUserId, ...payload },
      { headers: this.headers() }
    )
    return data
  }
}
```

Usage:

```ts
const client = new LMSClient(
  'https://api.yourlms.com',
  process.env.PROJECT_API_KEY!
)
await client.createEnrollment('acme', 'course_cuid', 'enduser_cuid')
```

---

## Auth modes: Managed vs Delegated

- **Managed** — Docento manages credentials for learners. Great when you want our auth, password resets, magic links, and hosted emails.

  - We store `ManagedUser.password` and provide login endpoints.
  - End-users appear in `EndUser` + `ManagedUser`.

- **Delegated** — Your system remains the source of truth. We store a minimal `DelegatedUser` reference (external id / metadata). Use when you already have an identity provider (Auth0, Cognito, Firebase, custom SSO).

  - We provide endpoints to create the `EndUser` with `externalId`, and you call our APIs with server keys or signed tokens.

Both modes can co-exist per `Project`. Switch per project via `project.authMode` (`MANAGED` | `DELEGATED`).

---

## Branding & Custom Domains

Customers expect their site to look like their brand. Docento offers:

- **Brand settings** per project: `name`, `logoUrl`, `primaryColor`, `font`, `legal`, `supportEmail`.
- **Custom domain** mapping: verify DNS TXT, add `project.domain = "learn.acme.com"`, and we issue TLS.
- **Public course pages** that can be embedded or proxied via the customer's domain.

Example flow:

1. Customer requests a custom domain in dashboard: `learn.acme.com`.
2. We return a DNS verification token (TXT) and a CNAME target.
3. After verification, we automatically provision TLS and update project config.

---

## Security & API keys

- **Server keys (ApiKey)** — Keep them secret. Use them for backend-to-backend operations (create enrollments, manage content).
- **Short-lived tokens** — We recommend issuing short-lived user tokens for frontends (JWTs signed by the platform).
- **Scopes & least privilege** — Plan to support scoped API keys (read-only, content-only, billing) per project.
- **Rate limiting & monitoring** — Per-key rate limits and last-used tracking are included in `ApiKey.lastUsedAt` for observability.

---

## Events & Webhooks

We emit events for: `enrollment.created`, `progress.updated`, `quiz.attempt.completed`, `project.domain.verified`, etc. Webhooks allow customers to:

- Sync events into analytics
- Trigger LMS-driven automations
- Integrate with CRMs / billing / Zapier

Example webhook payload:

```json
{
  "event": "enrollment.created",
  "projectId": "cuid_xyz",
  "payload": {
    "courseId": "c123",
    "endUserId": "u456",
    "enrolledAt": "2025-10-07T00:00:00Z"
  }
}
```

---

## Example business flows

- **SaaS creator sells courses**: uses Projects to separate customers; each customer uses custom domain and brand; payments handled by customer (we’re headless).
- **Marketplace**: platform creates many Projects and issues API keys so sellers can plug in their own frontends.
- **White-label training**: enterprise delegates auth (SSO) and uses delegated users to keep identity in-house.

---

## Roadmap / TODO (ideas you can expose)

- Scoped API keys and policies (read-only, content-only)
- Fine-grained webhooks + reliable delivery dashboard
- Built-in payment integrations (optional — stripe/payments adapters)
- Analytics dashboard / cohort reporting
- GraphQL gateway as alternative API surface
- SDKs for Go / Python / Java

---
