import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Queue tests share one Postgres and one pg-boss schema.
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
