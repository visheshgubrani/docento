import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

/**
 * Studio has tests for the same reason the other packages do: the parts worth
 * testing here are pure functions. Anything that needs a DOM or a running API
 * belongs in the end-to-end suite, not in a unit test with three mocks.
 *
 * `environment: 'node'` is deliberate. A test that needs a browser should say
 * so explicitly rather than depending on a global default.
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
