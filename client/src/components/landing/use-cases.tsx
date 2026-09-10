'use client'

import * as Headless from '@headlessui/react'
import { clsx } from 'clsx'
import {
  MotionValue,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  type HTMLMotionProps,
} from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import useMeasure, { type RectReadOnly } from 'react-use-measure'
import { HiMiniArrowLongRight } from 'react-icons/hi2'
import { SectionHeader } from './section-header'

const useCases = [
  {
    img: '/images/landing/use-case1.jpg',
    title: 'Online Courses',
    description: 'Launch your own course platform and sell knowledge to students worldwide.',
  },
  {
    img: '/images/landing/use-case2.jpg',
    title: 'Coaching & Mentorship',
    description: 'Deliver personalized learning experiences for your coaching clients.',
  },
  {
    img: '/images/landing/use-case3.jpg',
    title: 'Corporate Training',
    description: 'Train employees at scale with branded learning portals.',
  },
  {
    img: '/images/landing/use-case4.jpg',
    title: 'Internal Education',
    description: 'Build internal knowledge bases and onboarding programs.',
  },
  {
    img: '/images/landing/use-case5.jpg',
    title: 'SaaS Products',
    description: 'Add learning features to your existing SaaS product.',
  },
  {
    img: '/images/landing/use-case6.jpg',
    title: 'Creator Platforms',
    description: 'Power learning content for creator and membership sites.',
  },
]

function UseCaseCard({
  title,
  img,
  children,
  bounds,
  scrollX,
  ...props
}: {
  img: string
  title: string
  children: React.ReactNode
  bounds: RectReadOnly
  scrollX: MotionValue<number>
} & HTMLMotionProps<'div'>) {
  const ref = useRef<HTMLDivElement | null>(null)

  const computeOpacity = useCallback(() => {
    const element = ref.current
    if (!element || bounds.width === 0) return 1

    const rect = element.getBoundingClientRect()

    if (rect.left < bounds.left) {
      const diff = bounds.left - rect.left
      const percent = diff / rect.width
      return Math.max(0.5, 1 - percent)
    } else if (rect.right > bounds.right) {
      const diff = rect.right - bounds.right
      const percent = diff / rect.width
      return Math.max(0.5, 1 - percent)
    } else {
      return 1
    }
  }, [bounds.width, bounds.left, bounds.right])

  const opacity = useSpring(computeOpacity(), {
    stiffness: 154,
    damping: 23,
  })

  useLayoutEffect(() => {
    opacity.set(computeOpacity())
  }, [computeOpacity, opacity])

  useMotionValueEvent(scrollX, 'change', () => {
    opacity.set(computeOpacity())
  })

  return (
    <motion.div
      ref={ref}
      style={{ opacity }}
      {...props}
      className="relative flex aspect-[4/5] w-80 shrink-0 snap-start scroll-ml-[var(--scroll-padding)] flex-col justify-end overflow-hidden rounded-2xl sm:w-96 cursor-pointer"
    >
      <Image
        alt={title}
        src={img}
        fill
        sizes="(max-width: 640px) 320px, 384px"
        className="absolute opacity-90 inset-0 object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/90 via-black/50 to-transparent ring-1 ring-gray-950/10 ring-inset"
      />
      <figure className="relative p-6 sm:p-8">
        <blockquote>
          <p className="text-base sm:text-lg text-white font-semibold font-inter leading-relaxed">
            {children}
          </p>
        </blockquote>
        <figcaption className="mt-4 border-t border-white/20 pt-5">
          <p className="text-xl font-ibm sm:text-2xl font-semibold">
            <span className="bg-gradient-to-r from-[#fff1be] from-28% via-[#ee87cb] via-70% to-[#b060ff] bg-clip-text text-transparent">
              {title}
            </span>
          </p>
        </figcaption>
      </figure>
    </motion.div>
  )
}

function CallToAction() {
  return (
    <div>
      <p className="max-w-sm text-sm text-foreground/90 font-inter leading-relaxed">
        Whether you&apos;re an educator, business, or developer, Docento adapts to your unique learning needs.
      </p>
      <div className="mt-3">
        <Link
          href="/use-cases"
          className="inline-flex items-center gap-2 text-sm font-medium font-inter text-accent hover:text-accent/80 transition-colors"
        >
          Start building for free
          <HiMiniArrowLongRight className="size-5" />
        </Link>
      </div>
    </div>
  )
}

export function UseCasesSection() {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const { scrollX } = useScroll({ container: scrollRef })
  const [setReferenceWindowRef, bounds] = useMeasure()
  const [activeIndex, setActiveIndex] = useState(0)

  useMotionValueEvent(scrollX, 'change', (x) => {
    if (!scrollRef.current) return
    const gap = 32
    const width = (scrollRef.current.children[0] as HTMLElement).offsetWidth
    setActiveIndex(Math.floor(x / (width + gap)))
  })

  function scrollTo(index: number) {
    if (!scrollRef.current) return
    const gap = 32
    const width = (scrollRef.current.children[0] as HTMLElement).offsetWidth
    scrollRef.current.scrollTo({
      left: (width + gap) * index,
      behavior: 'smooth' // Add this explicitly
    })
  }


  return (
    <section className="w-full overflow-hidden py-20 md:py-28 bg-accent-50/80">
      <div className="mx-auto max-w-7xl px-4 md:px-6" ref={setReferenceWindowRef}>
        <SectionHeader
          badge="Use Cases"
          title="Perfect for every learning business"
          description="Whether you're an educator, business, or developer, Docento adapts to your unique needs."
          align="center"
        />
      </div>

      <div
        ref={scrollRef}
        className={clsx([
          'mt-16 flex gap-8',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth',

        ])}
        style={{
          paddingLeft: 'max(1.5rem, calc((100vw - 80rem) / 2))',
          paddingRight: 'max(1.5rem, calc((100vw - 80rem) / 2))',
          scrollPaddingLeft: 'max(1.5rem, calc((100vw - 80rem) / 2))',
        }}
      >
        {useCases.map((useCase, index) => (
          <UseCaseCard
            key={index}
            title={useCase.title}
            img={useCase.img}
            bounds={bounds}
            scrollX={scrollX}
            onClick={() => scrollTo(index)}
          >
            {useCase.description}
          </UseCaseCard>
        ))}
        <div className="w-[32rem] shrink-0 sm:w-[54rem]" />
      </div>

      {/* CTA and Navigation Dots */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 mt-10">
        <div className="flex items-center justify-between">
          {/* CTA on left */}
          <CallToAction />

          {/* Navigation dots on right */}
          <div className="hidden sm:flex sm:gap-2">
            {useCases.map((useCase, index) => (
              <Headless.Button
                key={index}
                onClick={() => scrollTo(index)}
                data-active={activeIndex === index ? true : undefined}
                aria-label={`Scroll to ${useCase.title}`}
                className={clsx(
                  'size-2.5 rounded-full border border-transparent bg-neutral-300 transition-all duration-300',
                  'data-[active]:bg-accent data-[active]:scale-125 data-[hover]:bg-neutral-400',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
