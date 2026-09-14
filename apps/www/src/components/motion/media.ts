/**
 * The conditions under which motion is allowed to happen.
 *
 * Every animated component on this page asks one of these questions and does
 * nothing at all when the answer is no. That is the whole reduced-motion and
 * small-screen strategy: not a slower animation, but no animation — and, for the
 * product story, a different layout.
 *
 * `gsap.matchMedia()` takes these strings directly, so the same constant is used
 * by the CSS-driven layouts and by the JavaScript that drives them. A query
 * written in two places is a query that eventually differs in two places.
 */

/** Smooth scrolling: a desktop, a real pointer, and no stated preference against motion. */
export const SMOOTH_SCROLL_QUERY =
  '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/** The sticky product story: the same width and preference, pointer aside. */
export const STICKY_STORY_QUERY =
  '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'

/** Section introductions. Every size, unless the visitor has asked for less. */
export const REVEAL_QUERY = '(prefers-reduced-motion: no-preference)'

/**
 * How far below the top of the viewport an anchored section should land.
 *
 * The sticky header is 72px at this width; the rest is breathing room so a
 * heading is not flush against the bar. It matches `--anchor-offset` in the
 * design system's tokens, which is what native scrolling uses — the two must
 * agree, and this constant is the one Lenis is given.
 */
export const ANCHOR_OFFSET = 96

/**
 * One easing, everywhere.
 *
 * `power2.out` decelerates into place, which is what makes an entrance look like
 * something settling rather than something thrown. Anything bouncier reads as a
 * toy, which is the opposite of the register this page is written in.
 */
export const EASE = 'power2.out'
