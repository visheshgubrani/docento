import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Load `.env` before any module reads configuration.
 *
 * Node's built-in loader is used rather than a dotenv dependency: this package
 * has no business adding a runtime dependency for something the platform now
 * provides.
 */
const envPath = resolve(process.cwd(), '.env')

if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}
