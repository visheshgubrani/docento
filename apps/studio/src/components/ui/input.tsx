import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * A type alias rather than an empty interface.
 *
 * `interface X extends Y {}` says nothing Y does not, and the lint rule that
 * flags it is right: an empty declaration is a place for a field to be added by
 * accident, and a reader cannot tell it apart from one that was meant to have
 * fields and lost them.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
