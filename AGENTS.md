# Repository Guidelines

## Current Architecture & Source of Truth

HeadlessLMS is no longer just a `server/` + `client/` repo. The current workspace has four active apps plus local infra:

- `server/`: Express 5 API, Prisma, Better Auth, PostHog, Sentry, OpenAI, R2, Razorpay. Source lives in `server/src`, schema and migrations in `server/prisma`, optional tests in `server/tests`, build output in `server/dist`.
- `client/`: primary product frontend and marketing site. Built with Next.js App Router, Tailwind CSS v4, shadcn/ui, React Query, Better Auth client, Framer Motion, and SCSS token layers. This is the main frontend source of truth.
- `docs/`: separate Fumadocs-powered documentation app. Use this for public docs content and docs UX, not `client/`.
- `dogfood-client/`: secondary Next.js frontend for internal or product dogfooding. Treat it as a separate app with its own styling and route structure. Do not copy patterns from here into `client/` unless the task explicitly targets it.
- `docker-compose.yml`: local deployment stack for Postgres, `server`, `client`, `dogfood-client`, plus Dozzle and Uptime Kuma for observability.

When working in `client/`, use the actual route groups and component domains already present:

- `client/src/app/(marketing)`, `(auth)`, `(dashboard)`, `(legal)`: primary app shells.
- `client/src/components/ui`: shared shadcn/Radix primitives.
- `client/src/components/layout`: app chrome such as sidebars, topbars, header, footer.
- `client/src/components/landing`: current homepage and marketing section system. This is the source of truth for the landing page.
- `client/src/components/sections`: older marketing section set kept for legacy or transitional pages. Prefer `components/landing` for new homepage work unless the page already imports the older section set.
- `client/src/lib/api.ts` and `client/src/lib/hooks/*`: client API contracts and React Query data hooks.

On the backend, keep route registration in `server/src/routes`, request handling in `server/src/controllers`, shared integrations in `server/src/lib`, reusable helpers in `server/src/utils`, and request guards or context setup in `server/src/middlewares`.

## Build, Test, and Development Commands

Install dependencies per package. There is no single root workspace runner committed yet.

- `cd server && npm install`
- `cd client && npm install`
- `cd docs && npm install`
- `cd dogfood-client && npm install`

Main development commands:

- `cd server && npx prisma migrate dev && npm run dev`: run the API locally with Prisma migrations.
- `cd server && npm run build && npm start`: build and run the production server bundle.
- `cd server && npm run swagger-gen`: regenerate Swagger output after API contract changes.
- `cd client && npm run dev`: run the main Next.js app.
- `cd client && npm run lint`
- `cd client && npm run build`
- `cd docs && npm run dev`
- `cd docs && npm run lint`
- `cd docs && npm run build`
- `cd docs && npm run types:check`
- `cd dogfood-client && npm run dev`
- `cd dogfood-client && npm run lint`
- `cd dogfood-client && npm run build`
- `docker compose up -d`: boot the containerised local stack defined at repo root.

Environment is split by runtime:

- package-local development typically uses `.env` files inside each app
- compose-based development uses `db.env`, `server.env`, `client.env`, and `dogfood-client.env`

Important frontend runtime defaults:

- API base URL in `client/` defaults to `http://localhost:4000/api/v1`
- Better Auth client base URL in `client/` defaults to `http://localhost:4000/api/auth`

## Coding Style & Naming Conventions

Use TypeScript across the repo. Follow the existing file style instead of mass-reformatting untouched code.

- Use 2-space indentation.
- Components, classes, and exported React symbols use PascalCase.
- Functions, hooks, variables, and props use camelCase.
- Route, utility, and feature filenames use kebab-case.
- Prefer absolute imports like `@/components/...` inside Next.js apps.
- Use Zod for payload validation and typed boundaries.
- Keep shared API types in `client/src/lib/api.ts` or server-side types near their owning module.

Do not introduce broad architectural drift:

- Do not put backend business rules in the client.
- Do not bypass shared API helpers with ad hoc fetch logic unless there is a strong reason.
- Do not move Prisma access into random route files; keep database and integration logic in controllers, libs, or clearly scoped helpers.
- Do not treat generated files like `server/src/utils/swagger_output.json` as hand-edited source.

## Backend Implementation Rules

The server is responsible for tenant isolation, authorization, and integration boundaries.

