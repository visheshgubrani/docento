import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names, with later Tailwind utilities winning.
 *
 * `clsx` alone concatenates, so `cn('p-2', 'p-4')` would emit both and leave the
 * outcome to stylesheet order rather than to the caller's intent. `twMerge`
 * resolves the conflict, which is what makes a component's `className` prop
 * able to override its own defaults — the single reason this is here rather
 * than `clsx` being used directly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
