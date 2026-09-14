'use client'

import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '../lib/utils'

/**
 * The accordion.
 *
 * Radix handles the disclosure semantics — each header is a button with
 * `aria-expanded` and `aria-controls`, and the panel is a region. The chevron is
 * decoration; the state is in the button's accessible name and its
 * `aria-expanded`, which is what the accessibility target actually depends on.
 *
 * ## Where this is not used
 *
 * The marketing site's FAQ, which uses the native `<details>` element instead: a
 * Radix panel's content is unreadable until script opens it, and the marketing page
 * is written so that every answer survives a visitor whose JavaScript never ran.
 * That is a deliberate exception with a reason, not an oversight — inside the
 * product, where the surface is interactive by definition, this is the right
 * primitive.
 */
function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitive.Root>,
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-border-decorative border-b', className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'text-ink flex flex-1 items-start justify-between gap-4 py-5 text-left text-base font-medium',
          'transition-colors duration-[150ms] outline-none hover:text-brand',
          'focus-visible:ring-[3px] focus-visible:ring-brand/35 rounded-sm',
          "[&[data-state=open]>svg]:rotate-180 [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-ink-muted mt-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden"
      {...props}
    >
      <div
        className={cn(
          'text-ink-muted max-w-[68ch] pb-5 text-base leading-relaxed',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
