'use client'

import { motion, type Variants } from 'framer-motion'
import { IoSettingsSharp } from 'react-icons/io5'
import { HiMiniClock } from 'react-icons/hi2'
import { FaPaintBrush } from 'react-icons/fa'
import { RiGlobeFill } from 'react-icons/ri'
import { SectionHeader } from './section-header'

const benefits = [
  {
    icon: IoSettingsSharp,
    title: 'Skip LMS Complexity',
    description:
      'Skip rigid course platforms and expensive agency timelines. We set up the custom frontend while you stay focused on your content.',
  },
  {
    icon: HiMiniClock,
    title: 'Launch Faster',
    description:
      'We handle all the technical heavy lifting so you can focus on your students.',
  },
  {
    icon: RiGlobeFill,
    title: 'Built for Scale',
    description:
      'Launch with confidence on a platform built to support growing audiences, multiple offers, and a polished student journey.',
  },
  {
    icon: FaPaintBrush,
    title: 'Build Your Brand',
    description:
      'Own the full student experience with a white-labeled academy that looks, feels, and converts like your brand.',
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

export function BenefitsSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-warm-bg/50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          badge="Why Docento"
          title="Everything you need to launch a premium academy"
          description="Focus on your curriculum, audience, and growth. We handle the setup behind the scenes so your platform feels bespoke from day one."
          align="center"
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative flex flex-col items-start p-6 rounded-md border border-neutral-400/80 bg-white hover:border-accent-300 hover:shadow-lg hover:shadow-accent-100/20 transition-all duration-300"
            >
              <benefit.icon className="w-7 h-7 text-foreground/90" />

              <h3 className="mt-5 font-inter font-semibold text-lg text-foreground">
                {benefit.title}
              </h3>

              <p className="mt-2 text-sm text-foreground/70 font-inter leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
