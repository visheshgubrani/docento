import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * A control boundary is `--border-control`, not the decorative border.
 *
 * The two are deliberately different colours, because a decorative hairline that
 * happens to be a 1.4:1 contrast against its surface is invisible as the outline
 * of a text field. `aria-invalid` swaps the boundary and the ring to the error
 * token, and the message that explains the error is the caller's job — colour is
 * never the only signal.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'border-border-control bg-surface text-ink flex h-11 w-full min-w-0 rounded-[var(--radius-control)] border px-3 py-2 text-base',
        'placeholder:text-ink-muted/80',
        'transition-colors duration-[150ms] outline-none',
        'focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25',
        'aria-invalid:border-error aria-invalid:ring-[3px] aria-invalid:ring-error/25',
        'disabled:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60',
        'file:text-ink file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
