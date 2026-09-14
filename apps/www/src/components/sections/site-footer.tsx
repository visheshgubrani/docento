import { Lockup } from '@docento/ui'

import { footerGroups } from '@/content/landing'

/**
 * The footer.
 *
 * Three groups of links that all work, and a large quiet wordmark as the closing
 * visual. The wordmark is `aria-hidden`: it is the same name that is already in
 * the header and at the top of this page, and a screen reader being read the brand
 * twice at the end of the document is noise rather than information.
 */
export function SiteFooter() {
  return (
    <footer className="border-border-decorative border-t">
      <div className="marketing-container flex flex-col gap-12 py-16">
        <div className="grid gap-10 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <nav key={group.title} aria-labelledby={`footer-${group.title}`}>
              <h2
                id={`footer-${group.title}`}
                className="text-ink text-sm font-semibold"
              >
                {group.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.label}`}>
                    <a
                      href={link.href}
                      className="text-ink-muted hover:text-ink text-sm transition-colors duration-[150ms]"
                      {...(link.external
                        ? { rel: 'noreferrer', target: '_blank' }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <Lockup height={44} className="text-surface-subtle" />
          <p className="text-ink-muted max-w-[70ch] text-xs leading-relaxed">
            Docento is pre-alpha software, built in the open. Everything on this
            page describes the repository as it is today, and anything that is
            planned says so.
          </p>
        </div>
      </div>
    </footer>
  )
}
