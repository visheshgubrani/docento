import {
  LandingHeader,
  LandingFooter,
  CTASection,
} from "@/components/landing";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingHeader />
      <main>{children}</main>
      <CTASection />
      <LandingFooter />
    </>
  );
}
