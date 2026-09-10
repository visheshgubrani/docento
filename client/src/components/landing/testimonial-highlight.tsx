'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { FiStar } from 'react-icons/fi'

export function TestimonialHighlight() {
  return (
    <section className="w-full py-16 bg-white">
      <div className="mx-auto max-w-8xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="relative mx-auto bg-gradient-to-br from-violet-800/90 to-violet-950 rounded-3xl px-8 md:px-16 py-18 md:py-20 lg:py-24  border border-accent-200/50">
            <div className="max-w-5xl mx-auto w-full flex flex-col items-start gap-5">
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    className="size-6 fill-accent-foreground text-accent"
                  />
                ))}
              </div>

              <blockquote className="font-ibm text-2xl md:text-3xl text-white leading-relaxed">
                “Docento gave us the polished academy experience we wanted
                without the cost and chaos of hiring an agency. Our students get
                a premium, fully-branded platform, and our team gets a CMS that
                is genuinely easy to run.”
              </blockquote>

              <div className="mt-8 flex items-center gap-4">
                <div className="relative w-15 h-15 rounded-full overflow-hidden border bg-accent-200">
                  {/* Placeholder avatar */}
                  <Image
                    className="rounded-full"
                    width={100}
                    height={100}
                    src="/images/landing/testimonial.jpg"
                    alt="Sarah Johnson"
                  />
                  {/* <div className="absolute inset-0 bg-gradient-to-br from-accent-300 to-accent-500 flex items-center justify-center text-white font-semibold text-lg">
                                        SJ
                                    </div> */}
                </div>
                <div>
                  <div className="font-inter font-semibold text-white">
                    Sarah Johnson
                  </div>
                  <div className="font-inter text-white/60">
                    Founder, LearnFlow Academy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
