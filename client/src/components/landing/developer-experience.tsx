'use client'

import { motion, type Variants } from 'framer-motion'
import { SectionHeader } from './section-header'

const workflowSteps = [
  {
    step: 'Step 1',
    title: 'We design and deploy your student portal',
    description:
      'We create a custom-branded academy experience for your students and launch it for you.',
  },
  {
    step: 'Step 2',
    title: 'You run everything from the Docento CMS',
    description:
      'Manage courses, students, and payments from one clean backend built for everyday use.',
  },
  {
    step: 'Step 3',
    title: 'Everything stays in sync while you keep the upside',
    description:
      'Your content, students, and payments stay connected automatically, and you keep 100% of your profits.',
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export function DeveloperExperienceSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-warm-bg/50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          badge="How It Works"
          title="A premium academy without the agency overhead"
          description="We handle the platform build and technical delivery. You stay focused on content, customers, and growth."
          align="center"
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {workflowSteps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative flex flex-col items-start p-6 rounded-md border border-neutral-400/80 bg-white hover:border-accent-300 hover:shadow-lg hover:shadow-accent-100/20 transition-all duration-300"
            >
              <span className="inline-flex items-center rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                {step.step}
              </span>

              <h3 className="mt-5 font-inter font-semibold text-lg text-foreground">
                {step.title}
              </h3>

              <p className="mt-2 text-sm text-foreground/70 font-inter leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
