import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Acme Learning terms of service.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="mx-auto w-full max-w-4xl px-6 lg:px-10">
        <h1 className="font-display text-4xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          These Terms govern your use of Acme Learning and its learning services.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-foreground/85">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using Acme Learning, you agree to these Terms. If you do not agree,
              you should not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
            <p className="mt-2">
              You are responsible for keeping your account credentials secure and for all activity
              under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Course Access and Usage</h2>
            <p className="mt-2">
              Purchased courses are for your personal use only unless stated otherwise. You may not
              copy, redistribute, or resell course content without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Payments</h2>
            <p className="mt-2">
              All payments are processed through secure third-party providers. Pricing and offers
              may change at any time unless already purchased.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Changes to Services</h2>
            <p className="mt-2">
              Acme Learning may update course content, features, and policies to improve the
              platform and maintain service quality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              For questions about these Terms, contact us at{" "}
              <a className="underline" href="mailto:support@acmelearning.com">
                support@acmelearning.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
