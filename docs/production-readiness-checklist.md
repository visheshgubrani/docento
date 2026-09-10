# Production Readiness Checklist

This is a repo-specific deployment checklist for:

- `server/`: Express + Prisma LMS API
- `client/`: dashboard/admin app
- `dogfood-client/`: learner-facing frontend that consumes LMS APIs

Use this as a punch list before production, not just as reference material.

## 1. Environment Model You Should Use

Do not mix demo, staging, and production data.

Recommended environments:

| Environment | Purpose | Database | API keys | Frontend domain |
| --- | --- | --- | --- | --- |
| Local | Development | Local DB | local-only | localhost |
| Staging | Pre-release testing | Staging DB | staging keys only | `staging-...` |
| Production | Real users | Production DB | production keys only | real domain |
| Demo/Dogfood Demo | Sales/demo content | Separate demo DB or separate demo tenant | demo keys only | `demo-...` or separate path/domain |

Rule:

- never use production keys in staging or demo
- never use demo data in the production tenant
- never point a public demo frontend at the production tenant

## 2. Server Checklist

### Must do before production

- Add `helmet()` in [`server/src/app.ts`](/home/akira/LMS/server/src/app.ts) and explicitly configure security headers.
- Add rate limiting for:
  - auth endpoints
  - API key protected endpoints
  - webhook endpoints
  - public storefront endpoints
- Add request size limits for JSON and uploads so abuse cannot exhaust memory.
- Restrict CORS to real production origins only. The current middleware in [`server/src/middlewares/cors.middleware.ts`](/home/akira/LMS/server/src/middlewares/cors.middleware.ts) still includes localhost fallbacks, which should not be active in production.
- Hide or protect Swagger. [`server/src/app.ts`](/home/akira/LMS/server/src/app.ts) mounts `/api-docs` unconditionally; in production it should be disabled or behind admin auth.
- Remove env-debug logging from [`server/src/index.ts`](/home/akira/LMS/server/src/index.ts). Even boolean secret-presence logs are unnecessary in production.
- Enforce HTTPS at the proxy/load balancer and keep `app.set('trust proxy', 1)` enabled behind the proxy.
- Make all secrets production-grade and store them in the deploy platform secret manager:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `REFRESH_TOKEN_SECRET`
  - payment keys
  - email provider keys
  - storage keys
  - webhook secrets
  - Clipmux / Cloudflare / OpenAI-related secrets
- Ensure database connections use SSL in production.
- Set up automated Postgres backups and point-in-time recovery.
- Run Prisma migrations in CI/CD or release phase, not manually from a shell on prod.
- Add structured logging with request IDs and ship logs to a provider.
- Add error monitoring and alerting.
- Add health and readiness checks. `/health` exists, but add dependency checks for DB and critical providers if your platform supports readiness probes.
- Add graceful shutdown so deploys do not drop in-flight requests.

### Auth and API key rules

- Keep `sk_live_...` keys server-side only.
- Never put a secret LMS key in `NEXT_PUBLIC_*`.
- If a browser must call LMS APIs directly, use only the project `publishableKey` plus user auth where required.
- Rotate secret API keys on a schedule and on suspected compromise.
- Track `lastUsedAt` and alert on suspicious key usage.
- Add scoped API keys if you expect multiple backends or third-party integrators.
- Separate staging and production keys per project.

### CORS, cookies, and browser security

- Keep `Access-Control-Allow-Origin` strict and origin-specific.
- Do not allow wildcard origins with credentials.
- Set auth cookies as `HttpOnly`, `Secure`, and `SameSite=Lax` or `Strict` unless cross-site flows require otherwise.
- Add a Content Security Policy.
- Add `X-Content-Type-Options: nosniff`.
- Add `Referrer-Policy`.
- Add `Permissions-Policy`.

### Abuse protection

- Add IP and key-based rate limits.
- Add brute-force protection for login, signup, and password reset flows.
- Add webhook signature verification everywhere external systems call into your API.
- Add idempotency handling for payment and webhook flows.
- Add audit logs for admin/security actions:
  - API key creation/revocation
  - collaborator invites
  - payment setting changes
  - allowed-origin changes

### Database and Prisma

- Use managed Postgres, not a dev-grade instance.
- Enable connection pooling.
- Review indexes on high-traffic lookup paths.
- Add a release check that `prisma migrate deploy` succeeds cleanly.
- Do not edit old migrations once production starts.
- Decide which data is bootstrap data and which is real business data.

### Operational maturity

- Add CI checks for `build`, linting, and tests.
- Add at least request-level API tests for auth, projects, enrollments, checkout, and progress.
- Add smoke tests after deploy.
- Document rollback steps.
- Add a job or queue for retries on email, webhooks, and other provider calls.

## 3. Client Checklist

### Must do before production

