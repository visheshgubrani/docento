import { Button } from '@docento/ui'

import { hero } from '@/content/landing'
import { site } from '@/lib/site'

import { AcademyFrame } from '../previews/academy-frame'
import { AuthoringPanel } from '../previews/authoring-panel'
import { HeroSettle } from '../motion/hero-settle'

/**
 * The hero.
 *
 * ## The headline never waits for anything
 *
 * It is server-rendered, it is not inside an animation wrapper, and it has no
 * opacity set by CSS. The only motion in the hero is the product frame settling
 * 600ms after it mounts, and if that never happens the page is complete. This is
 * the compromise the whole motion strategy is built on: the things a visitor came
 * to read are static, and the things that illustrate them can move.
 *
 * ## The composition
 *
 * A large learner frame with a smaller authoring panel overlapping its lower-left
 * edge — the signature image, and the reason the panel is a preview of the course
 * behind the lesson being read. On a phone it becomes a purpose-built crop of the
 * same components: the lesson, then a compact strip of the authoring side. Two
 * layouts of one component tree rather than two screenshots, so a change to either
 * cannot leave the other behind.
 */
export function Hero() {
  return (
    <section
      className="anchor-target pb-16 lg:pb-24"
      aria-labelledby="hero-heading"
    >
      <div className="marketing-container flex flex-col gap-12 pt-16 lg:gap-20 lg:pt-24">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1
            id="hero-heading"
            className="text-hero font-display text-ink max-w-[900px] text-balance"
          >
            A home for{' '}
            <em className="text-brand font-normal italic">{hero.emphasis}</em>.
          </h1>

          <p className="text-ink-muted text-body-lg measure leading-relaxed">
            {hero.standfirst}
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            <Button asChild size="marketing">
              <a href={hero.actions.primary.href}>
                {hero.actions.primary.label}
              </a>
            </Button>
            <Button asChild size="marketing" variant="secondary">
              <a href={hero.actions.secondary.href}>
                {hero.actions.secondary.label}
              </a>
            </Button>
          </div>

          <ul className="text-ink-muted flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
            {hero.supporting.map((item, index) => (
              <li key={item} className="flex items-center gap-3">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                {item}
              </li>
            ))}
          </ul>

          <p className="text-ink-muted text-xs">
            {hero.availabilityNote}{' '}
            <a
              href={site.links.roadmap}
              className="text-brand underline underline-offset-4"
            >
              Read the roadmap
            </a>
          </p>
        </div>

        <HeroSettle className="relative">
          {/**
           * The label is part of the design, not an apology: the repository is
           * pre-alpha, these compositions are hand-built, and a visitor is told so
           * before they decide what they are looking at.
           */}
          <p className="preview-label mb-3 text-center">Interface preview</p>

          {/**
           * The frame is offset to the right and the authoring panel overlaps its
           * lower-left corner, which is the composition the design system asks for:
           * the lesson a learner reads, with the screen it was written on.
           *
           * Below the large breakpoint the two stack, because an overlap at 390px
           * is not a composition — it is two unreadable things on top of each
           * other. The container's bottom padding is what reserves the room the
           * panel takes when it is absolutely positioned.
           */}
          <div className="lg:ml-[16%] lg:pb-32">
            <AcademyFrame compact />
          </div>

          <div className="mt-6 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:w-[46%]">
            <AuthoringPanel />
          </div>
        </HeroSettle>
      </div>
    </section>
  )
}
