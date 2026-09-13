'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { FiArrowRight } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { GridPattern } from '@/components/GridPattern'
import { noiseOverlayStyles } from '@/components/noise-pattern'

export function HeroSection() {
  return (
    <section className="relative w-full overflow-visible -mt-[60px] pt-[60px]">
      {/* Grid Pattern Background - starts from top of viewport */}
      <div className="absolute inset-x-0 -top-[60px] h-[944px] overflow-hidden bg-gradient-to-b from-neutral-50 pointer-events-none">
        <GridPattern
          className="absolute inset-0 h-full w-full fill-neutral-100 stroke-neutral-950/5 pointer-events-auto"
          style={{
            maskImage:
              'linear-gradient(to bottom left, white 40%, transparent 50%)',
            WebkitMaskImage:
              'linear-gradient(to bottom left, white 40%, transparent 50%)',
          }}
          yOffset={-330}
          interactive
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 md:px-6 pt-20 pb-16 md:pt-24 md:pb-24">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-flex items-center rounded-full bg-accent-100 border border-accent-400 px-4 py-1.5 text-sm font-semibold text-violet-700 font-inter mb-6">
              The All-in-One Creator Platform.
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-serif text-5xl md:text-6xl lg:text-7xl text-foreground max-w-4xl leading-[1.1]"
          >
            Launch your custom-branded academy <br />
            without <span className="text-accent">writing</span> a line of code.
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 text-lg md:text-xl text-foreground/70 font-inter leading-[1.6] max-w-3xl "
          >
            Tired of generic course platforms that hijack your brand? Get a
            fully bespoke, premium learning platform for your students, powered
            by our world-class course management backend.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-8"
          >
            <Button
              asChild
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-inter font-semibold w-56 h-11 text-base transition-all duration-300"
            >
              <Link href="/contact" className="flex items-center gap-2">
                Book a Demo
                <FiArrowRight className="size-4 group-hover:translate-x-0.5 transition-all duration-300 ease-in-out" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 md:mt-20"
        >
          <div className="relative mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-b from-accent-300 to-accent-50">
              <div
                className="absolute inset-0 opacity-30 mix-blend-overlay"
                style={noiseOverlayStyles}
              />
              <div className="relative px-[min(10%,2rem)] py-[min(10%,2rem)]">
                <div className="relative overflow-hidden rounded-md ring-1 ring-black/10 bg-white">
                  <Image
                    src="/images/landing/hero-img.png"
                    alt="Docento Course Builder"
                    width={1400}
                    height={900}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
