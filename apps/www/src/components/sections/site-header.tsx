import { Button, Lockup } from '@docento/ui'
import { GithubIcon } from 'lucide-react'

import { navigation } from '@/content/landing'
import { site } from '@/lib/site'

import { MobileNav } from './mobile-nav'
import { StickyHeader } from './sticky-header'

/**
 * The header.
 *
 * 72px on a desktop and 64px on a phone, with the lockup on the left, the
 * section links in the middle and the two destinations that leave the page on
 * the right.
 *
 * The in-page links are anchors, and the ones that go elsewhere are real links
 * with `rel="noreferrer"`. There is no client-side router involved in either,
 * which is why anchor navigation, history restoration and keyboard scrolling all
 * work without this component doing anything about them.
 *
 * The wordmark is `aria-hidden` and the link's accessible name is text ("Docento,
 * home"), because a screen reader given an SVG lockup tends to read the path data
 * or nothing at all.
 */
export function SiteHeader() {
  return (
    <StickyHeader>
      <div className="marketing-container flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <a
          href="#main"
          className="text-ink rounded-sm"
          aria-label="Docento, back to the top"
        >
          <Lockup height={19} />
        </a>

        <nav
          aria-label="Sections"
          className="hidden items-center gap-8 lg:flex"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-ink-muted hover:text-ink text-sm font-medium transition-colors duration-[150ms]"
              {...(item.href.startsWith('http')
                ? { rel: 'noreferrer', target: '_blank' }
                : {})}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={site.repository}
            rel="noreferrer"
            target="_blank"
            className="text-ink-muted hover:text-ink hover:bg-surface-subtle rounded-[var(--radius-control)] p-2 transition-colors duration-[150ms]"
          >
            <GithubIcon aria-hidden="true" className="size-5" />
            <span className="sr-only">Docento on GitHub</span>
          </a>

          <Button asChild size="default" className="hidden sm:inline-flex">
            <a href={site.links.selfHost}>Start self-hosting</a>
          </Button>

          <MobileNav />
        </div>
      </div>
    </StickyHeader>
  )
}
