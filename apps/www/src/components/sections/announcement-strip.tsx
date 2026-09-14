import { ArrowRightIcon } from 'lucide-react'

import { announcement } from '@/content/landing'
import { site } from '@/lib/site'

/**
 * The release notice.
 *
 * A strip rather than a banner: one line, no dismissal, no decoration. The
 * repository is pre-alpha, and a visitor who reads only the hero should still
 * know that, so this is above everything and says so in the first three words.
 */
export function AnnouncementStrip() {
  return (
    <div className="border-border-decorative bg-surface-subtle border-b">
      <div className="marketing-container flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-center text-xs">
        <span className="text-ink-muted">{announcement.text}</span>
        <a
          href={site.links.roadmap}
          className="text-brand inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
        >
          {announcement.cta}
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}
