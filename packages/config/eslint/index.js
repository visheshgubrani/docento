import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Shared ESLint preset for the Docento monorepo.
 *
 * Deliberately not type-aware. Type-aware rules are valuable but require a
 * full program per package, which makes linting slow enough that people stop
 * running it. Type correctness is `pnpm typecheck`'s job; this catches the
 * things the compiler does not.
 */
export function docento({ ignores = [] } = {}) {
  return tseslint.config(
    {
      ignores: [
        '**/dist/**',
        '**/.next/**',
        '**/node_modules/**',
        '**/generated/**',
        '**/coverage/**',
        ...ignores,
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      rules: {
        // TypeScript already reports unused variables, and it understands
        // types in a way the base rule does not. The `_` prefix is honoured so
        // an intentionally unused parameter is expressible.
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],

        // `any` is sometimes the correct answer at a third-party boundary, but
        // it should be a decision rather than an accident.
        '@typescript-eslint/no-explicit-any': 'warn',

        eqeqeq: ['error', 'always', { null: 'ignore' }],
        'prefer-const': 'error',
        'no-var': 'error',

        // Server logs are structured through the logger; a stray console call is
        // usually a leftover debug line.
        'no-console': ['warn', { allow: ['error', 'warn'] }],
      },
    },
    {
      // Tests and scripts legitimately log and use loose types.
      files: ['**/*.test.ts', '**/__tests__/**/*.ts', '**/scripts/**'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  )
}

export default docento
