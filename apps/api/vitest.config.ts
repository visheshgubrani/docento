import { defineConfig } from 'vitest/config'

/**
 * The API's tests run against a real Postgres, like every other package's.
 *
 * The end-to-end suite drives the real HTTP surface through the real domain
 * operations — mocking the database here would test the mock, and the
 * guarantees being checked are database properties: unique indexes, atomic
 * statements, and which rows a scoped query can see.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // One database, so files must not race each other's cleanup.
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
