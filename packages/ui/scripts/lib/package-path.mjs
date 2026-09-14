import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Locating a dependency's files from a script inside this package.
 *
 * `require.resolve('geist/package.json')` does not work here and neither does
 * `require.resolve('geist')`: that package ships an `exports` map which permits
 * neither its manifest nor a subpath. The scripts still need two things the map
 * does not expose — the WOFF2 and TTF files, and the licence text.
 *
 * pnpm links a package's direct dependencies into its own `node_modules`, so the
 * directory is a fixed path rather than something to search for. If it is
 * missing, the answer is `pnpm install`, and the error says so.
 */

export function packageRoot(importMetaUrl) {
  return dirname(dirname(fileURLToPath(importMetaUrl)))
}

export function dependencyDir(root, name) {
  const dir = join(root, 'node_modules', name)

  if (!existsSync(join(dir, 'package.json'))) {
    throw new Error(
      `${name} is not installed at ${dir}. Run \`pnpm install\` from the repository root.`,
    )
  }

  return dir
}

export function manifest(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
}