- Keep auth and session behavior anchored in `server/src/lib/auth.ts`.
- Keep Prisma wiring in `server/src/lib/prisma.ts`.
- Keep request-context, auth, CORS, and rate-limiting concerns in middleware.
- Prefer controller-driven handlers instead of large route files.
- Add new Prisma migrations instead of editing old ones.
- Keep external service wrappers in `server/src/lib` or `server/src/utils`, not inline in controllers.
- Preserve the existing split between REST API routes under `/api/v1` and Better Auth endpoints under `/api/auth`.

## Frontend Architecture & Data Flow

`client/` is the main application frontend. Follow these patterns so future work stays coherent:

- Keep `page.tsx` and layout files thin. Compose pages from feature components.
- Prefer server components by default in Next.js App Router and add `"use client"` only where state, effects, DOM APIs, or browser-only libraries are actually needed.
- Use `client/src/components/ui` before creating one-off primitives.
- Use `cn()` for class composition and `cva()` when a component needs structured variants.
- Put app data access in `client/src/lib/api.ts`.
- Put React Query wrappers in `client/src/lib/hooks/*`.
- Use `ProtectedRoute` and `useProtectedSession` for authenticated app shells and private pages.
- Use `client/src/lib/auth.ts` for Better Auth client flows rather than rolling custom auth fetches.
- Keep route-aware UI in layout or shell components like `dashboard-layout-client.tsx`, `sidebar.tsx`, and `topbar.tsx`.

Preferred frontend composition model:

- route file decides data boundary and page-level composition
- feature component owns section markup and interaction details
- shared primitive owns reusable styling and a11y behavior

## Frontend Design System

### Design Direction

The primary frontend in `client/` is not a generic admin theme. It mixes a calm editorial marketing feel with a polished product dashboard:

- soft off-white and warm-neutral surfaces
- dark charcoal foregrounds
- violet/lilac accent system
- rounded cards and pills
- thin borders and restrained shadows
- subtle grid, gradient, and noise textures on marketing surfaces
- denser, quieter styling in the dashboard

Design should feel clean, modern, and slightly premium, not loud or overly playful.

### Tokens & Styling Foundation

The visual foundation lives in `client/src/app/globals.css` plus `client/src/styles/_variables.scss`.

- Tailwind CSS v4 is configured through `globals.css`.
- shadcn/ui is configured in `client/components.json` with the `new-york` style and CSS variables enabled.
- Always prefer semantic tokens such as `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-accent`, `border-border`, `bg-dashboard-bg`, and `bg-sidebar`.
- If a new color needs to be reused, add a token first instead of scattering hex values.

Use the existing palette intent:

- `background`: clean white base
- `foreground`: near-black text
- `secondary`: soft lavender surface
- `accent`: brand violet used for highlights and CTAs
- `dashboard-bg`: slightly warm app background for private product surfaces
- `sidebar`: deep dark surface for dashboard side navigation
- `success` and `destructive`: feedback colors only, not brand colors

Existing accent scales already support richer gradients:

- `accent-50` through `accent-950` for pale lilac to stronger violet washes
- `violet-500` through `violet-950` for darker brand accents and contrast surfaces

Do not introduce unrelated bright brand colors unless the design requirement clearly calls for it.

### Typography

Typography is intentionally varied, but it still has rules. Fonts are loaded in `client/src/app/layout.tsx`.

- `font-serif` and `font-ibm`: hero lines, editorial headings, premium marketing headlines
- `font-inter`: default product UI font for dashboards, forms, labels, buttons, and body copy
- `font-noto`, `font-literata`, `font-stix`: supporting display or editorial accents on existing pages; use sparingly and only when matching the surrounding screen
- `font-comfortaa` and `font-allerta`: brand or wordmark usage, not long-form body copy
- `font-mono`: code, API snippets, and technical examples only

Rules for mixing fonts:

- keep most screens to one body font plus one display font
- do not combine three or four decorative families in a new screen
- use serif/display fonts for headings, not dense dashboard tables or forms

### Layout Patterns

Marketing pages and dashboard pages follow different layout systems.

For marketing in `client/src/components/landing`:

- use `max-w-7xl` containers
- keep generous vertical spacing such as `py-20` to `py-28`
- center sections unless a split-layout section clearly benefits from left alignment
- use framed screenshots, gradient shells, grid backgrounds, and light texture overlays
- prefer rounded-full or rounded pill CTAs on landing surfaces
- use the shared `SectionHeader` component when the section matches that pattern

For dashboard and authenticated product UI:

- use the existing dashboard shell in `client/src/app/(dashboard)`
- keep sidebars and topbars sticky or fixed where the current layout expects that
- prefer `bg-dashboard-bg` for page canvases
- use cards, dialogs, tables, badges, and inputs from `components/ui`
- keep spacing tighter and more functional than the marketing site
- use rounded-xl cards with subtle borders and soft shadows

