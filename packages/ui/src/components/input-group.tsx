'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * A control with an attached action — an input with a copy button, a search
 * field with a submit.
 *
 * The action is inside the boundary, so the two read as one control. Focus is
 * drawn on the group rather than the input, because the button is what a
 * keyboard user reaches second and a ring that jumps between the halves looks
 * like two controls.
 */
function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        'border-border-control bg-surface flex w-full items-stretch overflow-hidden rounded-[var(--radius-control)] border',
        'focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/25',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-input"
      className={cn(
        'text-ink placeholder:text-ink-muted/80 h-10 w-full min-w-0 bg-transparent px-3 outline-none',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupAction({
  className,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      data-slot="input-group-action"
      type="button"
      className={cn(
        'border-border-decorative text-ink hover:bg-surface-subtle flex items-center gap-1.5 border-l px-3 text-sm font-medium',
        'outline-none focus-visible:bg-surface-subtle',
        'disabled:opacity-55',
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupInput, InputGroupAction }
