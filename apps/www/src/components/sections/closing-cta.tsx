import { Button } from '@docento/ui'

import { closing } from '@/content/landing'

/**
 * The last thing said on the page.
 *
 * Two actions and no third: self-hosting, which is what a visitor who is
 * convinced should do, and the API, which is what the one who is not should look
 * at. There is no newsletter field, because there is no backend behind this site —
 * a form that silently did nothing would be worse than no form.
 */
export function ClosingCta() {
  return (
    <section
      className="border-border-decorative border-t"
      aria-labelledby="closing-heading"
    >
      <div className="marketing-container section-y flex flex-col items-center gap-6 text-center">
        <h2
          id="closing-heading"
          className="text-section font-display max-w-[20ch] text-balance"
        >
          {closing.headline}
        </h2>

        <p className="text-ink-muted text-body-lg measure">{closing.body}</p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <Button asChild size="marketing">
            <a href={closing.actions.primary.href}>
              {closing.actions.primary.label}
            </a>
          </Button>
          <Button asChild size="marketing" variant="secondary">
            <a href={closing.actions.secondary.href}>
              {closing.actions.secondary.label}
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
