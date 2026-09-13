/**
 * Fallback site metadata for the learner application.
 *
 * The academy's real name, logo, colours and support address come from
 * `Academy.branding` over the catalogue API, because one deployment serves many
 * academies and none of them should have to edit code to be renamed.
 *
 * These values are the fallback used before branding has loaded, and in the
 * marketing pages that are not yet academy-scoped. They name the *software*,
 * not a tenant: the previous version hardcoded a fictional employer called
 * `${siteConfig.name}` at a domain nobody owned, which then leaked into every page
 * title, the legal pages, and the certificate preview.
 */
export const siteConfig = {
  name: 'Docento',
  tagline: 'Online learning',
  description:
    'A self-hostable course platform: courses, assessments and verifiable certificates.',
  /**
   * Set `NEXT_PUBLIC_SITE_URL` in a deployment. Used for canonical URLs and
   * metadata, so it must be the origin learners actually reach, not the API's.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  logo: '/logo.svg',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null,
  links: {
    github: 'https://github.com/visheshgubrani/docento',
  },
}
