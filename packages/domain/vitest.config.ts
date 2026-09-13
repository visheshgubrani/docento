import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Loads the local .env before any module reads configuration. The auth
    // realms resolve their secrets at import time, so this has to happen first.
    setupFiles: ['./src/test/setup.ts'],
    // These tests share one Postgres database and clean up after themselves.
    // Running files in parallel would let one file's cleanup race another's
    // assertions.
    fileParallelism: false,
  },
})
