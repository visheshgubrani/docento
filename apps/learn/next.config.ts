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
