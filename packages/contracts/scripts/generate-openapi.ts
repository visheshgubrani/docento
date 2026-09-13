import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { buildOpenApiDocument } from '../src/index.js'

/**
 * Write the OpenAPI document to a file.
 *
 * Run with `pnpm --filter @docento/contracts openapi`. CI checks the output in
 * and fails if regenerating it produces a diff, which is what makes a contract
 * change visible in review rather than discovered by an integrator.
 *
 * The document is generated from the operation registry, so it cannot describe
 * an endpoint the API does not serve — the failure mode a hand-written
 * specification has and nobody notices.
 */

const target = resolve(process.cwd(), process.argv[2] ?? '../../openapi.json')

const document = buildOpenApiDocument({
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  version: process.env.npm_package_version ?? '0.1.0',
})

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`)

const paths = Object.keys((document.paths as Record<string, unknown>) ?? {})

console.log(`Wrote ${target}`)
console.log(`  ${paths.length} paths, ${document.openapi}`)
