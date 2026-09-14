'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import { EASE, REVEAL_QUERY } from './media'

/**
 * The hero's product frame, settling into place.
 *
 * One movement, 600ms, 16px, with the opacity barely changing. The restraint is
 * the design: the frame is the largest thing on the page, and a large element
 * that animates conspicuously is a page that feels like it is loading rather than
 * one that has arrived.
 *
 * The headline and the buttons above it are not wrapped in this and never
 * animate. If the hero's text waited for an entrance sequence, the page's most
 * important content would be gated behind JavaScript that may not run.
 */
export function HeroSettle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const element = scope.current
      if (!element) return

      const media = gsap.matchMedia()

      media.add(REVEAL_QUERY, () => {
        gsap.from(element, {
          y: 16,
          opacity: 0.9,
          duration: 0.6,
          ease: EASE,
        })
      })

      return () => media.revert()
    },
    { scope },
  )

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  )
}
