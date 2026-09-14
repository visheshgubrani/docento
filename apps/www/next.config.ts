import type { NextConfig } from 'next'

/**
 * The marketing site's configuration.
 *
 * ## What is deliberately absent
 *
 * There is no `rewrites()` here, and that is the difference between this
 * application and the other two. Studio and Learn proxy `/api/*` to the API so
 * their session cookies stay first-party; the marketing site has no session, no
 * database and no API call at runtime. It builds and serves with nothing else
 * running, which is what makes it safe to deploy on its own and what keeps a
 * marketing outage and a product outage from being the same event.
 *
 * ## Workspace packages are consumed as source
 *
 * `@docento/ui` and `@docento/sdk` are TypeScript, compiled by this application.
 * The SDK earns its place by being imported: the developer section's example is
 * typechecked against the real client rather than copied into a string that
 * drifts from it.
 */
const nextConfig: NextConfig = {
  output: 'standalone',

  transpilePackages: ['@docento/ui', '@docento/sdk'],

  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
