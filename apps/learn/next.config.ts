import type { NextConfig } from 'next'

/**
 * The API origin, from the server's point of view.
 *
 * `API_INTERNAL_URL` first, because the right value differs by deployment: a
 * container reaches the API at a service name, a development checkout reaches it
 * at localhost, and a deployment behind one proxy reaches it at that proxy. The
 * `NEXT_PUBLIC_` variable is the fallback so a single value works for a simple
 * install.
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
   *
   * ## Why this was missing, and what it cost
   *
   * `apiOrigin` was computed above and never used: this application had no
   * `rewrites()` at all. Every browser-side call — enrolling, recording progress,
   * submitting a quiz, requesting a certificate — is issued by
   * `browserApiClient`, which uses `baseUrl: ''` and therefore a relative
   * `/api/v1/...` path. With nothing proxying that prefix, Next answered each one
   * itself with a `404`, so the learner's half of the loop could not work in a
   * browser at all. Server-side calls were fine, which is why the pages rendered
   * and the failure looked like a broken button rather than a missing route.
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
   * The workspace packages are consumed as TypeScript source, not as build
   * output, so Next has to compile them rather than treat them as vendored
   * JavaScript it should not touch.
   *
   * That is deliberate for this repository: there is no build step between a
   * change in `packages/contracts` and the application seeing it, which is what
   * makes a contract change impossible to forget to rebuild. The cost is that
   * Next compiles them, and this is where that is declared.
   */
  transpilePackages: ['@docento/contracts', '@docento/sdk'],

  /**
   * The learner application serves many academies, so an image host cannot be
   * hardcoded: academy logos live wherever an operator put them.
   */
  images: {
    remotePatterns: (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean)
      .map((hostname) => ({ protocol: 'https' as const, hostname })),
  },
}

export default nextConfig
