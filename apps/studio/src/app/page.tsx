import {
  LandingHeader,
  HeroSection,
  BenefitsSection,
  CourseBuilderSection,
  AIToolsSection,
  DashboardSection,
  DeveloperExperienceSection,
  StarterTemplatesSection,
  CTASection,
  LandingFooter,
} from '@/components/landing'

/**
 * The Studio marketing page.
 *
 * There is no testimonials section, and that is deliberate rather than an
 * omission to fill in later. The previous version carried six quotes attributed
 * to named people at named companies, alongside stock portraits, none of which
 * described anyone who had used this software. Fabricated endorsements are a
 * legal liability and, in a repository whose whole pitch is that you can read
 * the code before you trust it, a credibility problem as well.
 *
 * Restore the section when there are real quotes to put in it, with the
 * attribution the author agreed to.
 */
export default function Home() {
  return (
    <main className="relative mx-auto flex w-full flex-col items-center justify-center">
      <LandingHeader />
      <HeroSection />
      <BenefitsSection />
      <CourseBuilderSection />
      <AIToolsSection />
      <DashboardSection />
      <DeveloperExperienceSection />
      <StarterTemplatesSection />
      <CTASection />
      <LandingFooter />
    </main>
  )
}
