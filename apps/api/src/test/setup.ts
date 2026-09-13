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
