'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@docento/ui'

import { ClaimRow } from '@/components/availability-label'
import type { StoryChapter } from '@/content/landing'

import { STICKY_STORY_QUERY } from './media'
import { useSmoothScroll } from './smooth-scroll'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/**
 * The product story: three chapters against one product viewport.
 *
 * ## Layout is CSS; the active chapter is the only state
 *
 * On a large screen the chapter list and the viewport are two columns of one
 * grid, with the viewport sticky inside the story. Below that width — and under
 * reduced motion — the same markup becomes a stack, because the panel wrapper is
 * `display: contents` and the panels use `order` to sit after their own chapter.
 * There is one copy of every panel in the DOM either way, so nothing is announced
 * twice and there is no second tree to keep in step.
 *
 * The consequence worth stating: **with JavaScript disabled the page renders the
 * stacked version**, with all three chapters and all three previews visible. The
 * scroll-driven version is the enhancement, not the content.
 *
 * ## Scrolling does not talk over the screen reader
 *
 * Scroll position changes the active chapter, and if that were announced, a
 * screen reader user scrolling the page would hear a running commentary on
 * chapters they are not reading. So the live region is written *only* from
 * `select()`, which is the function the chapter buttons and the arrow keys call.
 * That is the whole of the rule: explicit selection announces, scrolling does not.
 */
