import { siteConfig } from '@/config/site'
/**
 * Marketing copy for the learner application.
 *
 * This describes the *software*, not a tenant. The academy's name, colours,
 * logo and support address come from `Academy.branding` through the catalogue
 * API, so one deployment can serve several academies without any of them editing
 * code.
 *
 * It deliberately contains no invented learners, courses, or engagement
 * figures. An earlier version carried six named testimonials with stock
 * portraits, a fabricated company called `${siteConfig.name}`, and numbers like
 * "15,000+ course completions" for a product with no users. Fabricated social
 * proof is a legal liability, and in a repository whose claim is that you can
 * read the code before trusting it, it is a credibility problem as well. Add a
 * section back when there is something true to put in it.
 */

// ===== Hero Section =====
export const heroData = {
  headline: 'Grow your skills. Advance your career.',
  subheadline:
    'Courses, assessments and certificates. Sign in to pick up where you left off, or browse the catalogue below.',
  primaryCta: {
    text: 'Explore Courses',
    href: '/courses',
  },
  secondaryCta: {
    text: 'View on GitHub',
    href: 'https://github.com/visheshgubrani/docento',
  },
}

// ===== Features Section =====
export const featuresData = {
  eyebrow: 'How it works',
  headline: 'Everything you need to grow',
  description: 'Your learning experience, from first lesson to certificate.',
  features: [
    {
      title: 'Learn at Your Pace',
      description:
        'Self-paced courses that fit your schedule. Start, pause, and resume whenever works for you.',
    },
    {
      title: 'Track Your Progress',
      description:
        'See your completed courses, earned certificates, and what is left, all in one dashboard.',
    },
    {
      title: 'Certificate on Completion',
      description:
        'Finish a course and earn a certificate with a public verification link anyone can check.',
    },
  ],
}

// ===== FAQ Section =====
export const faqData = {
  headline: 'Frequently asked questions',
  faqs: [
    {
      id: 'faq-pace',
      question: 'Can I learn at my own pace?',
      answer:
        'Yes. Courses are self-paced, and your position in each lesson is saved, so you can stop and resume later without losing your place.',
    },
    {
      id: 'faq-progress',
      question: 'How is my progress tracked?',
      answer:
        'Lessons you finish are recorded against your enrolment, and your dashboard shows what is complete and what remains for each course.',
    },
    {
      id: 'faq-certificate',
      question: 'How do I get a certificate?',
      answer:
        'Complete every required lesson in a course and a certificate is issued to your account. It carries a public verification link, so an employer can confirm it without an account here.',
    },
    {
      id: 'faq-updates',
      question: 'What happens to my progress if a course is updated?',
      answer:
        'Lessons you have completed stay completed. New lessons are added to what remains, and a quiz you have already taken is graded against the version you took.',
    },
    {
      id: 'faq-devices',
      question: 'Does it work on a phone?',
      answer:
        'Yes. The lesson player and dashboard are responsive, and video lessons play with the browser’s own player, so there is nothing to install.',
    },
  ],
}

// ===== CTA Section =====
export const ctaData = {
  headline: 'Ready to start learning?',
  subheadline: 'Create your account and enrol in a course today.',
  primaryCta: {
    text: 'Browse Courses',
    href: '/courses',
  },
  secondaryCta: {
    text: 'Create account',
    href: '/signup',
  },
}
