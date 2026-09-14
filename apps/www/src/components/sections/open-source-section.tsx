import { ArrowUpRightIcon } from 'lucide-react'

import { Section, SectionIntro } from '@/components/section'
import { openSource } from '@/content/landing'

/**
 * The open-source section.
 *
 * The repository panel lists the real top level of this repository, which makes it
 * the one place on the page a visitor can check against something they have: the
 * paths are true, and the licence links point at the files themselves.
 *
 * There are no stars, no contributor avatars, no adoption figures and no
 * testimonials. Not because they would be unflattering, but because they would be
 * fabricated — the honest version of this section is a description of what the
 * licence permits and a link to the thing itself.
 */
export function OpenSourceSection() {
  return (
    <Section id="open-source" labelledBy="open-source-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <SectionIntro
            id="open-source-heading"
            eyebrow="Open source"
            title={openSource.headline}
            intro={openSource.body}
          />

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">The licence, accurately</h3>
            <p className="text-ink-muted max-w-[62ch] text-sm leading-relaxed">
              <span className="text-ink font-medium">
                {openSource.licence.application}
              </span>{' '}
              — the application, the domain, the worker and both frontends.{' '}
              <span className="text-ink font-medium">
                {openSource.licence.permissive}
              </span>{' '}
              {openSource.licence.reason}
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {openSource.licence.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-brand inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {link.label}
                    <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {Object.values(openSource.actions).map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="text-ink inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                {action.label}
                <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
              </a>
            ))}
          </div>
        </div>

        <div className="edge-sheet overflow-hidden self-start">
          <div className="border-border-decorative flex items-center justify-between border-b px-5 py-3">
            <span className="font-mono text-xs text-ink-muted">docento/</span>
            <span className="text-ink-muted text-xs">main</span>
          </div>

          <ul className="divide-border-decorative flex flex-col divide-y">
            {openSource.tree.map((entry) => (
              <li
                key={entry.path}
                className="flex items-center justify-between gap-4 px-5 py-2.5 font-mono text-xs"
              >
                <span className="text-ink flex items-center gap-2">
                  <span aria-hidden="true" className="text-ink-muted">
                    └
                  </span>
                  {entry.path}
                </span>
                <span className="text-ink-muted">{entry.note}</span>
              </li>
            ))}
          </ul>

          <div className="border-border-decorative border-t px-5 py-4">
            <p className="text-ink-muted text-xs leading-relaxed">
              One schema, one query path, and one authorization function. The
              architecture decision records in the repository explain why each
              of those constraints exists.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
