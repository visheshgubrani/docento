'use client'

import { SectionHeader, StaticSectionHeader } from '@/components/landing'
import { GridPattern } from '@/components/GridPattern'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

const values = [
  {
    name: 'Learning Should Feel Effortless',
    description:
      'We design Docento to stay out of the way so creators and teams can focus on what truly matters: teaching, sharing, and growing.',
  },
  {
    name: 'Build With Care',
    description:
      "Every feature is shaped with intention. We only create what brings real clarity and makes someone's day a little easier.",
  },
  {
    name: 'Freedom to Create',
    description:
      'Everyone teaches differently. We give you the flexibility to shape your learning experience exactly the way you imagine it.',
  },
  {
    name: 'People Over Platforms',
    description:
      'Behind every lesson is a story. We build tools that respect those stories and support the humans behind them.',
  },
  {
    name: 'Keep Things Simple',
    description:
      'Technology should feel calm, not overwhelming. Simplicity guides every choice we make at Docento.',
  },
  {
    name: 'Security Built In',
    description:
      'Your data and your learners deserve full protection. We follow strong, modern security practices so you can build with confidence.',
  },
]

export default function AboutPage() {
  return (
    <div className="bg-white w-full overflow-hidden">
      <main className="isolate w-full mx-auto">
        {/* Hero section */}
        <div className="relative w-full mx-auto isolate py-16 md:py-22">
          {/* Grid Pattern Background */}
          <div className="absolute -z-[1] inset-0 overflow-hidden pointer-events-none">
            <GridPattern
              className="absolute inset-0 h-full w-full fill-accent-100/30 stroke-neutral-950/3"
              style={{
                maskImage:
                  'linear-gradient(to bottom left, white 40%, transparent 50%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom left, white 40%, transparent 50%)',
              }}
              yOffset={-200}
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 left-1/2 -z-10 transform-gpu overflow-hidden blur-3xl lg:ml-24 xl:ml-48"
          >
            <div
              style={{
                clipPath:
                  'polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)',
              }}
              className="aspect-801/1036 w-200.25 bg-linear-to-tr from-[#ffb5d4] to-[#bebaf9] opacity-30"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-1/2 -z-10 transform-gpu overflow-hidden blur-3xl"
          >
            <div
              style={{
                clipPath:
                  'polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)',
              }}
              className="aspect-801/1036 w-200.25 bg-linear-to-tr from-[#fec6dd] to-[#fcfcdd] opacity-30"
            />
          </div>
          <div className="relative w-full flex flex-col gap-5 px-4 items-center justify-center mx-auto max-w-4xl">
            <StaticSectionHeader
              badge="About Us"
              title="A Simple Beginning"
              description="Docento began when we realized how difficult it was to build modern learning experiences with traditional LMS platforms. They were slow, restrictive, and always forced us into designs we did not want."
              align="center"
              className="mb-9"
            />
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center font-noto text-lg max-w-3xl text-pretty text-neutral-600 sm:text-lg/7"
            >
              We wanted something flexible and clean. Something that let
              creators and teams build learning products without fighting the
              tool itself. That idea grew into Docento, a headless LMS that
              stays out of the way and gives you full control.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center font-noto text-lg max-w-3xl text-pretty text-neutral-600 sm:text-lg/7"
            >
              Today, Docento helps anyone create learning platforms that look
              and feel like their own. Whether it is courses, onboarding, or
              training, our goal is to make the process simple, modern, and
              enjoyable.
            </motion.p>
          </div>
        </div>

        {/* Feature section */}
        <div className="relative mx-auto mt-12 max-w-7xl px-6 lg:px-8 pb-16 md:pb-24">
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-1/2 -z-10 transform-gpu overflow-hidden blur-3xl"
          >
            <div
              style={{
                clipPath:
                  'polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)',
              }}
              className="aspect-801/1036 w-200.25 bg-linear-to-tr from-[#f6b2ce] to-[#ffffd1] opacity-30"
            />
          </div>
          <SectionHeader
            badge="Our Values"
            title="The Values Behind Docento"
            description="The simple beliefs that guide our work and our decisions."
            align="center"
          />
          <motion.dl
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 text-base/7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3"
          >
            {values.map((value) => (
              <motion.div key={value.name} variants={itemVariants}>
                <dt className="font-semibold text-gray-900">{value.name}</dt>
                <dd className="mt-1 text-gray-700 font-ibm">
                  {value.description}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </main>
    </div>
  )
}
