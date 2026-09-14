import { ChevronDownIcon } from 'lucide-react'

import { Section, SectionIntro } from '@/components/section'
import { faq } from '@/content/landing'

/**
 * The questions, answered without optimism.
 *
 * The answers follow the roadmap rather than the sales page: payments are not
 * available, managed cloud is planned, AI is optional and not built yet, and SCORM
 * and SSO are post-beta. A visitor who reads all eight should be able to tell
 * exactly what they would get today — which is the only way this page can be
 * trusted about anything else.
 *
 * ## Why this is `<details>` and not the shared accordion primitive
 *
 * The design system ships a Radix accordion, and this page deliberately does not
 * use it. Radix renders a closed panel's content unreadable until JavaScript opens
 * it, which would make eight of the most important paragraphs on the page — is it
 * usable, what does it cost, can I sell courses — invisible to a visitor whose
 * script failed or never loaded. The native disclosure element opens without any
 * JavaScript at all, is keyboard operable, is announced correctly, and needs no
 * ARIA to be a disclosure.
 *
 * The trade is an animation: `<details>` cannot be animated open without script.
 * That is the correct trade on a marketing page, and the Radix accordion remains
 * the right primitive inside the product, where the surface is already interactive.
 */
export function FaqSection() {
  return (
    <Section id="faq" labelledBy="faq-heading">
      <SectionIntro
        id="faq-heading"
        eyebrow="Questions"
        title="What you would be getting today."
        intro="Answered from the roadmap, including the parts that are not built."
      />

      <div className="mx-auto mt-10 max-w-[800px]">
        {faq.map((item) => (
          <details
            key={item.question}
            className="group border-border-decorative border-b"
          >
            <summary className="text-ink hover:text-brand flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-left transition-colors duration-[150ms] [&::-webkit-details-marker]:hidden">
              <span className="font-display text-lg">{item.question}</span>
              <ChevronDownIcon
                aria-hidden="true"
                className="text-ink-muted mt-0.5 size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="text-ink-muted max-w-[68ch] pb-5 text-base leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </Section>
  )
}
