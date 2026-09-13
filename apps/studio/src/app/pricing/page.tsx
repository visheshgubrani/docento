"use client";
import { useState } from "react";
import {
  CheckIcon,
  XMarkIcon as XMarkIconMini,
} from "@heroicons/react/20/solid";
import { StaticSectionHeader } from "@/components/landing";
import { GridPattern } from "@/components/GridPattern";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const pricing = {
  tiers: [
    {
      id: "free",
      name: "Free",
      description: "Everything you need to launch your LMS prototype today.",
      price: { monthly: "$0", annually: "$0" },
      highlights: [
        "1,000 monthly active learners",
        "Unlimited courses and modules",
        "Hosted dashboard",
        "Pre-built components & SDKs",
        "No credit card required",
      ],
      featured: false,
    },
    {
      id: "pro",
      name: "Pro",
      description: "Advanced features for scaling your learning platform.",
      price: { monthly: "$25", annually: "$250" },
      highlights: [
        "Remove Docento branding",
        "Advanced course types (cohorts, drip content)",
        "Payments integration (Stripe, Lemon Squeezy)",
        "Organization accounts & multi-tenancy",
        "SSO (Google, Microsoft)",
        "Priority webhooks & higher rate limits",
      ],
      featured: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Custom solutions for large-scale training teams.",
      price: { monthly: "Custom", annually: "Custom" },
      highlights: [
        "Dedicated success manager",
        "Enterprise SSO (SAML, Okta, Azure AD)",
        "Isolated environments & private cloud",
        "Advanced audit logs",
        "Full white-labeling",
        "Custom SLA & support",
      ],
      featured: false,
    },
  ],

  sections: [
    {
      name: "Platform Features",
      features: [
        {
          name: "Unlimited courses & lessons",
          tiers: { Free: true, Pro: true, Enterprise: true },
        },
        {
          name: "Monthly active learners",
          tiers: { Free: "1,000", Pro: "Usage-based", Enterprise: "Unlimited" },
        },
        {
          name: "Organizations / multi-tenancy",
          tiers: { Free: false, Pro: true, Enterprise: true },
        },
        {
          name: "Remove Docento branding",
          tiers: { Free: false, Pro: true, Enterprise: true },
        },
      ],
    },

    {
      name: "Auth & Security",
      features: [
        {
          name: "Standard login (email / OAuth)",
          tiers: { Free: true, Pro: true, Enterprise: true },
        },
        {
          name: "Enterprise SSO (SAML / Okta / Azure AD)",
          tiers: { Free: false, Pro: false, Enterprise: true },
        },
        {
          name: "Role-based access controls (RBAC)",
          tiers: { Free: true, Pro: true, Enterprise: true },
        },
        {
          name: "Audit logs",
          tiers: { Free: false, Pro: false, Enterprise: true },
        },
      ],
    },

    {
      name: "Integrations & Delivery",
      features: [
        {
          name: "Payments integration (Stripe / Lemon Squeezy)",
          tiers: { Free: false, Pro: true, Enterprise: true },
        },
        {
          name: "SCORM & xAPI support",
          tiers: { Free: false, Pro: "Add-on", Enterprise: true },
        },
        {
          name: "Webhooks",
          tiers: {
            Free: "Basic",
            Pro: "Priority",
            Enterprise: "Enterprise-grade",
          },
        },
        {
          name: "Custom domain",
          tiers: { Free: true, Pro: true, Enterprise: true },
        },
      ],
    },

    {
      name: "Support",
      features: [
        {
          name: "Email support",
          tiers: { Free: true, Pro: true, Enterprise: true },
        },
        {
          name: "Priority support",
          tiers: { Free: false, Pro: true, Enterprise: true },
        },
        {
          name: "Dedicated success manager",
          tiers: { Free: false, Pro: false, Enterprise: true },
        },
        {
          name: "SLA & uptime guarantees",
          tiers: { Free: false, Pro: false, Enterprise: true },
        },
      ],
    },
  ],
};

type TierName = "Free" | "Pro" | "Enterprise";

