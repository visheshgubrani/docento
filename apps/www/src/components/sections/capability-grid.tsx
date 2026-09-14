import { ArrowRightIcon } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@docento/ui'

import { AvailabilityLabel } from '@/components/availability-label'
import { Reveal } from '@/components/motion/reveal'
import { Section, SectionIntro } from '@/components/section'
import { capabilities, roadmapCallout } from '@/content/landing'

import { capabilityDetails } from '../previews/capability-details'

/**
 * The capability overview.
 *
 * A 2×3 grid, which is the one place on this page where a grid is right — six
 * comparable things, each needing no more than a sentence. Every card carries a
 * small piece of real interface rather than an icon, because an icon restates the
 * title while a quiz choice, an upload row or a certificate line demonstrates it.
 *
 * The AI roadmap callout sits below the grid and is deliberately quieter than
 * everything above it: it is the one item here that does not exist yet, and the
 * page's rule is that planned work never gets the same presentation as shipped
 * work.
 */
export function CapabilityGrid() {
  return (
    <Section
      id="capabilities"
      labelledBy="capabilities-heading"
      className="pt-0"
    >
      <SectionIntro
        id="capabilities-heading"
        eyebrow="The essentials"
        title="The essentials, thoughtfully connected."
        intro="The parts of a course business that are usually six plugins and a spreadsheet, built once and built to work together."
      />

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((capability, index) => {
          const Detail = capabilityDetails[capability.detail]

          return (
            <li key={capability.id}>
              <Reveal delay={(index % 3) * 0.05} className="h-full">
                <Card className="h-full gap-0 transition-[border-color,transform] duration-[150ms] hover:border-brand/40 hover:-translate-y-0.5">
                  <CardHeader className="gap-3 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-ink text-base font-semibold">
                        {capability.title}
                      </h3>
                      {/**
                       * The badge is for what needs one. Five cards that all say
                       * "Available today" and one that says "Interface preview" is a
                       * page where the difference is harder to find than it would be
                       * with no badges at all — so the shipped case says nothing here
                       * and the section's introduction says it once.
                       */}
                      {capability.availability === 'available' ? null : (
                        <AvailabilityLabel
                          availability={capability.availability}
                        />
                      )}
                    </div>
                    <p className="text-ink-muted text-sm leading-relaxed">
                      {capability.body}
                    </p>
                  </CardHeader>

                  <CardContent className="mt-auto">
                    <Detail />
                  </CardContent>
                </Card>
              </Reveal>
            </li>
          )
        })}
      </ul>

      <div className="border-border-decorative mt-12 flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-ink-muted text-xs tracking-[0.08em] uppercase">
              {roadmapCallout.eyebrow}
            </span>
            <h3 className="font-display text-lg">{roadmapCallout.title}</h3>
            <AvailabilityLabel availability={roadmapCallout.availability} />
          </div>
          <p className="text-ink-muted max-w-[70ch] text-sm leading-relaxed">
            {roadmapCallout.body}
          </p>
        </div>

        <a
          href={roadmapCallout.action.href}
          className="text-brand inline-flex shrink-0 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          {roadmapCallout.action.label}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </a>
      </div>
    </Section>
  )
}
