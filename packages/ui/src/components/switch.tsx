'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

/**
 * A switch, for a setting that takes effect immediately.
 *
 * The distinction that matters is the one between a switch and a checkbox: a
 * switch says "this is on", and flipping it is the change itself. An authoring
 * form's "save" button needs a checkbox, because nothing has happened until it is
 * pressed. Using a switch there implies a write that has not happened yet.
 *
 * ## The touch target is larger than the control
 *
 * The visual switch is 24px tall, which is the right size next to a label and the
 * wrong size for a thumb. The pseudo-element extends the hit area to 44px without
 * changing what is drawn — so the rule is met by the pointer, not by the picture.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'transition-colors duration-[150ms] outline-none',
        'data-[state=checked]:bg-brand data-[state=unchecked]:bg-border-control',
        'focus-visible:ring-[3px] focus-visible:ring-brand/35 focus-visible:border-brand',
        'disabled:cursor-not-allowed disabled:opacity-55',
        "after:absolute after:-inset-2.5 after:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-canvas pointer-events-none block size-5 rounded-full transition-transform duration-150',
          'data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
