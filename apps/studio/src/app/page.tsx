// import { Footer } from "@/components/layout/footer";
// import Header from "@/components/layout/header";
// import BenefitsSection from "@/components/sections/benefits";
// import { BentoSection } from "@/components/sections/bento-grid";
// import { CodeExample } from "@/components/sections/code-example";
// import { CTA } from "@/components/sections/cta";
// import HeroSection from "@/components/sections/hero";
// import { PlatformSection } from "@/components/sections/platform";
// import { UseCases } from "@/components/sections/use-cases";

import {
  LandingHeader,
  HeroSection,
  BenefitsSection,
  CourseBuilderSection,
  AIToolsSection,
  DashboardSection,
  TestimonialHighlight,
  DeveloperExperienceSection,
  StarterTemplatesSection,
  UseCasesSection,
  TestimonialsSection,
  CTASection,
  LandingFooter,
} from "@/components/landing";

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center mx-auto w-full">
      {/* New Landing Page */}
      <LandingHeader />
      <HeroSection />
      <BenefitsSection />
      <CourseBuilderSection />
      <AIToolsSection />
      <DashboardSection />
      <TestimonialHighlight />
      <DeveloperExperienceSection />
      <StarterTemplatesSection />
      <UseCasesSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />

      {/* Old Landing Page (commented out)
      <Header />
      <HeroSection />
      <BentoSection />
      <PlatformSection />
      <CodeExample />
      <UseCases />
      <CTA />
      <Footer />
      */}
    </main>
  );
}