### Component Patterns

Shared product UI should come from `client/src/components/ui` whenever possible.

- `Button`, `Card`, `Badge`, `Dialog`, `Input`, `Textarea`, `Select`, `Table`, `Sheet`, and `Tooltip` are the primary UI building blocks.
- Extend existing primitives before inventing a parallel component.
- If a component is purely page-specific, keep it in the relevant feature folder, not in `components/ui`.

Button guidance:

- marketing primary buttons are often dark foreground fills or accent-driven pills
- dashboard primary buttons should usually stay closer to the shadcn defaults or semantic product variants
- avoid mixing multiple competing CTA styles in the same section

Card guidance:

- marketing cards can use gradients, screenshots, accent borders, or soft noise overlays
- dashboard cards should stay calmer and prioritize legibility

### Motion & Interaction

Framer Motion is already used in the main frontend. Keep motion purposeful.

- use fade, lift, stagger, and subtle slide transitions for section reveals and menus
- marketing can be more expressive, especially for hero entrances and section reveals
- dashboard motion should stay restrained and assistive
- avoid constant looping animations unless they add real meaning
- prefer 200ms to 700ms transitions with smooth easing

If you add new motion, make sure the static state still looks good and the page remains understandable without animation.

### Responsive Rules

All frontend work must be mobile-safe and desktop-safe.

- build mobile-first
- let marketing sections collapse to one column cleanly before expanding to split layouts
- preserve readable line lengths on large screens
- keep dashboard navigation usable on smaller screens through the existing `Sheet` and compact sidebar patterns
- verify sticky headers and sidebars do not overlap content at common breakpoints

### Current Visual Language Cheat Sheet

Use this as the fast default when designing a new `client/` screen:

- Page background: white, `secondary`, or `dashboard-bg`
- Primary text: `text-foreground`
- Secondary text: `text-foreground/70` or `text-muted-foreground`
- Brand emphasis: `text-accent`, `bg-accent`, accent scale backgrounds, or violet gradients
- Borders: subtle, usually `border-border` or pale accent borders
- Radius: `rounded-md` to `rounded-xl`, with pills for hero CTAs and badges
- Shadows: soft and low-contrast, not heavy dark drop shadows
- Imagery: framed screenshots, illustrations, grid patterns, or noise texture instead of flat blank sections

## Frontend Guardrails

When working in `client/`, keep these rules explicit:

- Treat `client/src/components/landing` as the current landing-page system.
- Do not build new pages by mixing old `components/sections` patterns with new `components/landing` patterns unless you are intentionally migrating.
- Do not hardcode many arbitrary colors in JSX when a token already exists.
- Do not add a new UI library for something shadcn/Radix already covers.
- Do not put API fetches directly inside many unrelated components; centralize them in hooks or shared API helpers.
- Do not over-theme dashboard pages with marketing-style gradients unless the page is meant to be promotional.
- Do not break the existing brand casing: the product name is typically written as `Edural`, while the stylized lowercase wordmark appears only in components that already do that.

## Testing & Verification

Automated coverage is limited, so manual verification is still required for most changes.

- Run the build or lint command for every app you touch.
- For backend changes, make sure Prisma migrations apply cleanly.
- For client changes, verify both mobile and desktop layouts.
- For dashboard changes, verify authenticated navigation, sidebar behavior, and the affected data flow.
- For marketing changes, verify spacing, responsive layout, and motion behavior on the homepage or affected route.
- For docs changes, run the docs build or type check if routing, MDX, or navigation changed.
- Include manual verification evidence in PRs when UI changes are involved: screenshot, short recording, or concise flow notes.

If you add tests:

- prefer request-level backend specs with Supertest
- keep tests near the relevant module or under `server/tests`
- name them `*.spec.ts`

## Commit & Pull Request Guidelines

History follows Conventional Commits.

- use prefixes like `feat:`, `fix:`, `chore:`, `refactor:`, or `docs:`
- keep each commit focused on one concern
- mention which app or package changed
- list the commands you ran in the PR description
- attach screenshots or JSON samples for UI or API changes

## Security & Configuration Tips

- Never commit `.env` files, `*.env` compose secrets, API keys, OAuth secrets, JWT secrets, or database credentials.
- Review Better Auth origins and callback URLs carefully when changing auth flows.
- Keep trusted origins restricted to real frontend hosts.
- Create new Prisma migrations rather than rewriting old migration history.
- Check generated Swagger output and webhook payload examples before sharing them externally.
- Treat Dozzle and Uptime Kuma as local observability tools, not application feature code.
