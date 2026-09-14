'use client'

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

/**
 * Tabs.
 *
 * Radix handles the roving tabindex and the arrow-key behaviour, which is the
 * part of a tab list that is easy to get wrong by hand. The visual treatment is
 * a fine rule with the selected tab marked by the brand colour and a rule of its
 * own — selection is never colour alone, because the marker is part of it.
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'border-border-decorative flex items-center gap-1 border-b',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'text-ink-muted -mb-px border-b-2 border-transparent px-3 py-2.5 text-sm font-medium',
        'transition-colors duration-[150ms] outline-none',
        'hover:text-ink focus-visible:ring-[3px] focus-visible:ring-brand/35',
        'data-[state=active]:border-brand data-[state=active]:text-brand',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-55',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'outline-none focus-visible:ring-[3px] focus-visible:ring-brand/35',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
