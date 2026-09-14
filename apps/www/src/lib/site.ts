/**
 * Every destination the page links to, in one place.
 *
 * ## Why this is a module and not literals in components
 *
 * Two reasons, and only the first is tidiness. The second is the acceptance
 * criterion: *every CTA reaches a useful, real destination*. A link written into
 * a component is a link nobody can enumerate, and "no dead links" becomes a
 * claim about a review. Here the set is finite and typed, `site-config.test.ts`
 * asserts each entry is an absolute URL, and a placeholder cannot be added
 * without failing a test that names it.
 *
 * ## Why nothing here is a production URL this repository cannot know
 *
 * The site's own origin and the documentation origin are deployment facts, so
 * they come from the environment with development defaults. The repository
 * origin is a fact about this project, so it is a default rather than an empty
 * string — and a fork repoints it with one variable instead of editing
 * components.
 */

const repository =
  process.env.NEXT_PUBLIC_REPO_URL ??
  'https://github.com/visheshgubrani/docento'

/** Paths inside the repository, which are real files rather than guesses. */
function inRepo(path: string) {
  return `${repository}/blob/main/${path}`
}

function inRepoTree(path: string) {
  return `${repository}/tree/main/${path}`
}

export const site = {
  name: 'Docento',

  /**
   * The marketing site's own origin. Canonical URLs, the sitemap and Open Graph
   * metadata are built from it, so a deployment sets it to the address visitors
   * reach.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',

  tagline: 'A home for everything you teach.',

  description:
    'Docento is an open-source learning platform: create courses, guide learners, and build an academy you own, with headless APIs for building your own front end.',

  /**
   * Documentation.
   *
   * Defaults to the repository's own README with `NEXT_PUBLIC_DOCS_URL` unset,
   * because the documentation site has not been rewritten for this product yet:
   * it still describes projects, cohorts and AI transcription, and linking a
   * visitor to it would be worse than linking them to something true. When the
   * documentation is rewritten, this variable is set and no component changes.
   */
  docs: process.env.NEXT_PUBLIC_DOCS_URL ?? `${repository}#readme`,

  repository,

  /** The page's own anchors. Kept here so the header, footer and tests agree. */
  anchors: {
    product: '#product',
    developers: '#developers',
    hosting: '#hosting',
    openSource: '#open-source',
    faq: '#faq',
  },

  links: {
    /** Where a visitor starts self-hosting: the repository's own quickstart. */
    selfHost: `${repository}#quickstart`,
    roadmap: inRepo('ROADMAP.md'),
    /** There is no API guide yet; the architecture's API section is the truth. */
    apiGuide: `${inRepo('ARCHITECTURE.md')}#public-api`,
    architecture: inRepo('ARCHITECTURE.md'),
    sdkSource: inRepoTree('packages/sdk'),
    contributing: inRepo('CONTRIBUTING.md'),
    governance: inRepo('GOVERNANCE.md'),
    security: inRepo('SECURITY.md'),
    codeOfConduct: inRepo('CODE_OF_CONDUCT.md'),
    /** The licence split, linked to the files themselves rather than described. */
    licence: inRepo('LICENSE'),
    licenceContracts: inRepo('packages/contracts/LICENSE'),
    licenceSdk: inRepo('packages/sdk/LICENSE'),
    releases: `${repository}/releases`,
    issues: `${repository}/issues`,
  },
} as const

export type Site = typeof site
