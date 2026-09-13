import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Reuse the domain package's local environment so integration tests in this
// package run against the same database without a second .env to maintain.
for (const candidate of ['../domain/.env', '.env']) {
  const path = resolve(process.cwd(), candidate)
  if (existsSync(path)) {
    process.loadEnvFile(path)
    break
  }
}
