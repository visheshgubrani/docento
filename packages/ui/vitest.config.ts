import { defineConfig } from 'vitest/config'

/**
 * The design system's tests are gates on values, not on rendering.
 *
 * They read `src/styles/tokens.css` and the committed brand assets from disk
 * and assert properties of them — contrast, completeness, that a dark
 * counterpart exists — so the environment is node and no DOM is involved. A
 * test that needed to render a component to check a colour would be testing
 * Tailwind rather than the token.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
