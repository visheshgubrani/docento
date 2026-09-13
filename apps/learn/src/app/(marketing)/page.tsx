import { Suspense } from 'react'

import {
  Hero,
  Features,
  CourseCatalogue,
  FAQ,
  CTA,
} from '@/components/marketing'

/**
 * The academy landing page.
 *
 * There is no testimonials section and no statistics band, deliberately. The
 * previous version carried six named learner quotes with stock portraits and
 * figures like "15,000+ course completions" for a product with no users. Restore
 * those sections when there is something true to put in them.
 */
export default function Home() {
  return (
    <main className="relative mx-auto flex w-full flex-col items-center justify-center">
      <Hero />
      <Features />
      <Suspense
        fallback={<div className="p-10 text-center">Loading courses...</div>}
      >
        <CourseCatalogue />
      </Suspense>
      <FAQ />
      <CTA />
    </main>
  )
}
