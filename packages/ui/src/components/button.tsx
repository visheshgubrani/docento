'use client'

import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/utils'

/**
 * The button.
 *
 * ## Heights are part of the design system, not of a call site
 *
 * `default` is an application control (40px) and `marketing` is the 48px primary
 * action the landing page uses. Touch targets are at least 44px wherever a
 * control is reachable by thumb, which is why `sm` is reserved for dense areas —
 * a table row, a toolbar — and never for a primary action.
 *
 * ## Focus is drawn, not inherited
 *
 * Every variant sets its own focus ring against its own background, because a
 * single ring colour is either invisible on the brand-coloured button or too
 * loud on the ghost one. Nothing here relies on the browser default.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)]',
    'font-medium transition-colors duration-[150ms] outline-none',
    'focus-visible:ring-[3px] focus-visible:ring-brand/35 focus-visible:border-brand',
    'disabled:pointer-events-none disabled:opacity-55',
    'aria-disabled:pointer-events-none aria-disabled:opacity-55',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[1.15em] [&_svg]:shrink-0",
    'aria-busy:cursor-progress',
  ],
  {
    variants: {
      variant: {
        default: 'bg-brand text-on-brand hover:bg-brand/90 active:bg-brand/95',
        secondary:
          'border border-border-decorative bg-surface text-ink hover:bg-surface-subtle active:bg-surface-subtle',
        outline:
          'border border-border-control bg-transparent text-ink hover:bg-surface-subtle',
        ghost: 'bg-transparent text-ink hover:bg-surface-subtle',
        link: 'text-brand underline-offset-4 hover:underline h-auto p-0',
        destructive:
          'bg-error text-white hover:bg-error/90 focus-visible:ring-error/35 focus-visible:border-error',
      },
      size: {
        sm: 'h-9 px-3 text-[0.8125rem]',
        default: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-sm',
        marketing: 'h-12 px-6 text-base',
        icon: 'size-10',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      /**
       * A button inside a form submits it by default, which is almost never what
       * the caller meant. `type` is still overridable.
       */
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
