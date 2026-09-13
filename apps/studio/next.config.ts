import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

/**
 * Image hosts are deployment-specific, so they come from the environment rather
 * than being committed. A hardcoded host here silently breaks `next/image` for
 * every deployment that is not the one it was written for.
 *
 * Set NEXT_PUBLIC_IMAGE_HOSTS to a comma-separated list, e.g.
 *   NEXT_PUBLIC_IMAGE_HOSTS="cdn.example.com,media.example.com"
 */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
    /**
     * SVG is deliberately not allowed through `next/image`.
     *
     * An SVG is a script container. `contentDispositionType: 'attachment'`
     * changes how a response is presented, not what it can do once a browser
     * renders it inline, so it is not the guard it looks like. Logos and
     * thumbnails are author-supplied, and one academy must never be able to run
     * script against another's staff session — so the format is refused at the
     * image layer rather than trusted because of its content type.
     *
     * Rasterise first, or serve the SVG from a separate origin.
     */
    dangerouslyAllowSVG: false,
  },
}

/**
 * Sentry is optional and must never be configured with someone else's project.
 *
 * Source-map upload needs an org, a project, and an auth token. When those are
 * absent — which is the normal case for a self-hoster and for a contributor —
 * the plain config is exported so the build succeeds with no Sentry at all.
 * Runtime error reporting still works if only SENTRY_DSN is set, because the
 * SDK reads that directly.
 */
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN

const sentryConfigured = Boolean(sentryOrg && sentryProject && sentryAuthToken)

export default sentryConfigured
  ? withSentryConfig(nextConfig, {
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,

      // Only print logs for uploading source maps in CI.
      silent: !process.env.CI,

      // A larger upload set gives better stack traces at the cost of build time.
      widenClientFileUpload: true,

      webpack: {
        // Sentry's own debug logging is not useful in a shipped bundle.
        treeshake: {
          removeDebugLogging: true,
        },
      },
    })
  : nextConfig
