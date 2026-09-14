# `@docento/www` — the marketing site

The Docento landing page. A separate Next.js application from Studio and Learn,
and deliberately so: it has no database, no session and no API call, which is what
lets it build and serve on its own.

## Running it

```bash
pnpm --filter @docento/www dev        # http://localhost:3000
pnpm --filter @docento/www build
pnpm --filter @docento/www start
```

It needs nothing else running. No Postgres, no API, no auth.

## Browser verification

```bash
pnpm --filter @docento/www build      # the suite drives a production build
pnpm --filter @docento/www exec playwright install chromium
pnpm --filter @docento/www test:e2e
```

The suite asserts what only a browser can: the page is readable with JavaScript
disabled, every control is reachable by keyboard, no viewport from 320px to 1440px
scrolls sideways, the menu traps and restores focus, and axe finds no serious or
critical accessibility violation.

`test:e2e` starts `next start` itself, but it does **not** build — the visual
baselines were captured from a production build, and a development build renders
differently enough to make them meaningless.

If your browser cache is not writable (`~/.cache/ms-playwright` by default), set
`PLAYWRIGHT_BROWSERS_PATH` before both `playwright install` and `playwright test`.
The two must agree, or the run will not find the browser it installed.

### Visual baselines

`e2e/visual.spec.ts-snapshots/` holds committed screenshots of the landing page at
two widths and of the component reference in both token sets. Regenerate them
deliberately:

```bash
pnpm --filter @docento/www test:e2e:update
```

Baselines are captured on Linux, which is what CI runs. A diff means the page
changed — review it as a design change rather than refreshing it reflexively.

## Environment

Three optional variables, documented in `.env.example`:

| Variable               | Default                                     | Why it exists                                                                                                                         |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`                     | Canonical URLs, the sitemap and Open Graph metadata                                                                                   |
| `NEXT_PUBLIC_DOCS_URL` | the repository README                       | The documentation site has not been rewritten for this product yet, so the honest destination is the repository. Set this when it is. |
| `NEXT_PUBLIC_REPO_URL` | `https://github.com/visheshgubrani/docento` | Where every source, roadmap, licence and contribution link points. A fork repoints this rather than editing components.               |

Nothing else is configurable, and nothing here is a deployment URL this
repository would have to guess.

## Adding the photography

The page ships with placeholders and no image files. `src/lib/assets.ts` maps every
slot to its dimensions, alternative text, expected file name and a short brief;
until `src` is set, `MediaSlot` renders a labelled panel of exactly the right size,
so the layout cannot shift when the file arrives.

Set `src` to the file's path, drop the file in `public/images/`, and the slot starts
rendering a lazy-loaded `next/image`. `src/__tests__/site-config.test.ts` checks the
metadata of every entry, so a slot added without dimensions or alternative text
fails the suite.

Course artwork and the product previews are **not** placeholders: they are drawn in
code, from the fixtures in `src/content/fixtures/`, so they stay in step with the
design system and never need a raster asset.

## Where things live

```
src/app/                 routes: the landing page, the component reference
src/components/sections/ the page, section by section
src/components/previews/ the code-rendered product previews
src/components/motion/   GSAP and Lenis, scoped to this application
src/content/             copy, fixture data, the typechecked SDK example
src/lib/                 site configuration, availability model, Shiki
e2e/                     Playwright: accessibility, navigation, story, layout
```

Two rules worth knowing before editing:

- **Copy and destinations live in `src/content/` and `src/lib/site.ts`**, not in
  JSX. Availability is data (`available` / `preview` / `planned`) and a unit test
  refuses a claim without one; destinations are enumerated and a test refuses a
  placeholder.
- **The example in the developer section is compiled.** It is a marked region of
  `src/content/snippets/developer-quickstart.ts`, which imports `@docento/sdk` for
  real, so `pnpm typecheck` fails if the SDK moves and the page still shows the old
  call.
