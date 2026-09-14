/**
 * The token data the component reference renders.
 *
 * Everything here comes from `@docento/ui/tokens`, which parses the stylesheet
 * itself — so the swatches, the ratios and the test that guards them are reading
 * the same file. The type scale and spacing tables are the parts a stylesheet
 * cannot describe on its own, and they are declared here beside the page that
 * shows them.
 */
export {
  CONTRAST_PAIRS,
  TOKEN_ROLES,
  contrastRatio,
  darkTokens,
  lightTokens,
} from '@docento/ui/tokens'

import {
  CONTRAST_PAIRS,
  contrastRatio,
  darkTokens,
  lightTokens,
  resolveToken,
  TOKEN_ROLES,
} from '@docento/ui/tokens'

const light = lightTokens()
const dark = { ...light, ...darkTokens() }

export type Swatch = {
  token: string
  light: string
  dark: string
  role: string
}

/** Every semantic token, with both of its values and what it is for. */
export const swatches: Swatch[] = Object.keys(TOKEN_ROLES).map((token) => ({
  token,
  light: light[token],
  dark: dark[token],
  role: TOKEN_ROLES[token],
}))

/**
 * The ratios the contrast test asserts, for the table on the page.
 *
 * Resolved through the alias chain rather than read raw, because several of the
 * pairs are named the way a component names them — `foreground` on `background` —
 * and those values are `var(--ink)` on `var(--canvas)` until they are resolved.
 */
export const checkedPairs = CONTRAST_PAIRS.map((pair) => ({
  foreground: pair.foreground,
  background: pair.background,
  minimum: pair.minimum,
  light: contrastRatio(
    resolveToken(light, pair.foreground),
    resolveToken(light, pair.background),
  ),
  dark: contrastRatio(
    resolveToken(dark, pair.foreground),
    resolveToken(dark, pair.background),
  ),
}))

export const typeScale = [
  {
    token: 'text-hero',
    usage: 'Marketing hero',
    sample: 'A home for everything you teach.',
  },
  {
    token: 'text-section',
    usage: 'Marketing section title',
    sample: 'From your first lesson',
  },
  {
    token: 'text-title',
    usage: 'Product page title',
    sample: 'The cut as a sentence',
  },
  {
    token: 'text-body-lg',
    usage: 'Marketing body',
    sample: 'Create courses, guide learners, and build an academy you own.',
  },
  {
    token: 'text-lesson',
    usage: 'Lesson reading content',
    sample: 'A cut is not punctuation placed after the fact.',
  },
  {
    token: 'text-meta',
    usage: 'Labels and metadata',
    sample: '7 lessons · 3 modules',
  },
  {
    token: 'text-micro',
    usage: 'Chapter numbers, preview labels',
    sample: 'INTERFACE PREVIEW',
  },
]

export const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96, 112, 128]

export const radii = [
  { token: 'radius-control', value: 8, usage: 'Controls' },
  { token: 'radius-card', value: 12, usage: 'Cards' },
  { token: 'radius-frame', value: 20, usage: 'Product frames' },
]
