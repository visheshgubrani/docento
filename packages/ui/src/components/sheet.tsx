'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { XIcon } from 'lucide-react'

import { cn } from '../lib/utils'

/**
 * A sheet is a dialog that slides in from an edge.
 *
 * Used for the mobile navigation and for a small screen's curriculum outline,
 * where the content is a view of the page rather than a question about it. It is
 * the same Radix dialog underneath, so focus trapping and restoration are the
 * dialog's, not a second implementation's.
 *
 * ## Background scrolling
 *
 * Radix locks the page while a sheet is open. When smooth scrolling is active
 * that lock has to be mirrored on the Lenis instance too, or the page keeps
 * moving behind the sheet — the provider exposes `stop()`/`start()` for exactly
 * this and the call site is responsible for pairing them.
 */
const sheetVariants = cva(
  'bg-surface border-border-decorative fixed z-50 flex flex-col gap-4 border p-6 transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 rounded-t-[var(--radius-frame)] border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetContent({
  className,
  children,
  side = 'right',
  title,
  description,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    /** Required: a sheet with no accessible name is a sheet nobody can leave. */
    title: string
    description?: string
  }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-[rgb(21_26_23/0.45)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        <DialogPrimitive.Title className="text-ink text-base font-semibold">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description
          className={cn(description ? 'text-ink-muted text-sm' : 'sr-only')}
        >
          {description ?? title}
        </DialogPrimitive.Description>

        <DialogPrimitive.Close
          data-slot="sheet-close-button"
          className={cn(
            'text-ink-muted hover:bg-surface-subtle hover:text-ink absolute top-4 right-4 rounded-md p-1',
            'outline-none focus-visible:ring-[3px] focus-visible:ring-brand/35',
          )}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, sheetVariants }
