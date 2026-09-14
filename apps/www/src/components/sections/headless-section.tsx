import { ArrowRightIcon } from 'lucide-react'

import { Section } from '@/components/section'
import { headless } from '@/content/landing'

import { CodePanel } from '../previews/code-panel'
import { RelationshipGraphic } from '../previews/relationship-graphic'

/**
 * The developer section: the page's single deep-forest band.
 *
 * One dark section on an otherwise light page, at the point where the audience
 * changes — this is the part written for someone who is going to write code
 * against the product. The band is a section rather than a theme: it overrides
 * the variables it needs, which is why nothing in it needs a `dark:` variant.
 *
 * The code is real and typechecked; the result beside it is typed as the API's own
 * `CatalogCourse`. See `lib/highlight.ts` for how the two stay honest.
 */
export function HeadlessSection() {
  return (
    <Section id="developers" labelledBy="developers-heading" band>
      {/**
       * `min-w-0` on both columns, and it is load-bearing.
       *
       * A grid item's automatic minimum size is its content's min-content width, so
       * a column holding a code sample wider than a phone pushes the whole page
       * sideways — the page scrolls, and the sample's own `overflow-x-auto` never
       * gets the chance to scroll within itself. On a 320px viewport this was 542px
       * of document.
       */}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-4">
            <p className="text-xs tracking-[0.08em] uppercase opacity-70">
              {headless.eyebrow}
            </p>
            <h2
              id="developers-heading"
              className="text-section font-display max-w-[22ch] text-balance"
            >
              {headless.headline}
            </h2>
            <p className="text-body-lg max-w-[56ch] leading-relaxed opacity-80">
              {headless.body}
            </p>
          </header>

          <ul className="flex flex-col gap-5">
            {headless.points.map((point) => (
              <li key={point.title} className="flex flex-col gap-1">
                <h3 className="text-base font-semibold">{point.title}</h3>
                <p className="max-w-[52ch] text-sm leading-relaxed opacity-75">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>

          <RelationshipGraphic />

          <div className="flex flex-wrap items-center gap-6">
            <a
              href={headless.actions.guide.href}
              className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
            >
              {headless.actions.guide.label}
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </a>
            <a
              href={headless.actions.source.href}
              className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
            >
              {headless.actions.source.label}
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <CodePanel />
          <p className="text-xs leading-relaxed opacity-70">
            {headless.originNote}
          </p>
        </div>
      </div>
    </Section>
  )
}
