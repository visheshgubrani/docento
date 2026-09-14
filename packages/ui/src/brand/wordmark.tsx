import type { SVGProps } from 'react'

import {
  WORDMARK_HEIGHT,
  WORDMARK_PATHS,
  WORDMARK_VIEWBOX,
  WORDMARK_WIDTH,
} from './wordmark-paths'

export type WordmarkProps = SVGProps<SVGSVGElement> & {
  /** Provide only when the wordmark stands alone; decorative uses leave it out. */
  title?: string
}

/**
 * The Docento wordmark.
 *
 * Outlines rather than live text: the wordmark is a drawing of Geist Sans
 * Medium with its own spacing, not a string that happens to be styled like it.
 * Rendering it as `<span>` would make the mark depend on a font being loaded and
 * would let it be re-spaced by any utility class that touched the parent.
 *
 * `currentColor` so the mark takes the colour of the surface it is on — which is
 * how the light and dark variants are one component rather than two assets.
 */
export function Wordmark({ className, title, ...props }: WordmarkProps) {
  const labelled = Boolean(title)

  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      width={WORDMARK_WIDTH}
      height={WORDMARK_HEIGHT}
      className={className}
      fill="currentColor"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...props}
    >
      {labelled ? <title>{title}</title> : null}
      {WORDMARK_PATHS.map((path) => (
        <path key={path.slice(0, 16)} d={path} />
      ))}
    </svg>
  )
}
