import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * `eslint-config-next` ships flat configs as its default export, so they are
 * spread directly.
 *
 * This previously used `FlatCompat` with `next/core-web-vitals`, which no longer
 * works: `eslint-config-next` stopped publishing eslintrc-style configs through
 * its `exports` map, and `FlatCompat` then fails with a circular-structure error
 * that names nothing useful. Because the config was broken, this app was never
 * actually linted.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /**
   * No rule overrides.
   *
   * This block used to downgrade React Compiler and hooks-correctness rules to
   * warnings, with a comment explaining that this application "predates the OSS
   * architecture and is reworked during the Milestone B port" and had "~48
   * genuine violations". Both halves of that stopped being true: the port is
   * done, and what remained was nine violations in vendored shadcn primitives —
   * seven of them in hooks that nothing imported at all.
   *
   * The debt is discharged rather than hidden. The dead hooks and the one unused
   * component are gone, `use-toast` describes its actions as a union instead of
   * a runtime object it only ever read as a type, and three empty interfaces are
   * type aliases. Every rule the port downgraded now gates this application, so
   * a new violation is a failed build rather than a line in a log.
   */

  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