const faqs = [
  {
    id: 1,
    question: "Can I change my plan at any time?",
    answer:
      "Yes. You can upgrade, downgrade, or switch between monthly and annual billing at any time from your account settings. Changes take effect immediately, and prorated credits are applied automatically.",
  },
  {
    id: 2,
    question: "Do you offer a free trial?",
    answer:
      "Yes. All paid plans include a 14-day free trial with full access. No credit card is required to get started, and you can upgrade to a paid plan when you’re ready.",
  },
  {
    id: 3,
    question: "What is your refund policy?",
    answer:
      "We offer refunds within 7 days of your first payment if you're not satisfied. After that, cancellations stop future billing, but previously paid charges are non-refundable.",
  },
  // {
  //   id: 4,
  //   question: "Do you offer discounts for annual billing?",
  //   answer:
  //     "Yes. Annual plans include up to a 20% discount compared to paying monthly. You’ll see the discounted price when switching to annual billing.",
  // },
  {
    id: 5,
    question: "Is my data secure?",
    answer:
      "Absolutely. We use industry-standard encryption, regular security audits, and SOC-2 compliant infrastructure. SSO and role-based access control are available on the Scale plan.",
  },
  // {
  //   id: 6,
  //   question: "Can I add team members to my account?",
  //   answer:
  //     "Yes. Team features are included starting on the Growth plan. You can invite members, manage permissions, and set access levels anytime.",
  // },
  // {
  //   id: 7,
  //   question: "Do you support custom domains?",
  //   answer:
  //     "Yes. All paid plans support custom domains. Growth and Scale include multiple domains and advanced DNS controls.",
  // },
  {
    id: 8,
    question: "What kind of support do you offer?",
    answer:
      "All plans include 24/7 online support. Growth adds quarterly workshops, and Scale includes priority phone support and a dedicated onboarding specialist.",
  },
  {
    id: 9,
    question: "What happens if I cancel?",
    answer:
      "Your subscription will remain active until the end of the billing period. You can export your data at any time, and you won’t be charged again unless you reactivate.",
  },
  {
    id: 10,
    question: "Do you offer a custom enterprise plan?",
    answer:
      "Yes. If you need higher limits, SLA guarantees, or tailored onboarding, contact our team for a custom quote.",
  },
];

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export default function Pricing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative mx-auto w-full bg-white">
      <main>
        <form className="group/tiers relative w-full isolate overflow-hidden">
          <div className="flow-root relative w-full mx-auto border-b border-b-transparent  pb-16 sm:pt-20 pt-16 lg:pb-0">
            {/* Grid Pattern Background */}
            <div className="absolute -z-[1] inset-0 overflow-hidden pointer-events-none">
              <GridPattern
                className="absolute inset-0 h-full w-full fill-accent-100/30 stroke-neutral-950/3"
                style={{
                  maskImage:
                    "linear-gradient(to bottom left, white 40%, transparent 50%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom left, white 40%, transparent 50%)",
                }}
                yOffset={-200}
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
            >
              <div
                style={{
                  clipPath:
                    "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
                }}
                className="aspect-1108/632 w-290 bg-linear-to-r from-[#ddfcff] via-[#fcfcdd] to-[#ede5ff] to-20% opacity-70"
              />
            </div>
            {/* TOP CONTENT */}
            <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
              <div className="relative z-10 mx-auto w-full flex flex-col items-center justify-center">
                <StaticSectionHeader
                  badge="Pricing"
                  title="Pricing that grows with your learning platform"
                  description="Start building for free. Only pay when learners actively use your product."
                  align="center"
                />

                {/* Toggle */}
                <div className="mt-16 flex justify-center  ">
                  <fieldset aria-label="Payment frequency">
                    <div className="grid grid-cols-2 gap-x-1 rounded-full bg-white/5 p-1 text-center text-xs font-semibold text-foreground/80 ">
                      <label className="group relative rounded-full px-2.5 py-1 has-checked:bg-accent has-checked:text-white  transition-all duration-150 ease-in">
                        <input
                          defaultValue="monthly"
                          defaultChecked
                          name="frequency"
                          type="radio"
                          className="absolute inset-0 appearance-none rounded-full"
                        />
                        <span>Monthly</span>
                      </label>
                      <label className="group relative rounded-full px-2.5 py-1 has-checked:bg-accent has-checked:text-white  transition-all duration-150 ease-in">
                        <input
                          defaultValue="annually"
                          name="frequency"
                          type="radio"
                          className="absolute inset-0 appearance-none rounded-full"
                        />
                        <span>Annually</span>
                      </label>
                    </div>
                  </fieldset>
                </div>
              </div>

              {/* TIER CARDS */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 lg:max-w-none lg:grid-cols-3 lg:-mb-14"
              >
                {pricing.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    data-featured={tier.featured ? "true" : undefined}
                    className={classNames(
                      tier.featured
                        ? "z-10 bg-white shadow-xl outline-1 outline-gray-900/10"
                        : "bg-muted/80 backdrop-blur-2xl outline-1 outline-gray-200 lg:outline-1",
                      "group/tier relative rounded-2xl p-7 lg:pt-10 xl:p-8"
                    )}
                  >
                    {/* Tier title */}
                    <h3
                      id={`tier-${tier.id}`}
                      className="text-sm font-medium font-ibm text-foreground/80 group-data-featured/tier:text-gray-900"
                    >
                      {tier.name} Plan
                    </h3>

                    {/* Price display */}
                    <div className="mt-1 flex items-end gap-x-2">
                      {/* Monthly price */}
                      <p className="text-[2.7rem] font-semibold text-foreground/80 group-not-has-[[name=frequency][value=monthly]:checked]/tiers:hidden group-data-featured/tier:text-gray-900">
                        {tier.price.monthly}
                      </p>

                      {/* Annual price */}
                      <p className="text-[2.7rem] font-semibold text-foreground/80 group-not-has-[[name=frequency][value=annually]:checked]/tiers:hidden group-data-featured/tier:text-gray-900">
                        {tier.price.annually}
                      </p>

                      {/* Billing labels */}
                      {tier.id !== "enterprise" && (
                        <div className="text-sm">
                          <p className="text-gray-500 mb-3 group-not-has-[[name=frequency][value=monthly]:checked]/tiers:hidden">
                            per month
                          </p>
                          <p className="text-gray-500 mb-3 group-not-has-[[name=frequency][value=annually]:checked]/tiers:hidden">
                            Billed annually
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="mt-0.5 text-foreground/85 font-ibm text-sm/6">
                      {tier.description}
                    </p>

                    {/* CTA */}
                    <button
                      value={tier.id}
                      name="tier"
                      type="submit"
                      aria-describedby={`tier-${tier.id}`}
                      className="mt-5 w-full rounded-md bg-muted-foreground/15 px-2 py-2 text-center text-sm font-semibold text-foreground/80 hover:bg-muted-foreground/10 group-data-featured/tier:bg-accent 
                      group-data-featured/tier:text-white group-data-featured/tier:hover:bg-accent/80 cursor-pointer transition-colors duration-150 ease-in-out"
                    >
                      Buy this plan
                    </button>

                    {/* Highlights */}
                    <ul className="mt-5 divide-y divide-white/5 border-t border-white/5 text-sm text-foreground/80 group-data-featured/tier:text-gray-600">
                      {tier.highlights.map((feature) => (
                        <li key={feature} className="flex gap-x-3 py-1.5">
                          <CheckIcon className="h-6 w-5 flex-none text-gray-500 group-data-featured/tier:text-indigo-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* MOBILE COMPARISON */}
          <div className="relative bg-warm-bg/50 lg:pt-14">
            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
              <section
                aria-labelledby="mobile-comparison-heading"
                className="lg:hidden"
              >
                <h2 id="mobile-comparison-heading" className="sr-only">
                  Feature comparison
                </h2>

                <div className="mx-auto max-w-2xl space-y-16">
                  {pricing.tiers.map((tier) => (
                    <div key={tier.id} className="border-t border-gray-900/10">
                      <div className="-mt-px w-72 border-t-2 pt-10 md:w-80" />

                      <div className="mt-10 space-y-10">
                        {pricing.sections.map((section) => (
                          <div key={section.name}>
                            <h4 className="text-sm font-medium text-gray-800">
                              {section.name}
                            </h4>

                            <div className="relative mt-6">
                              <div className="relative rounded-lg bg-white shadow-xs">
                                <dl className="divide-y divide-gray-200 text-sm">
                                  {section.features.map((feature) => {
                                    const tiers = feature.tiers as Record<
                                      TierName,
                                      string | boolean
                                    >;

                                    return (
                                      <div
                                        key={feature.name}
                                        className="flex items-center justify-between px-4 py-3"
                                      >
                                        <dt className="text-gray-600">
                                          {feature.name}
                                        </dt>
                                        <dd className="flex items-center">
                                          {typeof tiers[
                                            tier.name as TierName
                                          ] === "string" ? (
                                            <span>
                                              {tiers[tier.name as TierName]}
                                            </span>
                                          ) : tiers[tier.name as TierName] ? (
                                            <CheckIcon className="h-5 w-5 text-indigo-700" />
                                          ) : (
                                            <XMarkIconMini className="h-5 w-5 text-gray-600" />
                                          )}
                                        </dd>
                                      </div>
                                    );
                                  })}
                                </dl>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* DESKTOP COMPARISON */}
              <section
                aria-labelledby="comparison-heading"
                className="hidden lg:block mt-3"
              >
                <h2 id="comparison-heading" className="sr-only">
                  Feature comparison
                </h2>

                {/* TIER HEADERS */}
                <div className="grid grid-cols-4 border-y border-accent/20 py-5">
                  <div></div>
                  {pricing.tiers.map((tier) => (
                    <div key={tier.id} className="px-4">
                      <p className="text-sm font-semibold text-accent font-noto">
                        {tier.name}
                      </p>
                      <p className="mt-1 text-xs font-ibm text-foreground/80">
                        {tier.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* FEATURE SECTIONS */}
                <div className="mt-10 space-y-16">
                  {pricing.sections.map((section) => (
                    <div key={section.name} className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        {section.name}
                      </h3>

                      <div className="grid grid-cols-4">
                        <div></div>
                        {pricing.tiers.map((tier) => (
                          <div
                            key={tier.id}
                            className="px-4 text-center text-sm font-medium text-gray-800"
                          ></div>
                        ))}
                      </div>

                      <div className="divide-y divide-gray-100 border-y border-gray-200">
                        {section.features.map((feature) => (
                          <div
                            key={feature.name}
                            className="grid grid-cols-4 py-4 items-center"
                          >
                            {/* Feature name */}
                            <div className="text-sm font-medium text-gray-800 pr-4">
                              {feature.name}
                            </div>

                            {/* Feature availability */}
                            {pricing.tiers.map((tier) => {
                              const tiers = feature.tiers as Record<
                                TierName,
                                string | boolean
                              >;

                              const value = tiers[tier.name as TierName];

                              return (
                                <div
                                  key={tier.id}
                                  className="text-center text-sm text-gray-700 flex justify-center"
                                >
                                  {typeof value === "string" ? (
                                    <span className="text-gray-800">
                                      {value}
                                    </span>
                                  ) : value ? (
                                    <CheckIcon className="h-5 w-5 text-indigo-700" />
                                  ) : (
                                    <XMarkIconMini className="h-5 w-5 text-foreground/80" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </form>

        {/* FAQ */}
        <div className="mx-auto max-w-7xl px-6 mt-16 sm:mt-20 lg:px-8">
          <h2 className="text-3xl font-medium font-ibm text-gray-900 sm:text-[2.4rem]">
            Frequently asked questions
          </h2>

          <motion.dl
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 md:mt-16 divide-y divide-gray-900/10"
          >
            {faqs.map((faq) => (
              <motion.div
                key={faq.id}
                variants={itemVariants}
                className="py-8 lg:grid lg:grid-cols-12 lg:gap-4"
              >
                <dt className="text-base font-[560] text-gray-900 lg:col-span-5">
                  {faq.question}
                </dt>
                <dd className="mt-4 lg:col-span-7">
                  <p className="text-base text-gray-600">{faq.answer}</p>
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </main>
    </div >
  );
}
