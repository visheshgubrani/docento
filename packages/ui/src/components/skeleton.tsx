import * as React from 'react'

import { cn } from '../lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      /**
       * Decorative by definition: a skeleton stands in for content that is on
       * its way, and announcing it would interrupt the reading of the page it
       * replaces. The status it implies belongs to a live region at the call
       * site, not here.
       */
      aria-hidden="true"
      className={cn('bg-surface-subtle animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
