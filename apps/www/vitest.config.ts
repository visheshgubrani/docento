import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

/**
 * Unit tests, in node, over the marketing site's content and configuration.
 *
 * What is worth testing here is not a rendered component — that is Playwright's
 * job, against a real browser — but the invariants that hold the page together:
 * that every destination is a real URL, that nothing claims to be available when
 * it is not, and that the previews all describe the same fictional academy.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
