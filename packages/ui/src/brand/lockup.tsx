import { cn } from '../lib/utils'
import { SYMBOL_INK, SYMBOL_VIEWBOX, SymbolMark } from './symbol'
import { Wordmark } from './wordmark'

/**
 * The symbol's ink is inset inside its 34×34 box, so a lockup that set both
 * halves to the same CSS height would render the symbol smaller than the
 * wordmark it sits next to. The inset comes from the same JSON the asset
 * generator reads, so the React lockup and the exported SVG agree.
 */
const SYMBOL_BOX = Number(SYMBOL_VIEWBOX.split(' ')[3])
const SYMBOL_INK_CENTRE = SYMBOL_INK.y + SYMBOL_INK.height / 2
const SYMBOL_INK_HEIGHT = SYMBOL_INK.height

export type LockupProps = {
  /** Optical height of the wordmark's capitals, in pixels. */
  height?: number
  className?: string
  /** Provide only when the lockup stands alone; decorative uses leave it out. */
  title?: string
}

/**
 * The horizontal lockup: symbol and wordmark at one optical size.
 *
 * Both halves are sized so their *ink* is `height` tall, not their boxes — the
 * difference between a lockup that looks drawn and one that looks assembled.
 */
export function Lockup({ height = 20, className, title }: LockupProps) {
  const symbolBox = (SYMBOL_BOX / SYMBOL_INK_HEIGHT) * height
  const inkOffset =
    (SYMBOL_BOX / 2 - SYMBOL_INK_CENTRE) * (symbolBox / SYMBOL_BOX)

  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{ gap: Math.round(height * 0.24) }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <SymbolMark
        style={{
          height: symbolBox,
          width: 'auto',
          transform: `translateY(${inkOffset}px)`,
        }}
      />
      <Wordmark style={{ height, width: 'auto' }} />
    </span>
  )
}
