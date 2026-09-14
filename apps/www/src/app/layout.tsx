import type { Metadata } from 'next'
import { Toaster } from '@docento/ui'
import { marketingFontClassName } from '@docento/ui/fonts'

import { AnnouncementStrip } from '@/components/sections/announcement-strip'
import { SiteFooter } from '@/components/sections/site-footer'
import { SiteHeader } from '@/components/sections/site-header'
import { SmoothScroll } from '@/components/motion/smooth-scroll'
import { site } from '@/lib/site'

import './globals.css'

/**
 * The document.
 *
 * ## The fonts are applied here and nowhere else
 *
 * All three typefaces are declared as CSS variables on `<html>`. Components then
 * use `font-display`, `font-sans` and `font-mono`, which means no component can
 * accidentally introduce a fourth typeface: it would have to add a variable that
 * does not exist.
 *
 * ## The header and footer are in the layout, not the page
 *
 * There is one marketing page and an internal component reference, and both are
 * navigated the same way. Putting the chrome here means the styleguide exercises
 * the real header — including its focus behaviour — rather than a copy of it.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [{ url: '/images/social.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={marketingFontClassName}>
      <body className="bg-canvas text-ink font-sans antialiased">
        <a
          href="#main"
          className="bg-brand text-on-brand sr-only rounded-[var(--radius-control)] px-4 py-2 focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100"
        >
          Skip to content
        </a>

        <SmoothScroll>
          {/**
           * The release notice sits above the header, in the flow, so scrolling
           * takes it away and leaves the header to stick on its own.
           */}
          <AnnouncementStrip />
          <SiteHeader />
          {children}
          <SiteFooter />
        </SmoothScroll>

        <Toaster />
      </body>
    </html>
  )
}
