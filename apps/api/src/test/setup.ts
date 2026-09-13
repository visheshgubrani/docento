import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Load the domain package's environment.
 *
 * The auth realms and the database client read configuration at import time, so
 * it has to be present before anything else loads. Reusing `packages/domain/.env`
 * rather than keeping a second copy means a contributor configures one file and
 * every package agrees about which database it points at.
 */
for (const candidate of ['../../domain/.env', '.env']) {
  const path = resolve(process.cwd(), candidate)

  if (existsSync(path)) {
    process.loadEnvFile(path)
    break
  }
}

/**
 * Clear the shared rate-limit counters before a suite file runs.
 *
 * Rate limiting is Postgres-backed and keyed per caller, so the counters
 * outlive a test run: signing up is limited to ten attempts an hour, the API
 * suite spends several across its files, and the second run within that hour
 * fails on `429` — a suite that passes once and then fails until the window
 * rolls over, for a reason that has nothing to do with the code under test.
 *
 * The domain's own `resetRateLimits` does the clearing rather than raw SQL, so
 * there is one description of what a counter is and where it lives.
 *
 * This is only safe because the packages do not run concurrently — the root
 * `test` script pins turbo to one task at a time, for the same reason each
 * package's vitest config disables file parallelism within itself: every
 * package runs against the same Postgres, and a suite that clears shared state
 * while another is asserting on it is a flake waiting to happen.
 */
const { resetRateLimits } = await import('@docento/domain')

try {
  await resetRateLimits()
} catch {
  /**
   * A database that has not been migrated yet is not this file's problem to
   * report: the suite's first query will say so with a message that names the
   * table and the command to fix it.
   */
}
