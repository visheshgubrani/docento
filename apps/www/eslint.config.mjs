import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * The same configuration as the other applications, with one addition: the
 * end-to-end specs are linted too, because a test that quietly disables a rule
 * is how a suite stops testing anything.
 *
 * `eslint-config-next` publishes flat configs as its default export, so they are
 * spread rather than wrapped.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
])

export default eslintConfig
