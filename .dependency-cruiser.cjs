/**
 * Architecture boundaries, enforced in CI.
 *
 * These rules are the ones that matter and are easy to violate by accident.
 * A rule that lives only in a review checklist does not survive a busy week, so
 * each one here fails the build instead.
 *
 * Run locally with: pnpm boundaries
 */
module.exports = {
  forbidden: [
    {
      name: 'apache-cannot-depend-on-agpl',
      severity: 'error',
      comment:
        'packages/contracts and packages/sdk are Apache-2.0 so they stay usable in proprietary software. If either imported an AGPL-3.0 package, the permissive licence would become a lie. Dependency direction is one-way: the AGPL application imports these, never the reverse. See docs/adr/0006-licensing-boundary.md.',
      from: {
        path: '^packages/(contracts|sdk)/',
        // Root-level tooling config only. These are devDependencies, and both
        // packages ship with a `files` allowlist of ["src", "LICENSE", "NOTICE"],
        // so the shared ESLint preset is never distributed with them. Anything
        // under src/ is still covered, which is the part that actually ships.
        pathNot: '^packages/(contracts|sdk)/(eslint|vitest|tsup)\\.config\\.',
      },
      to: {
        path: '^(apps/|packages/(domain|integrations|config)/)',
      },
    },
    {
      name: 'frontends-cannot-import-domain',
      severity: 'error',
      comment:
        'Business rules live behind the API. A frontend that imports packages/domain would reach Prisma directly and reimplement pricing, grading, or enrollment — which is how a second code path ends up making a different authorization decision than the first. See ARCHITECTURE.md.',
      from: { path: '^(apps/studio|apps/learn)/' },
      to: { path: '^packages/domain/' },
    },
    {
      name: 'prisma-client-only-in-domain',
      severity: 'error',
      comment:
        'Database access belongs to packages/domain. Allowing it elsewhere guarantees a query that forgets its tenant filter, which is the most severe bug this system can have.',
      from: {
        /**
         * No carve-outs. The rule applies everywhere.
         *
         * `apps/api` used to be exempt, because it was the pre-port application
         * with its own Prisma client. It now invokes domain operations like
         * every other consumer, and the exemption is gone with it — which is
         * the point of a carve-out being written down: it has a condition for
         * its removal rather than becoming permanent.
         */
        pathNot: ['^packages/domain/'],
      },
      to: { path: 'node_modules/@prisma/client' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'A cycle between packages means the boundary has stopped meaning anything.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-dev-deps-in-source',
      severity: 'error',
      comment:
        'Shipped source must not import a devDependency, which would break a production install. Scoped to src/ because build tooling — eslint config, vitest config, docs MDX components — legitimately runs only at build time.',
      from: {
        path: '^(apps|packages)/[^/]+/src/',
        pathNot: [
          '(^|/)(test|tests|__tests__)/',
          '\\.test\\.ts$',
          '\\.d\\.ts$',
        ],
      },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],

  options: {
    // `doNotFollow` stops traversal *into* node_modules while still recording
    // the dependency edge. Do not add `node_modules` to `exclude` as well: that
    // removes the edges entirely, which silently disables every rule that
    // matches on a package rather than on a local file.
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(/dist/|/\\.next/|/generated/)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}
