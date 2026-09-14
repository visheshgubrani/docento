import { cn } from '@docento/ui'

/**
 * The section shell and its introduction.
 *
 * Two things every section on this page has and should not have to restate: the
 * anchor offset that keeps a heading clear of the sticky header, and the spacing
 * rhythm the design system sets (112px desktop, 80px tablet, 56px mobile).
 *
 * The chapter number and the eyebrow are part of the page-edge motif — a printed
 * page numbers its sections — and they are decorative: the heading carries the
 * meaning, and the number is `aria-hidden` so a screen reader does not read "zero
 * three" before every title.
 */
export function Section({
  id,
  children,
  className,
  band = false,
  labelledBy,
}: {
  id: string
  children: React.ReactNode
  className?: string
  /** The single dark band on the page. */
  band?: boolean
  labelledBy: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('section-y anchor-target', band && 'band-dark', className)}
    >
      <div className="marketing-container">{children}</div>
    </section>
  )
}

export function SectionIntro({
  id,
  number,
  eyebrow,
  title,
  intro,
  align = 'start',
  className,
}: {
  id: string
  number?: string
  eyebrow?: string
  title: React.ReactNode
  intro?: React.ReactNode
  align?: 'start' | 'center'
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow || number ? (
        <p className="text-ink-muted flex items-center gap-3 text-xs tracking-[0.08em] uppercase">
          {number ? (
            <span aria-hidden="true" className="chapter-number">
              {number}
            </span>
          ) : null}
          {eyebrow}
        </p>
      ) : null}

      <h2
        id={id}
        className="text-section font-display text-ink max-w-[24ch] text-balance"
      >
        {title}
      </h2>

      {intro ? (
        <p className="text-ink-muted text-body-lg max-w-[62ch] leading-relaxed">
          {intro}
        </p>
      ) : null}
    </header>
  )
}
