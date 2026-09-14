import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Class name composition.
 *
 * `twMerge` last, so a caller's class wins over a component default instead of
 * the two both landing in the class list and the cascade deciding by
 * stylesheet order. Every primitive in this package takes a `className` for
 * exactly this reason.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
