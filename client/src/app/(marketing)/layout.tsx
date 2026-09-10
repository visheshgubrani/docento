import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing";
import { LandingFooter } from "@/components/landing";
import { CTASection } from "@/components/landing";

export default function BlogLayout({
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
