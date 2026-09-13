import { Metadata } from "next";
import { LandingHeader } from "@/components/landing";
import { LandingFooter } from "@/components/landing";
import { CTASection } from "@/components/landing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose a pricing plan that scales with you. Docento offers flexible options for creators, training teams, and enterprise learning platforms—with a generous free tier and powerful features included.",
  keywords: [
    "docento pricing",
    "lms pricing",
    "course platform pricing",
    "online learning pricing plans",
    "edtech pricing",
    "enterprise LMS pricing",
    "creator platform pricing",
  ],

  metadataBase: new URL("https://docento.dev"),

  alternates: {
    canonical: "/pricing",
  },

  openGraph: {
    title: "Docento Pricing – Plans That Scale With You",
    description:
      "Simple and transparent pricing for course creators, businesses, and enterprise teams. Start for free and upgrade as you grow.",
    url: "https://docento.dev/pricing",
    type: "website",
    images: [
      {
        url: "/og/pricing.png",
        width: 1200,
        height: 630,
        alt: "Docento pricing preview",
      },
    ],
  },
};

export default function PricingLayout({
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
