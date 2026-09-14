'use client'

import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

/**
 * A label is a label: it is associated with a control by `htmlFor`, not by
 * being placed next to it. The asterisk convention for required fields is not
 * used here — a required field says "required" in its own text, because a symbol
 * read aloud by a screen reader tells the listener nothing.
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'text-ink flex items-center gap-2 text-sm leading-none font-medium select-none',
        'group-data-[disabled=true]:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
