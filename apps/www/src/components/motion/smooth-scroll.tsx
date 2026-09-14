'use client'

import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type Lenis from 'lenis'

import { ANCHOR_OFFSET, SMOOTH_SCROLL_QUERY } from './media'

type SmoothScrollControls = {
  /** Pause smooth scrolling — used while a sheet or dialog is open. */
  stop: () => void
  /** Resume it. */
  start: () => void
  /**
   * Bring an element into view.
   *
   * Routed through Lenis when it is running, so a programmatic scroll uses the
   * same easing and the same header offset as an anchor link. When it is not —
   * a phone, reduced motion — this falls back to `scrollIntoView`, and
   * `scroll-margin-top` in the design system's base layer provides the same
   * offset natively.
   */
  scrollTo: (target: HTMLElement) => void
}

const noop = () => {}

/**
 * The controls are shared through context so a component can pause scrolling
 * without knowing whether smooth scrolling is even active — on a phone, or under
 * reduced motion, both calls are no-ops.
 */
const SmoothScrollContext = createContext<SmoothScrollControls>({
  stop: noop,
  start: noop,
  scrollTo: (target) => target.scrollIntoView(),
})

export function useSmoothScroll() {
  return useContext(SmoothScrollContext)
}

/** Pauses smooth scrolling while `active` is true. */
export function useSmoothScrollLock(active: boolean) {
  const { stop, start } = useSmoothScroll()

  useEffect(() => {
    if (active) stop()
    else start()
  }, [active, start, stop])
}

/**
 * Smooth scrolling, on the terms the design system sets.
 *
 * ## Why Lenis at all
 *
 * Because the product story is a scroll-driven sequence, and a sequence reads
 * better when the scroll has weight. That is the entire justification, and it is
 * why this is scoped as narrowly as it is: the marketing page only, a desktop
 * with a fine pointer only, and never when the visitor has asked for less motion.
 * Touch devices keep their native scrolling, which is more responsive than
 * anything that imitates it.
 *
 * ## The integration is the documented one
 *
 * Lenis is driven by GSAP's ticker and publishes its position to ScrollTrigger.
 * Getting this wrong is subtle — ScrollTrigger keeps its own idea of where the
 * page is, and a stale one makes every scroll-linked animation lag or snap — so
 * the pairing is exactly what Lenis's documentation prescribes: register
 * `ScrollTrigger.update` as the scroll listener, drive `lenis.raf` from
 * `gsap.ticker`, and turn off lag smoothing so a frame hitch is not smoothed into
 * a delay.
 *
 * ## Cleanup is not optional
 *
 * The ticker callback, the scroll listener and the instance all go on unmount. A
 * Lenis instance left alive keeps a requestAnimationFrame loop running for a page
 * that no longer exists, and in a client-side navigation that is a leak that gets
 * worse each time the visitor comes back.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const instance = useRef<Lenis | null>(null)

  const controls = useMemo<SmoothScrollControls>(
    () => ({
      stop: () => instance.current?.stop(),
      start: () => instance.current?.start(),
      scrollTo: (target) => {
        const lenis = instance.current

        if (lenis) lenis.scrollTo(target, { offset: -ANCHOR_OFFSET })
        else target.scrollIntoView()
      },
    }),
    [],
  )

  useEffect(() => {
    const eligible = window.matchMedia(SMOOTH_SCROLL_QUERY)
    let cancelled = false
    let dispose = noop

    const start = async () => {
      /**
       * The libraries are imported only when they will be used: on a phone, or
       * under reduced motion, neither GSAP's ticker nor Lenis is on the page at
       * all.
       */
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] =
        await Promise.all([
          import('lenis'),
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ])

      if (cancelled) return

      gsap.registerPlugin(ScrollTrigger)

      const lenis = new Lenis({
        duration: 0.8,
        /**
         * In-page anchors are left to Lenis while it is running, with the
         * header's height subtracted, so a link does not land under the sticky
         * bar. Native scrolling uses `scroll-margin-top` for the same result.
         */
        anchors: { offset: -ANCHOR_OFFSET },
      })

      instance.current = lenis

      const onScroll = () => ScrollTrigger.update()
      const tick = (time: number) => lenis.raf(time * 1000)

      lenis.on('scroll', onScroll)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)

      dispose = () => {
        lenis.off('scroll', onScroll)
        gsap.ticker.remove(tick)
        // 500ms and 33 frames are GSAP's own defaults; leaving smoothing off
        // would change how every other animation on the page handles a hitch.
        gsap.ticker.lagSmoothing(500, 33)
        lenis.destroy()
        instance.current = null
      }
    }

    const sync = () => {
      if (eligible.matches) {
        void start()
        return
      }

      dispose()
      dispose = noop
    }

    sync()
    eligible.addEventListener('change', sync)

    return () => {
      cancelled = true
      eligible.removeEventListener('change', sync)
      dispose()
    }
  }, [])

  return (
    <SmoothScrollContext.Provider value={controls}>
      {children}
    </SmoothScrollContext.Provider>
  )
}
