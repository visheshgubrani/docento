'use client'

import { useEffect, useState } from 'react'
import { Button } from '@docento/ui'

/**
 * A theme switch for the component reference.
 *
 * The marketing site is light-only by design: it launches in one palette, with a
 * single dark band, and a visitor to a marketing page does not expect a theme
 * preference to be remembered. Studio, Learn and Docs do get a switch, which is
 * why the tokens have a dark set at all — and this page is where that set is
 * reviewed before those applications use it.
 *
 * The class is applied to `<html>` so it exercises the same cascade the
 * applications use. It is applied in an effect rather than on the server, so this
 * page cannot leak a `.dark` into the marketing page's HTML.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    return () => document.documentElement.classList.remove('dark')
  }, [dark])

  return (
    <div className="flex items-center gap-3">
      <span className="text-ink-muted text-sm">
        Previewing the {dark ? 'dark' : 'light'} tokens
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setDark((value) => !value)}
        aria-pressed={dark}
      >
        Show {dark ? 'light' : 'dark'}
      </Button>
    </div>
  )
}
