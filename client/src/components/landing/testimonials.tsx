'use client'

import { motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import { SectionHeader } from './section-header'

const testimonials = [
  {
    quote:
      'We were quoted more than a full agency project just to get the branded academy we wanted. Docento gave us that premium experience without the overhead.',
    author: 'Raj Krishnamurthy',
    // role: "CTO, SkillBridge",
    image: '/images/landing/testimonial01.jpg',
  },
  {
    quote:
      "Our students finally feel like they are learning inside our brand, not someone else\'s course marketplace. That shift alone changed how premium our offer feels.",
    author: 'Sofia Andersson',
    // role: "Engineering Lead, EduTech Pro",
    image: '/images/landing/testimonial02.jpg',
  },
  {
    quote:
      'The backend is simple enough for our operations team to run every day, but the frontend feels completely custom. That balance is exactly what we needed.',
    author: 'Kofi Mensah',
    // role: "Founder, CreatorAcademy",
    image: '/images/landing/testimonial03.jpg',
  },
  {
    quote:
      'We launched faster than expected because Docento handled the technical build for us. We stayed focused on content, onboarding, and sales.',
    author: 'Yuki Tanaka',
    // role: "Product Manager, LearnPro",
    image: '/images/landing/testimonial04.jpg',
  },
  {
    quote:
      'Every part of the student experience feels tailored to us, from the landing pages to the learning dashboard. It finally feels like a real academy business.',
    author: 'Carlos Mendez',
    // role: "CEO, Knowledge Hub",
    image: '/images/landing/testimonial05.jpg',
  },
  {
    quote:
      'Managing courses, payments, and student progress from one CMS is refreshingly easy. We got a custom front end without adding complexity to our team.',
    author: 'Priya Sharma',
    // role: "Founder, CodeMentor",
    image: '/images/landing/testimonial06.jpg',
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

export function TestimonialsSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-gradient-to-b from-muted/30 to-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          badge="Testimonials"
          title="Loved by creators and training teams"
          description="See how educators, creators, and modern training businesses use Docento to launch branded academies with less overhead."
          align="center"
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative flex flex-col p-6 rounded-md border border-neutral-400/80 bg-white hover:border-accent-300 hover:shadow-lg hover:shadow-accent-100/20 transition-all duration-300"
            >
              <p className="text-sm text-foreground/70 font-inter leading-relaxed flex-1">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-neutral-200">
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.author}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="font-inter font-semibold text-foreground text-sm">
                    {testimonial.author}
                  </div>
                  {/* <div className="font-inter text-foreground/50 text-xs">
                    {testimonial.role}
                  </div> */}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
