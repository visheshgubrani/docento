import { ArrowRightIcon } from 'lucide-react'

import { Section, SectionIntro } from '@/components/section'
import { AvailabilityLabel } from '@/components/availability-label'
import { Reveal } from '@/components/motion/reveal'
import { hosting } from '@/content/landing'
import { cn } from '@docento/ui'

/**
 * The three ways to run it.
 *
 * Three cards of equal size, which is a decision rather than a default: making the
 * self-hosted card bigger would be a sales technique, and there is nothing to sell
 * here. What differs is stated in the availability label and in the actions —
 * self-hosting starts now, the other two link to the roadmap.
 *
 * No feature matrix, no invented prices, no countdown, no waitlist form. Each of
 * those would be a claim this repository cannot support, and the commercial model
 * is hosting rather than a gated edition, so there is nothing a matrix would need
 * to withhold.
 */
export function HostingCards() {
  return (
    <Section id="hosting" labelledBy="hosting-heading">
      <SectionIntro
        id="hosting-heading"
        eyebrow="Hosting"
        title="One complete product. Three ways to run it."
        intro="The software is the same in every case. What changes is who operates it."
      />

      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {hosting.map((offering, index) => (
          <li key={offering.id}>
            <Reveal delay={index * 0.05} className="h-full">
              <div
                className={cn(
                  'flex h-full flex-col gap-6 rounded-[var(--radius-card)] border p-6',
                  offering.featured
                    ? 'border-brand/50 bg-surface'
                    : 'border-border-decorative bg-surface/60',
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-xl">{offering.title}</h3>
                    <AvailabilityLabel availability={offering.availability} />
                  </div>
                  <p className="text-ink-muted text-sm leading-relaxed">
                    {offering.body}
                  </p>
                </div>

                <a
                  href={offering.action.href}
                  className={cn(
                    'mt-auto inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline',
                    offering.featured ? 'text-brand' : 'text-ink',
                  )}
                >
                  {offering.action.label}
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </a>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  )
}
