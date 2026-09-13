import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      /**
       * React Compiler and hooks-correctness rules are reported as warnings.
       *
       * This application predates the OSS architecture and is reworked during
       * the Milestone B port. Its violations are real rather than lint noise,
       * but rewriting them now means rewriting code about to be replaced.
       *
       * Downgraded rather than disabled, so the work stays visible in every
       * run and every other rule still gates this app.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/error-boundaries': 'warn',
      // Untyped boundaries in the legacy API client. Error for new code.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

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
