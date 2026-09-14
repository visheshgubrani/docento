'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { EASE, REVEAL_QUERY } from './media'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/**
 * A path that draws itself once, when it comes into view.
 *
 * The relationship graphic in the developer section is a diagram, and a diagram
 * whose connections appear in the order they are meant to be read is doing more
 * work than an animation usually does. It happens once and it is optional: the
 * lines are visible from the start if motion is not allowed, and the labels
 * describe every relationship in words, so what the animation adds is sequence
 * rather than meaning.
 */
export function PathDraw({
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

      const paths = element.querySelectorAll<SVGPathElement>('[data-draw]')
      if (paths.length === 0) return

      const media = gsap.matchMedia()

      media.add(REVEAL_QUERY, () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: 'top 80%',
            once: true,
          },
        })

        timeline.fromTo(
          paths,
          { strokeDasharray: 1, strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 0.7,
            ease: EASE,
            stagger: 0.15,
          },
        )

        return () => timeline.kill()
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
