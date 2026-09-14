import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/utils'

/**
 * A badge is a label, never the only carrier of meaning.
 *
 * The status variants exist so availability ("Available", "Planned") and state
 * ("Draft", "Published") are not encoded in colour alone: the convention in this
 * design system is that a badge's text says the thing and its colour agrees with
 * it.
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand text-on-brand',
        neutral: 'border-border-decorative bg-surface-subtle text-ink-muted',
        outline: 'border-border-decorative bg-transparent text-ink',
        success:
          'border-success-border bg-success-background text-success-foreground',
        warning:
          'border-warning-border bg-warning-background text-warning-foreground',
        error: 'border-error-border bg-error-background text-error-foreground',
        info: 'border-info-border bg-info-background text-info-foreground',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
