'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HiMiniArrowRight } from 'react-icons/hi2'
import { GridPattern } from '@/components/GridPattern'

export function CTASection() {
  return (
    <section className="w-full pt-10 pb-20 bg-white">
      <div className="mx-auto max-w-8xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="relative mx-auto bg-gradient-to-br from-violet-800/95 to-violet-950 rounded-3xl px-8 md:px-16 py-16 md:py-20 lg:py-24 border border-accent-200/50 overflow-hidden">
            {/* Grid Pattern Background */}
            <GridPattern
              className="absolute inset-0 h-full w-full fill-violet-800/55 stroke-violet-700/50"
              style={{
                maskImage:
                  'radial-gradient(ellipse at center, white 40%, transparent 80%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse at center, white 40%, transparent 80%)',
              }}
              yOffset={0}
            />

            <div className="relative max-w-4xl mx-auto text-center">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.2] text-white">
                Ready to launch your <br className="hidden sm:block" />
                <span className="tracking-wide text-accent-400">
                  branded academy{' '}
                </span>
                with Docento?
              </h2>

              <p className="mt-6 text-lg md:text-xl text-white/80 font-inter max-w-xl mx-auto">
                We handle the platform build and setup so you can focus on your
                content, students, and sales.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
                <Button
                  asChild
                  className="rounded-full bg-white text-violet-950 hover:bg-white/90 font-inter font-bold px-10 w-58 h-12 text-base transition-all duration-300"
                >
                  <Link href="/contact" className="flex items-center gap-2">
                    Book a Demo
                    <HiMiniArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-full font-inter font-bold text-white hover:underline hover:text-white h-12 text-base transition-all duration-300"
                >
                  <Link href="/pricing" className="flex items-center gap-2">
                    See Pricing
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
