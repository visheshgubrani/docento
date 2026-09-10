"use client";

import Link from "next/link";
import { ctaData } from "@/config/marketing/home";
import { noisePattern } from "@/components/noise-pattern";
import { HiChevronRight } from "react-icons/hi2";

export function CTA() {
  return (
    <section className="py-16">
      <div className="relative overflow-hidden bg-primary/50 py-20 dark:bg-primary/20">
        <div
          className="absolute inset-0 opacity-85 mix-blend-overlay dark:opacity-70"
          style={{
            backgroundPosition: "center",
            backgroundImage: noisePattern,
          }}
        />

        <div className="relative mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
          <div className="flex flex-col items-center justify-center text-center gap-10">
            <div className="flex flex-col gap-4">
              <div className="flex max-w-4xl flex-col gap-4">
                <h2 className="text-foreground font-display text-[2rem]/10 tracking-tight text-pretty sm:text-5xl/[1.2]">
                  {ctaData.headline}
                </h2>
              </div>
              <p className="max-w-2xl text-lg/8 md:text-xl/8.5 text-foreground/75 text-pretty">
                {ctaData.subheadline}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href={ctaData.primaryCta.href}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:bg-primary hover:opacity-90"
              >
                {ctaData.primaryCta.text}
              </Link>

              <Link
                href={ctaData.secondaryCta.href}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {ctaData.secondaryCta.text}
                <HiChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
