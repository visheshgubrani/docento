import type { Metadata } from 'next'
import { LandingHeader } from '@/components/landing'
import { LandingFooter } from '@/components/landing'
import { CTASection } from '@/components/landing'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Docento, our mission, and the vision behind building a modern, flexible, headless LMS designed for creators, teams, and fast-moving companies.',
  keywords: [
    'about docento',
    'docento team',
    'headless lms',
    'lms platform',
    'modern learning tools',
    'edtech',
    'online learning infrastructure',
  ],
  openGraph: {
    title: 'About Docento',
    description:
      'Discover the story and mission behind Docento, a flexible headless LMS built for creators, teams, and modern learning experiences.',
    url: 'https://docento.dev/about',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Docento',
    description:
      "Learn more about our mission and the vision behind Docento, a headless LMS built for today's learning needs.",
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <LandingHeader />
      <main>{children}</main>
      <CTASection />
      <LandingFooter />
    </>
  )
}
