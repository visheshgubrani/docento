import type { Metadata } from 'next'

import { CapabilityGrid } from '@/components/sections/capability-grid'
import { ClosingCta } from '@/components/sections/closing-cta'
import { FaqSection } from '@/components/sections/faq'
import { HeadlessSection } from '@/components/sections/headless-section'
import { Hero } from '@/components/sections/hero'
import { HostingCards } from '@/components/sections/hosting-cards'
import { OpenSourceSection } from '@/components/sections/open-source-section'
import { OwnershipStrip } from '@/components/sections/ownership-strip'
import { ProductStory } from '@/components/sections/product-story'
import { site } from '@/lib/site'

/**
 * The landing page.
 *
 * The order is the argument: what it is, what you own, how it works, what it does,
 * how to extend it, how to run it, what the licence says, what is not there yet,
 * and what to do next.
 *
 * The heading structure is deliberate and worth keeping when editing this file:
 * one `h1` in the hero, one `h2` per section, `h3` for anything inside one. The
 * page is long, and its outline is how somebody using a screen reader navigates
 * it — a section whose heading level is chosen for its font size breaks that.
 */
export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <OwnershipStrip />
      <ProductStory />
      <CapabilityGrid />
      <HeadlessSection />
      <HostingCards />
      <OpenSourceSection />
      <FaqSection />
      <ClosingCta />
    </main>
  )
}
