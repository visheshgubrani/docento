import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /**
   * No rule overrides.
   *
   * This block downgraded React Compiler and hooks-correctness rules while the
   * application still carried code from before the port. That code is gone, and
   * what is left has no violation of any of them — the three warnings this
   * application reports are unused variables in its own components, which the
   * base config already surfaces and which are being fixed rather than
   * tolerated.
   *
   * So the downgrade had become a rule that could never fire, which is worse
   * than no rule: it reads as a live concession. Removed, the whole set gates
   * this application.
   */

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
