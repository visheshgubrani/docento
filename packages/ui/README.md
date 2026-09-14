# `@docento/ui` — the shared design system

Semantic tokens, the typefaces, the brand marks and the presentation primitives
every Docento surface is built from. Licensed AGPL-3.0 with the application, like
everything else that is not `packages/contracts` or `packages/sdk`.

## What is here

| Entry point                     | Contents                                                                 |
| ------------------------------- | ------------------------------------------------------------------------ |
| `@docento/ui`                   | Components, `cn()`, the brand marks                                      |
| `@docento/ui/brand`             | Symbol, wordmark and lockup, and their path data                         |
| `@docento/ui/fonts`             | `next/font/local` declarations for Geist Sans, Geist Mono and Newsreader |
| `@docento/ui/styles/tokens.css` | The semantic variables and their Tailwind mapping                        |
| `@docento/ui/styles/base.css`   | Page defaults, marketing layout classes, the page-edge motif             |
| `@docento/ui/tokens`            | Server-only: the token file as data, with contrast ratios                |

A consuming application imports the two stylesheets in its `globals.css`, applies a
font class from `@docento/ui/fonts` to `<html>`, and has the whole system.

## The rules this package encodes

**Colours are named for their role.** A component writes `bg-brand`, never
`bg-[#245440]`. `src/styles/tokens.css` is the only place a hex value appears, and
`src/__tests__/contrast.test.ts` reads that file and fails the build if any checked
pair drops below WCAG AA — 4.5:1 for text, 3:1 for control boundaries.

**A decorative border is not a control boundary.** `--border-decorative` separates
cards and sections; `--border-control` is much darker and is what an input's outline
uses. Swapping them is the failure mode the pair exists to prevent, and a test
records that the decorative one does not meet 3:1.

**Availability is carried by words, not colour.** The status tokens exist so a
message can be styled consistently, not so a colour can be the message.

**Serif type stays out of dense controls.** Newsreader is for marketing headlines;
the application surfaces load Geist only.

## Working on it

```bash
pnpm --filter @docento/ui test          # token contrast, brand assets, fonts
pnpm --filter @docento/ui typecheck
```

Two generators, both run by hand and both committed:

```bash
pnpm --filter @docento/ui fonts:sync       # copy the WOFF2 files and their licences
pnpm --filter @docento/ui brand:wordmark   # outline the wordmark, write the SVGs
```

`fonts:sync` exists because `next/font/local` needs a real path and a build must
not depend on a third party being reachable; `brand:wordmark` exists because an SVG
that says `font-family="Geist"` renders as a different font anywhere Geist is not
installed. Both are idempotent, and both write a record — `fonts/LICENCES.md`, and
the geometry the components render — so a change is reviewable.

## Who consumes it

| Surface       | State                                                             |
| ------------- | ----------------------------------------------------------------- |
| `apps/www`    | Built on this package                                             |
| `apps/studio` | Migrated: tokens, fonts and every primitive it uses               |
| `apps/learn`  | Not migrated yet — still carries its own token set and primitives |
| `apps/docs`   | Not migrated yet                                                  |

Learn is next. Until it moves, a change here reaches two of the four surfaces, and
its own copies will drift.

## What is deliberately not here yet

The primitives Studio and Learn will need as their missing screens are built —
`select`, `popover`, `checkbox`, `dialog`-adjacent pieces such as an alert dialog,
and a breadcrumb. They are added when a screen needs one, not before: an
unreferenced component is a promise this package cannot keep.

This package holds no application behaviour: no data fetching, no permissions, no
routing. `pnpm boundaries` fails the build if it imports `packages/domain` or
`packages/integrations`, and if the Apache-2.0 packages import it.
