'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { EASE, REVEAL_QUERY } from './media'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/**
 * A section introduction, revealed once.
 *
 * Two rules this component exists to enforce:
 *
 * 1. **Nothing is hidden by CSS.** The starting state is applied by GSAP at
 *    runtime, so a visitor whose JavaScript fails, or who has not hydrated yet,
 *    sees the content rather than a blank page. A `.reveal { opacity: 0 }` class
 *    is the single most common way a marketing page becomes unreadable without
 *    JavaScript.
 * 2. **It happens once.** `once: true` kills the trigger after it fires, so
 *    scrolling back up does not replay the entrance. Motion that repeats on every
 *    pass turns a page into a fairground.
 *
 * The travel is 12px and the duration is 400ms, which is enough to be felt at the
 * edge of vision and not enough to be watched.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const element = scope.current
      if (!element) return

      const media = gsap.matchMedia()

      media.add(REVEAL_QUERY, () => {
        gsap.from(element, {
          y: 12,
          opacity: 0,
          duration: 0.4,
          delay,
          ease: EASE,
          scrollTrigger: {
            trigger: element,
            start: 'top 88%',
            once: true,
          },
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