- Stop ignoring TypeScript build errors. [`client/next.config.ts`](/home/akira/LMS/client/next.config.ts) currently sets `ignoreBuildErrors: true`, which should be removed before production.
- Tighten Next image rules. [`client/next.config.ts`](/home/akira/LMS/client/next.config.ts) currently allows very broad remote patterns and `dangerouslyAllowSVG: true`; that is too open for production.
- Set real production values for:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_AUTH_BASE_URL`
  - `NEXT_PUBLIC_FRONTEND_URL`
  - `NEXT_PUBLIC_APP_URL`
- Add error monitoring.
- Add analytics only after confirming privacy and cookie requirements.
- Add security headers at the frontend layer too, especially CSP.
- Review caching strategy for pages that contain private data.
- Ensure all authenticated requests use secure cookies and do not leak tokens to client storage unnecessarily.

### Deployment and runtime

- Deploy the client behind HTTPS only.
- Set separate env vars for local, staging, and production.
- Run `npm run lint` and `npm run build` in CI for every release.
- Test login, project creation, course creation, enrollment, checkout, certificate, and student progress flows against the production-like environment before launch.

## 4. Dogfood Client Checklist

The repo already uses a better pattern here:

- [`dogfood-client/src/lib/fetch-api.ts`](/home/akira/LMS/dogfood-client/src/lib/fetch-api.ts) reads `LMS_SECRET_API_KEY` from server env
- the browser does not appear to receive that secret directly
- several route handlers proxy requests to the LMS API using that server-side key

That means:

- `LMS_SECRET_API_KEY` is acceptable in `dogfood-client` only as a server-side env var
- do not expose it as `NEXT_PUBLIC_LMS_SECRET_API_KEY`
- keep using server route handlers / server actions / middleware as the boundary

### Recommended dogfood env split

Production dogfood:

- `LMS_API_URL=https://api.yourdomain.com/api/v1`
- `LMS_SECRET_API_KEY=real production secret key for the production project`
- `NEXT_PUBLIC_APP_NAME=real app name`

Staging dogfood:

- `LMS_API_URL=https://staging-api.yourdomain.com/api/v1`
- `LMS_SECRET_API_KEY=staging secret key for the staging project`

Demo dogfood:

- use a separate demo tenant or demo environment
- use a separate demo secret key
- load demo courses/users/orders there only

## 5. Seed Data vs Real API Key

This is the part you were confused about:

### Short answer

- Use a real production secret API key for the real production dogfood deployment.
- Use demo data only in a separate demo tenant or separate demo environment.
- Do not put demo seed data into the real production tenant unless that content is intentionally public and permanent.

### Practical rule

If `dogfood-client` is your actual live learner app:

- create a real production `Project` in LMS
- generate a real production `sk_live_...` key
- store that key in dogfood deployment secrets as `LMS_SECRET_API_KEY`
- point dogfood to production LMS API
- populate that project with real production content and users

If `dogfood-client` is only for showcasing/demo:

- create a separate demo project
- generate a separate demo key
- seed only demo courses/users there
- never reuse the production project or production key for demo

### What to seed

Good things to seed:

- a demo tenant/project
- demo branding
- demo courses/modules/lessons
- demo coupons
- test learners

Do not seed into real production unless it is intentional business content:

- fake orders
- fake learners
- fake analytics
- fake payment states

## 6. Recommended Launch Order

1. Harden server security headers, rate limits, Swagger exposure, and CORS.
2. Fix client build gating and tighten image/security settings.
3. Create separate staging and production databases.
4. Create separate staging and production LMS projects/tenants.
5. Generate separate staging and production secret API keys.
6. Deploy server to staging.
7. Run migrations in staging.
8. Deploy `client` and `dogfood-client` to staging with staging keys.
9. Test all critical flows end to end.
10. Repeat the same with production keys and production data only.

## 7. Repo-Specific Gaps I Would Fix First

High priority:

- add `helmet()` to [`server/src/app.ts`](/home/akira/LMS/server/src/app.ts)
- add rate limiting middleware
- disable or protect `/api-docs` in production
- remove localhost fallback origins from production CORS config in [`server/src/middlewares/cors.middleware.ts`](/home/akira/LMS/server/src/middlewares/cors.middleware.ts)
- remove `ignoreBuildErrors` from [`client/next.config.ts`](/home/akira/LMS/client/next.config.ts)
- tighten `remotePatterns` and remove `dangerouslyAllowSVG` unless there is a hard requirement

Second wave:

- add structured logging and monitoring
- add CI checks and basic API tests
- add backup/restore verification
- add key rotation and incident-response documentation

## 8. Final Recommendation

For a real production rollout:

- deploy `server` with real production secrets
- deploy `client` with only public frontend env vars
- deploy `dogfood-client` with a real production `LMS_SECRET_API_KEY` stored as a server-only secret
- keep demo data in a separate demo tenant or demo environment

If you want, the next step can be one of these:

1. I create a concrete `.env.production.example` for `server`, `client`, and `dogfood-client`.
2. I implement the first production hardening changes in code: `helmet`, rate limiting, Swagger gating, and stricter CORS.
