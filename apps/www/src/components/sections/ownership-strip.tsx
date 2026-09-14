import { Reveal } from '../motion/reveal'
import { ownership } from '@/content/landing'

/**
 * The ownership statement.
 *
 * Three columns with fine separators and no icons — the quietest section on the
 * page, on purpose. It is also where a logo wall would normally go, and it is
 * worth saying why it does not: there are no customers yet, and a row of invented
 * or borrowed logos would be the single most dishonest thing this page could do.
 * Three verifiable principles are worth more than three unearned proofs.
 */
export function OwnershipStrip() {
  return (
    <section
      className="border-border-decorative border-y"
      aria-labelledby="ownership-heading"
    >
      {/**
       * The strip has no visible title by design, but it needs one in the outline:
       * three `h3`s following the hero's `h1` would skip a level, and a reader
       * navigating by heading would find the reasons for owning the product filed
       * under nothing.
       */}
      <h2 id="ownership-heading" className="sr-only">
        What you own
      </h2>

      <div className="marketing-container">
        <ul className="grid divide-y divide-border-decorative md:grid-cols-3 md:divide-x md:divide-y-0">
          {ownership.map((item, index) => (
            <li
              key={item.title}
              className="flex flex-col gap-2 py-10 md:px-8 md:first:pl-0 md:last:pr-0"
            >
              <Reveal delay={index * 0.05}>
                <h3 className="text-ink text-base font-semibold">
                  {item.title}
                </h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  {item.body}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
