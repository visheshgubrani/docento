import type { SVGProps } from 'react'

import symbolPaths from './symbol-paths.json'

/**
 * The Docento symbol: two facing pages.
 *
 * The left page is a leaf — its outer edge curves away from the spine. The
 * right page is a bowl with a stem, which is what makes it read as a lowercase
 * "d" without the mark ever becoming a letter: the two shapes together still
 * read as an open book, and the gap between them is the spine.
 *
 * The geometry lives in `symbol-paths.json` because `scripts/build-wordmark.mjs`
 * writes the standalone SVGs from the same data. A second copy of these paths
 * is how a logo ends up with two versions that differ by two units.
 */
export const SYMBOL_VIEWBOX = symbolPaths.viewBox

export const SYMBOL_PATHS = symbolPaths.paths

/**
 * The symbol's ink box inside its square viewBox, in viewBox units. Anything
 * that has to line the mark up with something else — the horizontal lockup, a
 * favicon at 16px — needs these numbers rather than the box.
 */
export const SYMBOL_INK = symbolPaths.ink

export type SymbolProps = SVGProps<SVGSVGElement> & {
  /** Provide only when the symbol stands alone; decorative uses leave it out. */
  title?: string
}

export function SymbolMark({ className, title, ...props }: SymbolProps) {
  const labelled = Boolean(title)

  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      className={className}
      fill="currentColor"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...props}
    >
      {labelled ? <title>{title}</title> : null}
      <path d={SYMBOL_PATHS.leftPage} />
      <path d={SYMBOL_PATHS.bowl} />
      <path d={SYMBOL_PATHS.rightPage} />
    </svg>
  )
}
