import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Read the Acme Learning refund policy.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="mx-auto w-full max-w-4xl px-6 lg:px-10">
        <h1 className="font-display text-4xl font-bold text-foreground">Refund Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This policy outlines refund eligibility for courses purchased on Acme Learning.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-foreground/85">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Refund Window</h2>
            <p className="mt-2">
              Refund requests are accepted within 7 days of purchase if you have not completed a
              significant portion of the course.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Non-Refundable Cases</h2>
            <p className="mt-2">
              Refunds may be declined for accounts with excessive course consumption, repeated
              refund abuse, or violations of platform terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">How to Request a Refund</h2>
            <p className="mt-2">
              Send your order details and reason for refund to{" "}
              <a className="underline" href="mailto:support@acmelearning.com">
                support@acmelearning.com
              </a>
              . Our team will review and respond within 5 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Refund Processing Time</h2>
            <p className="mt-2">
              Approved refunds are processed to your original payment method and may take 5-10
              business days to reflect, depending on your bank or payment provider.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
