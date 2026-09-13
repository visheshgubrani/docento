'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { HiMiniArrowRight } from 'react-icons/hi2'
import { SectionHeader } from './section-header'

export function StarterTemplatesSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          badge="Custom Frontend"
          title="Your academy, your rules."
          description="Whether you want a Netflix-style streaming site or a classic corporate training portal, we deliver a frontend that perfectly matches your brand identity."
          align="center"
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
        >
          <div className="relative mx-auto max-w-7xl">
            <div className="absolute inset-0 bg-gradient-to-b from-accent-500 to-accent-200 rounded-2xl -m-7" />

            <div className="relative bg-white rounded-xl shadow-2xl shadow-accent/10 border border-accent-200/50 overflow-hidden">
              <div className="relative bg-neutral-50">
                <div className="relative aspect-[16/10] md:aspect-[16/9] overflow-hidden">
                  <Image
                    src="/images/landing/starter.png"
                    alt="Custom academy preview"
                    fill
                    className="object-cover object-top"
                    sizes="(min-width: 1280px) 1152px, (min-width: 768px) calc(100vw - 48px), calc(100vw - 32px)"
                  />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center mt-14 gap-6"
        >
          <div className="flex flex-wrap justify-center gap-5">
            {[
              'Streaming layout',
              'Branded checkout',
              'Member dashboard',
              'Mobile-ready',
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 text-xs font-semibold font-inter bg-white border border-neutral-300 text-foreground/80 rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              asChild
              className="rounded-full font-inter font-medium bg-foreground text-white hover:bg-foreground/90"
            >
              <Link href="/contact" className="flex items-center gap-2">
                Book a Demo
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="rounded-full font-inter font-semibold text-foreground hover:bg-transparent hover:text-accent"
            >
              <Link href="/pricing" className="flex items-center gap-2">
                See Pricing
                <HiMiniArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
