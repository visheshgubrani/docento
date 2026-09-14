'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { cva } from 'class-variance-authority'
import { XIcon } from 'lucide-react'

import { cn } from '../lib/utils'

/**
 * Toasts: the transient confirmation of something that already happened.
 *
 * The rule this component encodes is that a toast reports, it does not ask. A
 * decision that needs an answer is a dialog; a toast that carries an "Undo"
 * action is the one exception, and it is bounded by the toast's own timeout,
 * which is why destructive actions do not rely on it alone.
 *
 * `ToastViewport` is a labelled live region, so a toast is announced — and the
 * viewport is positioned away from the two things it must never cover: the
 * focused control and the primary action of the page it appeared over.
 */
export type ToastVariant = 'default' | 'success' | 'error'

export type ToastProps = React.ComponentProps<typeof ToastPrimitive.Root> & {
  variant?: ToastVariant
}

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-[var(--radius-card)] border p-4 pr-10',
  {
    variants: {
      variant: {
        default: 'border-border-decorative bg-surface text-ink',
        success: 'border-success-border bg-success-background text-ink',
        error: 'border-error-border bg-error-background text-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function ToastProvider(
  props: React.ComponentProps<typeof ToastPrimitive.Provider>,
) {
  return <ToastPrimitive.Provider data-slot="toast-provider" {...props} />
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        'fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none',
        className,
      )}
      {...props}
    />
  )
}

function Toast({ className, variant, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        toastVariants({ variant }),
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="toast-title"
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  )
}

function ToastDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="toast-description"
      className={cn('text-ink-muted mt-1 text-sm leading-relaxed', className)}
      {...props}
    />
  )
}

function ToastAction({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        'border-border-control hover:bg-surface-subtle shrink-0 rounded-[var(--radius-control)] border px-3 py-1.5 text-sm font-medium',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-brand/35',
        className,
      )}
      {...props}
    />
  )
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
  /**
   * The close button is a real button with a name, in the tab order, rather than
   * a dismiss that only a pointer can reach.
   */
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn(
        'text-ink-muted hover:text-ink absolute top-3 right-3 rounded-md p-1',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-brand/35',
        className,
      )}
      {...props}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Dismiss</span>
    </ToastPrimitive.Close>
  )
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  toastVariants,
}
