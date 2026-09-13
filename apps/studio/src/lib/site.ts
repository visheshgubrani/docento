export const BLUR_FADE_DELAY = 0.15

export const siteConfig = {
  name: 'Docento',
  description: 'Self-hostable, AI-native course platform',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  keywords: [
    'LMS',
    'course platform',
    'Open Source',
    'self-hosted',
    'Next.js',
    'React',
    'Tailwind CSS',
  ],
  links: {
    /**
     * Only list a channel that exists.
     *
     * The previous version linked to `twitter.com`, `discord.gg` and
     * `instagram.com` — the platforms' own homepages, not any Docento account.
     * A footer full of links that go nowhere useful reads worse than a short
     * footer, and it is the kind of thing nobody notices is broken.
     */
    github: 'https://github.com/visheshgubrani/docento',
  },
}

export type SiteConfig = typeof siteConfig
