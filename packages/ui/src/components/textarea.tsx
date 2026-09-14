import * as React from 'react'

import { cn } from '../lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border-control bg-surface text-ink flex min-h-24 w-full rounded-[var(--radius-control)] border px-3 py-2 text-base',
        'placeholder:text-ink-muted/80',
        'transition-colors duration-[150ms] outline-none',
        'focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25',
        'aria-invalid:border-error aria-invalid:ring-[3px] aria-invalid:ring-error/25',
        'disabled:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60',
        'field-sizing-content resize-y',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
