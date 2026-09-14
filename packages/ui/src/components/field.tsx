import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * A field is the whole control: label, input, description, error.
 *
 * ## Why the error is wired here and not at each call site
 *
 * An error message that is rendered but not referenced by `aria-describedby` is
 * an error a screen reader user does not receive. `FieldError` takes the id it
 * should be referenced by, and `FieldControl` (below) is where a caller marks the
 * control invalid — so the association is a prop, not a convention somebody has
 * to remember.
 */
function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        'text-ink flex items-center justify-between gap-2 text-sm font-medium',
        'data-[disabled=true]:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-ink-muted text-sm leading-relaxed', className)}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-error"
      /**
       * `role="alert"` so a validation message is announced when it appears,
       * and the text is duplicated by the icon rather than replaced by one.
       */
      role="alert"
      className={cn(
        'text-error-foreground flex items-start gap-2 text-sm leading-relaxed',
        className,
      )}
      {...props}
    />
  )
}

export { Field, FieldLabel, FieldDescription, FieldError }
