import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/utils'

/**
 * An inline message about the state of the thing next to it.
 *
 * The variants pair a status colour with a neutral body: a warning whose entire
 * text is amber is a message that disappears in a screenshot, in print, and for
 * anyone who cannot distinguish it from a success. The icon and the words carry
 * the meaning; the colour agrees with them.
 */
const alertVariants = cva(
  'relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-[var(--radius-card)] border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'border-border-decorative bg-surface-subtle text-ink',
        info: 'border-info-border bg-info-background text-ink',
        success: 'border-success-border bg-success-background text-ink',
        warning: 'border-warning-border bg-warning-background text-ink',
        error: 'border-error-border bg-error-background text-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const alertIconColour: Record<string, string> = {
  default: 'text-ink-muted',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

export type AlertProps = React.ComponentProps<'div'> &
  VariantProps<typeof alertVariants>

function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="status"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertIcon({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & { variant?: AlertProps['variant'] }) {
  return (
    <span
      data-slot="alert-icon"
      aria-hidden="true"
      /**
       * The variant is passed rather than inferred from a parent attribute: an
       * icon cannot read the alert's props, and a colour chosen by looking up an
       * attribute at render time is a colour that silently falls back the first
       * time the markup changes.
       */
      className={cn(
        'mt-0.5 [&_svg]:size-4',
        alertIconColour[variant ?? 'default'],
        className,
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="alert-title"
      className={cn('text-ink font-medium', className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-ink-muted leading-relaxed', className)}
      {...props}
    />
  )
}

export { Alert, AlertIcon, AlertTitle, AlertDescription, alertVariants }
