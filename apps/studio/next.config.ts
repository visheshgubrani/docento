import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

/**
 * Image hosts are deployment-specific, so they come from the environment rather
 * than being committed. A hardcoded host silently breaks `next/image` for every
 * deployment that is not the one it was written for.
 */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

/**
 * The API origin, from the server's point of view.
 *
 * `API_INTERNAL_URL` first, because the right value differs by deployment: a
 * container reaches the API at a service name and a development checkout at
 * localhost.
 */
const apiOrigin = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  output: 'standalone',

  /**
   * Everything the browser calls goes through this origin.
   *
   * Both realms set session cookies on the API's host. If the browser talked to
   * the API on a different origin those cookies would be third-party — needing
   * `SameSite=None`, which requires HTTPS even locally, and subject to
   * third-party cookie restrictions that would eventually break sign-in in a way
   * nobody could reproduce. Rewriting makes them ordinary first-party cookies
   * with `SameSite=Lax`, with no CORS preflight and nothing to configure for
   * local HTTPS.
   *
   * It also means the application needs no API URL at build time, so one image
   * runs against any API origin.
   */
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` },
      {
        source: '/api/auth/:path*',
        destination: `${apiOrigin}/api/auth/:path*`,
      },
    ]
  },

  /**
   * The workspace packages are consumed as TypeScript source, not build output,
   * so Next has to compile them rather than treat them as vendored JavaScript.
   * That is deliberate: there is no build step between a change in
   * `packages/contracts` and this application seeing it, which is what makes a
   * contract change impossible to forget to rebuild.
   */
  transpilePackages: ['@docento/contracts', '@docento/sdk'],

  images: {
    formats: ['image/avif', 'image/webp'],
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
     * script against another's staff session.
     */
    dangerouslyAllowSVG: false,
  },
}

/**
 * Sentry is optional and must never be configured with someone else's project.
 *
 * Source-map upload needs an org, a project, and an auth token. When those are
 * absent — the normal case for a self-hoster and for a contributor — the plain
 * config is exported so the build succeeds with no Sentry at all.
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
      silent: !process.env.CI,
      widenClientFileUpload: true,
      webpack: { treeshake: { removeDebugLogging: true } },
    })
  : nextConfig
