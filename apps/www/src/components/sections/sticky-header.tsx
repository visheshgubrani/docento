'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@docento/ui'

/**
 * The sticky header, and the border that appears when it sticks.
 *
 * The border is not decoration: a translucent header over ivory text needs an edge
 * once it is floating over content, and its absence is the difference between a
 * header and a smudge. It is driven by an IntersectionObserver on a one-pixel
 * sentinel rather than by a scroll listener — the browser reports the transition
 * once instead of the script reading scroll position on every frame, and the
 * trigger fires exactly when the page begins to scroll rather than at a hand-picked
 * threshold.
 *
 * The sentinel is inside this component so the two cannot drift apart: it has to
 * sit immediately above the header in the flow, and nothing else knows that.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const element = sentinel.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="h-px w-full" />
      <header
        data-stuck={stuck ? 'true' : 'false'}
        className={cn(
          'bg-canvas/85 sticky top-0 z-40 backdrop-blur',
          'border-b transition-colors duration-200',
          stuck ? 'border-border-decorative' : 'border-transparent',
        )}
      >
        {children}
      </header>
    </>
  )
}
