'use client'

import { useEffect, useState } from 'react'
import { Button, TooltipRoot } from '@docento/ui'
import { CheckIcon, CopyIcon } from 'lucide-react'

/**
 * Copy to clipboard, with feedback that a screen reader also receives.
 *
 * Two details that matter more than the button. The success state is announced
 * through a live region rather than only shown — a colour change and a tick are
 * invisible to someone who cannot see them. And the button is a real `<button>`
 * with a name, so it is reachable and operable from the keyboard, unlike the
 * clickable `<span>` this pattern usually ships as.
 *
 * The code itself remains selectable if the clipboard API is unavailable, which
 * is the whole fallback: nothing about reading the example depends on this
 * component working.
 */
export function CopyButton({
  value,
  label = 'Copy',
}: {
  value: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      /**
       * A refused clipboard is not an error worth a dialog: the code is on the
       * screen and can be selected. Doing nothing visible is the honest
       * response, and it is why this is not surfaced as a failure state.
       */
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <TooltipRoot content={copied ? 'Copied' : 'Copy to clipboard'}>
        <Button
          variant="secondary"
          size="sm"
          onClick={copy}
          className="border-border-decorative bg-surface-subtle/80"
        >
          {copied ? (
            <CheckIcon aria-hidden="true" className="size-4" />
          ) : (
            <CopyIcon aria-hidden="true" className="size-4" />
          )}
          {copied ? 'Copied' : label}
        </Button>
      </TooltipRoot>

      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'The example has been copied to the clipboard.' : ''}
      </span>
    </span>
  )
}
