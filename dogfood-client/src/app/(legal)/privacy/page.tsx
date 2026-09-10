import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Acme Learning privacy policy.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="mx-auto w-full max-w-4xl px-6 lg:px-10">
        <h1 className="font-display text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This Privacy Policy explains how Acme Learning collects, uses, and protects your data.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-foreground/85">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
            <p className="mt-2">
              We collect details you provide directly, such as your name, email, phone number,
              billing details, and learning activity on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">How We Use Information</h2>
            <p className="mt-2">
              Acme Learning uses your information to create and manage your account, process
              payments, provide course access, improve our services, and send important updates.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Data Sharing</h2>
            <p className="mt-2">
              We do not sell your personal information. We only share data with trusted service
              providers required to operate the platform, such as payment and hosting providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Data Security</h2>
            <p className="mt-2">
              We use reasonable safeguards to protect your data. While no system is fully secure, we
              continuously improve security practices to reduce risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              If you have privacy-related questions, contact us at{" "}
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
