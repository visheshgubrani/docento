import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Review the Terms & Conditions for using Docento. Understand your responsibilities, usage rules, and the policies that guide our platform.",
  openGraph: {
    title: "Terms & Conditions — Docento",
    description:
      "Read the official Terms & Conditions for using Docento. Learn about account use, billing, rights, and responsibilities.",
    url: "https://docento.dev/terms",
  },
  alternates: {
    canonical: "https://docento.dev/terms",
  },
};

export default function TermsOfService() {
  return (
    <div className="relative w-full mx-auto">
      {/* Background Grid */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-100"
      >
        <defs>
          <pattern
            x="50%"
            y={-1}
            id="terms-grid"
            width={200}
            height={200}
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
          <path
            d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          fill="url(#terms-grid)"
          width="100%"
          height="100%"
          strokeWidth={0}
        />
      </svg>

      {/* Double-Bordered Container */}
      <div className="border-x max-w-4xl mx-auto border-b w-full bg-neutral-100 px-4">
        <div className="border-x w-full mx-auto bg-neutral-50 max-w-[52rem]">
          <div className="container max-w-3xl mx-auto px-6 py-12">
            <div className="prose prose-invert max-w-none">
              <h1 className="text-4xl font-semibold mb-2 text-primary font-ibm">
                Terms & Conditions
              </h1>
              <p className="text-foreground/70 font-noto mb-6 text-sm">
                Last Updated: May 16, 2025
              </p>

              {/* INTRODUCTION */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Introduction
                </h2>
                <p className="text-foreground/85 font-noto">
                  These Terms govern your use of Docento (“we”, “us”, “our”) and
                  the services we provide. By accessing the platform, you agree
                  to follow these Terms and our{" "}
                  <a href="/privacy" className="text-primary underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </section>

              {/* LICENSE */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Use of Our Services
                </h2>
                <p className="text-foreground/80 font-noto">
                  We grant you a limited, non-transferable license to use Docento
                  for personal or commercial purposes depending on your plan.
                  You must comply with all applicable laws while using the
                  platform.
                </p>
              </section>

              {/* INTELLECTUAL PROPERTY */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Intellectual Property
                </h2>
                <p className="text-foreground/80 font-noto">
                  All branding, platform features, designs, and materials on
                  Docento belong exclusively to Docento This does not extend
                  to your own uploaded materials or the content you create using
                  the platform.
                </p>
                <p className="text-foreground/70 font-noto mt-2 text-sm">
                  You retain full ownership of your created or uploaded content.
                </p>
              </section>

              {/* DATA USAGE */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Data Usage
                </h2>
                <p className="text-foreground/80 font-noto">
                  We use data to operate and improve Docento, enhance
                  performance, and provide support. Enterprise customers may
                  request custom data-handling terms.
                </p>
              </section>

              {/* ACCOUNTS */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Accounts & Content
                </h2>
                <ul className="list-disc pl-6 text-foreground/70 font-noto">
                  <li>You must keep your account secure.</li>
                  <li>You are responsible for any content you upload.</li>
                  <li>We may suspend accounts that violate these Terms.</li>
                </ul>
              </section>

              {/* PRICING */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Plans, Billing & Cancellations
                </h2>
                <ul className="list-disc pl-6 text-foreground/70 font-noto">
                  <li>
                    Subscriptions renew automatically each billing period.
                  </li>
                  <li>You may cancel anytime from your account settings.</li>
                  <li>
                    Refunds are issued only in select cases, such as billing
                    errors.
                  </li>
                </ul>
              </section>

              {/* PROHIBITED USES */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Prohibited Activities
                </h2>
                <ul className="list-disc pl-6 text-foreground/70 font-noto">
                  <li>Misusing or harming the platform</li>
                  <li>Violating laws or rights of others</li>
                  <li>Uploading harmful or malicious content</li>
                  <li>Attempting unauthorized access to Docento</li>
                </ul>
              </section>

              {/* LIABILITY */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Limitation of Liability
                </h2>
                <p className="text-foreground/80 font-noto">
                  Docento is provided “as is,” and we are not liable for
                  interruptions, data loss, or damages arising from your use of
                  the platform. Our liability is limited to the amount you paid
                  in the last 12 months.
                </p>
              </section>

              {/* GOVERNING LAW */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Governing Law
                </h2>
                <p className="text-foreground/80 font-noto">
                  These Terms are governed by Indian law. Any disputes must be
                  resolved in the courts of Delhi, India.
                </p>
              </section>

              {/* CONTACT */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-4">
                  Contact
                </h2>
                <ul className="list-none text-foreground/70 font-noto">
                  <li>
                    Email:{" "}
                    <a
                      href="mailto:legal@docento.dev"
                      className="text-primary underline"
                    >
                      legal@docento.dev
                    </a>
                  </li>
                  <li>Company: Docento</li>
                </ul>
              </section>

              <footer className="text-sm text-foreground/70 font-noto mt-12 pt-4 border-t border-border">
                <p>Last updated: May 16, 2025.</p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
