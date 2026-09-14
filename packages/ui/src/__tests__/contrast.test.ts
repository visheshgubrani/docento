import { describe, expect, it } from 'vitest'

import {
  CONTRAST_PAIRS,
  contrastRatio,
  darkTokens,
  lightTokens,
  literalColours,
  resolveToken,
} from '../lib/read-tokens'

/**
 * The contrast gate.
 *
 * WCAG 2.2 AA is an acceptance target for this design system, and a target that is
 * checked by reading a table stops being met the first time somebody tunes a colour
 * to taste. This is the review: the values in `tokens.css` are starting points, and
 * when one of them fails here it is the value that changes.
 *
 * The pairs come from the same declaration the component reference renders — the
 * shadcn aliases included, because those are what components actually use — so the
 * page cannot show a ratio this test does not assert, or the reverse.
 */

const THEMES = [
  { name: 'light', tokens: lightTokens },
  { name: 'dark', tokens: darkTokens },
]

describe.each(THEMES)('contrast in the $name theme', ({ tokens: read }) => {
  const tokens = read()

  it.each(CONTRAST_PAIRS)('$usage: --$foreground on --$background', (pair) => {
    const foreground = resolveToken(tokens, pair.foreground)
    const background = resolveToken(tokens, pair.background)
    const actual = contrastRatio(foreground, background)

    expect(
      Number(actual.toFixed(2)),
      `${pair.usage} (${foreground} on ${background}) is ${actual.toFixed(2)}:1, below the ${pair.minimum}:1 required`,
    ).toBeGreaterThanOrEqual(pair.minimum)
  })
})

describe('the decorative border', () => {
  it('is not the control boundary', () => {
    for (const { name, tokens: read } of THEMES) {
      const tokens = read()

      expect(
        resolveToken(tokens, 'border-decorative'),
        `${name}: a decorative hairline used as an input boundary is invisible`,
      ).not.toBe(resolveToken(tokens, 'border-control'))
    }
  })

  it('is recorded as failing a control boundary, which is why the pair exists', () => {
    /**
     * This asserts a failure deliberately. The decorative border does not meet
     * 3:1 — that is the reason `--border-control` exists at all — and this test
     * records it so the reasoning is visible rather than inferred. If a future
     * change makes the decorative border meet 3:1, this fails not because the
     * change was wrong but because the note has stopped being true.
     */
    const tokens = lightTokens()
    const actual = contrastRatio(
      resolveToken(tokens, 'border-decorative'),
      resolveToken(tokens, 'surface'),
    )

    expect(actual).toBeLessThan(3)
  })
})

describe('token completeness', () => {
  it('gives every literal colour in the light theme a dark counterpart', () => {
    const light = Object.keys(literalColours(lightTokens()))
    const dark = Object.keys(literalColours(darkTokens()))
    const missing = light.filter((token) => !dark.includes(token))

    expect(
      missing,
      `These tokens have no dark value: ${missing.join(', ')}. A token that exists only in the light theme is a surface that stays light in the dark one.`,
    ).toEqual([])
  })

  it('defines the semantic set the components and the reference page use', () => {
    const tokens = lightTokens()

    for (const token of [
      'canvas',
      'surface',
      'surface-subtle',
      'ink',
      'ink-muted',
      'brand',
      'on-brand',
      'border-decorative',
      'border-control',
      'accent-decorative',
    ]) {
      expect(tokens[token], `Missing semantic token --${token}`).toBeDefined()
      expect(resolveToken(tokens, token)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