export function StorySequence({
  chapters,
  panels,
}: {
  chapters: StoryChapter[]
  panels: React.ReactNode[]
}) {
  const scope = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const { scrollTo } = useSmoothScroll()

  /**
   * `sticky` is the CSS answer to "is this the two-column layout and is the panel
   * stacked", asked in JavaScript because the ScrollTriggers must not exist
   * otherwise. It starts false, so the server renders the stacked layout that
   * works without JavaScript.
   */
  const [sticky, setSticky] = useState(false)
  const [active, setActive] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  const ids = useMemo(() => chapters.map((chapter) => chapter.id), [chapters])

  useEffect(() => {
    const query = window.matchMedia(STICKY_STORY_QUERY)
    const sync = () => setSticky(query.matches)

    sync()
    query.addEventListener('change', sync)

    return () => query.removeEventListener('change', sync)
  }, [])

  useGSAP(
    () => {
      if (!sticky || !scope.current) return

      const elements = Array.from(
        scope.current.querySelectorAll<HTMLElement>('[data-story-chapter]'),
      )

      const media = gsap.matchMedia()

      media.add(STICKY_STORY_QUERY, () => {
        const triggers = elements.map((element, index) =>
          ScrollTrigger.create({
            trigger: element,
            /**
             * The band is a little above centre: a chapter becomes current as its
             * heading passes the middle of the viewport, which is where a reader
             * would say they had started it.
             */
            start: 'top 45%',
            end: 'bottom 45%',
            onToggle: (self) => {
              if (self.isActive) setActive(index)
            },
          }),
        )

        return () => triggers.forEach((trigger) => trigger.kill())
      })

      return () => media.revert()
    },
    { dependencies: [sticky], scope },
  )

  const select = useCallback(
    (index: number) => {
      const chapter = chapters[index]
      setActive(index)
      /**
       * Written here and nowhere else — see the note above about scrolling.
       */
      setAnnouncement(`${chapter.number}. ${chapter.title}.`)

      const target = scope.current?.querySelector<HTMLElement>(
        `[data-story-chapter="${ids[index]}"]`,
      )

      if (target) scrollTo(target)
    },
    [chapters, ids, scrollTo],
  )

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: chapters.length - 1,
    }

    const next = moves[event.key]
    if (next === undefined) return

    event.preventDefault()

    const bounded = Math.max(0, Math.min(chapters.length - 1, next))
    buttons.current[bounded]?.focus()
  }

  return (
    <div ref={scope} className="relative">
      <div
        className={cn(
          'flex flex-col',
          /**
           * The two-column layout exists only where the story is scroll-driven:
           * a desktop and no stated preference against motion.
           */
          'lg:motion-safe:grid lg:motion-safe:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:motion-safe:gap-16',
        )}
      >
        {chapters.map((chapter, index) => {
          const isActive = !sticky || active === index

          return (
            <Fragment key={chapter.id}>
              <div
                data-story-chapter={chapter.id}
                data-active={isActive ? 'true' : 'false'}
                className={cn(
                  'border-border-decorative relative flex scroll-mt-[var(--anchor-offset)] flex-col gap-4 border-t pt-8 pb-4',
                  'lg:motion-safe:col-start-1 lg:motion-safe:pt-12 lg:motion-safe:pb-16',
                )}
              >
                {/**
                 * The active marker is a rule in the margin rather than a dimmed
                 * paragraph. Dimming the inactive chapters looked well until it was
                 * measured: the body text at 55% opacity falls below AA, and a
                 * chapter that has not been read yet is exactly the text a visitor is
                 * about to read.
                 */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'bg-brand absolute top-8 bottom-6 left-[-1rem] w-0.5 rounded-full transition-opacity duration-300',
                    isActive ? 'opacity-100' : 'opacity-0',
                    'hidden lg:motion-safe:block',
                  )}
                />

                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      'chapter-number transition-colors duration-300',
                      sticky && isActive && 'text-brand',
                    )}
                  >
                    {chapter.number}
                  </span>
                  <h3 className="text-title text-ink font-semibold">
                    {sticky ? (
                      <button
                        type="button"
                        ref={(element) => {
                          buttons.current[index] = element
                        }}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => select(index)}
                        onKeyDown={(event) => onKeyDown(event, index)}
                        className={cn(
                          'text-left transition-colors duration-[150ms] hover:text-brand',
                          'focus-visible:ring-[3px] focus-visible:ring-brand/35 rounded-sm outline-none',
                          isActive && 'text-brand',
                        )}
                      >
                        {chapter.title}
                      </button>
                    ) : (
                      chapter.title
                    )}
                  </h3>
                </div>

                <p className="text-ink-muted text-body-lg max-w-[46ch] leading-relaxed">
                  {chapter.body}
                </p>

                <ul className="mt-2 flex flex-col gap-2">
                  {chapter.details.map((detail) => (
                    <li key={detail.value}>
                      <ClaimRow availability={detail.availability}>
                        {detail.value}
                      </ClaimRow>
                    </li>
                  ))}
                </ul>
              </div>

              {/**
               * The panel is the chapter's own sibling in the DOM — chapter, then
               * its preview, three times. That is the small-screen layout for free,
               * with no `order` to keep in step and no difference between reading
               * order and visual order.
               *
               * On a large screen the three panels are placed in one grid cell to
               * the right, overlap, and each sticks inside the story's rows, so the
               * active chapter's preview stays beside it while the others scroll
               * past. `self-start` keeps a short panel at the top of its grid area
               * rather than stretching it over the whole cell.
               */}
              <div
                data-story-panel={chapter.id}
                data-active={isActive ? 'true' : 'false'}
                className={cn(
                  'mt-6 mb-10 flex flex-col gap-3',
                  'lg:motion-safe:sticky lg:motion-safe:top-[var(--anchor-offset)] lg:motion-safe:col-start-2 lg:motion-safe:row-start-1 lg:motion-safe:row-end-4 lg:motion-safe:mt-0 lg:motion-safe:mb-0 lg:motion-safe:self-start',
                  'transition-opacity duration-300',
                  sticky &&
                    !isActive &&
                    'lg:motion-safe:invisible lg:motion-safe:opacity-0',
                )}
              >
                <p className="preview-label">Interface preview</p>
                {panels[index]}
              </div>
            </Fragment>
          )
        })}
      </div>

      {/**
       * The announcement. Rendered always so the region exists before it is
       * needed — a live region inserted together with its text is frequently not
       * announced at all.
       */}
      <p
        role="status"
        aria-live="polite"
        aria-label="Selected chapter"
        className="sr-only"
      >
        {announcement}
      </p>
    </div>
  )
}
