import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'Learn how Docento collects, uses, and protects your data. Read our Privacy Policy to understand your rights and how we keep your information secure.',
  openGraph: {
    title: 'Privacy Policy — Docento',
    description:
      'Understand how Docento handles and safeguards your data. Read our Privacy Policy for full details.',
    url: 'https://docento.dev/privacy',
  },
  alternates: {
    canonical: 'https://docento.dev/privacy',
  },
}

export default function PrivacyPolicy() {
  return (
    <div className="relative w-full mx-auto">
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-100"
      >
        <defs>
          <pattern
            x="50%"
            y={-1}
            id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
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
          fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
          width="100%"
          height="100%"
          strokeWidth={0}
        />
      </svg>

      <div className="border-x max-w-4xl mx-auto border-b w-full bg-neutral-100 px-4">
        <div className="border-x w-full mx-auto bg-neutral-50 max-w-[52rem]">
          <div className="container max-w-3xl mx-auto px-6 py-12">
            <div className="prose prose-invert max-w-none">
              <h1 className="text-4xl font-semibold mb-2 text-primary font-ibm">
                Privacy Policy
              </h1>
              <p className="text-foreground/70 font-noto mb-6 text-sm">
                Last Updated: May 16, 2025
              </p>

              {/* Introduction */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Introduction
                </h2>
                <p className="text-foreground/85 font-noto">
                  This Privacy Policy outlines how Docento (“we”, “us”, “our”)
                  collects, uses, and protects information when you access our
                  platform. Please review our{' '}
                  <a href="/terms" className="text-primary underline">
                    Terms & Conditions
                  </a>{' '}
                  for additional legal details related to your use of Docento.
                </p>
              </section>

              {/* Data Collection */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-4">
                  Information We Collect
                </h2>

                <div className="px-4 mb-6">
                  <h3 className="text-xl font-medium text-foreground/80 mb-2">
                    Account Information
                  </h3>
                  <ul className="list-disc pl-6 text-foreground/70 font-noto">
                    <li>Email and name</li>
                    <li>Payment details for paid plans</li>
                    <li>Account settings and preferences</li>
                  </ul>
                </div>

                <div className="px-4 mb-6">
                  <h3 className="text-xl font-medium text-foreground/80 mb-2">
                    Usage Information
                  </h3>
                  <ul className="list-disc pl-6 text-foreground/70 font-noto">
                    <li>Courses created and managed</li>
                    <li>Interactions within the platform</li>
                    <li>Feature usage analytics</li>
                  </ul>
                </div>

                <div className="px-4">
                  <h3 className="text-xl font-medium text-foreground/80 mb-2">
                    Automatically Collected Data
                  </h3>
                  <ul className="list-disc pl-6 text-foreground/70 font-noto">
                    <li>IP address and device info</li>
                    <li>Browser type and OS</li>
                    <li>Pages visited and timestamps</li>
                  </ul>
                </div>
              </section>

              {/* Cookies */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Cookies & Tracking
                </h2>
                <p className="text-foreground/80 mb-2">
                  Docento uses cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 text-foreground/70 font-noto">
                  <li>Maintain your login session</li>
                  <li>Remember preferences</li>
                  <li>Improve platform performance</li>
                  <li>Analyze usage trends</li>
                </ul>
                <p className="text-sm text-foreground/70 font-noto mt-2">
                  You can manage cookie settings through your browser.
                </p>
              </section>

              {/* How Data is Used */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  How We Use Your Information
                </h2>
                <ul className="list-disc pl-6 text-foreground/70 font-noto">
                  <li>Operate and improve the Docento platform</li>
                  <li>Provide customer support</li>
                  <li>Process payments securely</li>
                  <li>Enhance learning experiences</li>
                  <li>Maintain platform security</li>
                  <li>Send important updates</li>
                </ul>
              </section>

              {/* Data Sharing */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Data Sharing
                </h2>
                <p className="text-foreground/80 mb-3">
                  We only share data with trusted partners needed to operate
                  Docento, such as:
                </p>
                <ul className="list-disc pl-6 text-foreground/70 font-noto">
                  <li>Payment processors</li>
                  <li>Analytics providers</li>
                  <li>Cloud hosting services</li>
                </ul>
                <p className="text-sm text-foreground/70 font-noto mt-2">
                  We do not sell your personal data.
                </p>
              </section>

              {/* User Rights */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Your Rights
                </h2>
                <p className="text-foreground/80 mb-2">You may request to:</p>
                <ul className="list-disc pl-6 text-foreground/70 font-noto">
                  <li>Access your data</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account</li>
                  <li>Export your data</li>
                  <li>Opt out of certain processing</li>
                </ul>
                <p className="text-sm text-foreground/70 font-noto mt-2">
                  To exercise your rights, email{' '}
                  <a
                    href="mailto:privacy@docento.dev"
                    className="text-primary underline"
                  >
                    privacy@docento.dev
                  </a>
                  .
                </p>
              </section>

              {/* Security */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Security
                </h2>
                <p className="text-foreground/80">
                  We use encryption, access controls, and secure storage methods
                  to protect your data. Although we take strong precautions, no
                  online service is completely risk-free.
                </p>
              </section>

              {/* Children */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Children's Privacy
                </h2>
                <p className="text-foreground/80">
                  Docento is not intended for individuals under 18, and we do
                  not knowingly collect data from children.
                </p>
              </section>

              {/* Changes */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-3">
                  Changes to This Policy
                </h2>
                <p className="text-foreground/80">
                  We may update this Privacy Policy occasionally. Significant
                  changes will be communicated through the platform.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-6">
                <h2 className="text-[1.7rem] font-ibm font-medium text-foreground/90 mb-4">
                  Contact
                </h2>
                <p className="text-foreground/80 mb-2">
                  For privacy questions or data requests, contact:
                </p>

                <div className="px-4">
                  <ul className="list-none text-foreground/70 font-noto">
                    <li>
                      Email:{' '}
                      <a
                        href="mailto:privacy@docento.dev"
                        className="text-primary underline"
                      >
                        privacy@docento.dev
                      </a>
                    </li>
                    <li>Website: docento.dev</li>
                    <li>Company: Docento</li>
                  </ul>
                </div>
              </section>

              <footer className="text-sm text-foreground/70 font-noto mt-12 pt-4 border-t border-border">
                <p>This policy is effective as of May 16, 2025.</p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
