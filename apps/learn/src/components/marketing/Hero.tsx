"use client";

import Link from "next/link";
import Image from "next/image";
import { heroData } from "@/config/marketing/home";
import { noisePattern } from "@/components/noise-pattern";
import { FaGithub } from "react-icons/fa6";
import { HiArrowRight, HiChevronRight } from "react-icons/hi2";

function AnnouncementBadge({
  text,
  href,
  cta = "Learn more",
}: {
  text: string;
  href: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative inline-flex max-w-full gap-x-3 overflow-hidden rounded-lg bg-muted px-3.5 py-2 text-sm/6 text-foreground hover:bg-accent max-sm:flex-col sm:items-center sm:rounded-full sm:px-3 sm:py-0.5"
    >
      <span className="text-pretty sm:truncate">{text}</span>
      <span className="h-3 w-px max-sm:hidden bg-border" />
      <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-foreground">
        {cta} <HiChevronRight className="w-4 h-4 shrink-0" />
      </span>
    </Link>
  );
}

export function Hero() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col gap-24">
            <div className="flex flex-col items-start gap-6">
              <AnnouncementBadge
                href={heroData.announcement.href}
                text={heroData.announcement.text}
                cta={heroData.announcement.cta}
              />

              <h1 className="max-w-5xl text-balance font-display text-5xl/[1] tracking-tight text-foreground sm:text-[5rem]/[1]">
                {heroData.headline}
              </h1>

              <p className="max-w-3xl text-lg/8 text-foreground/75">{heroData.subheadline}</p>

              <div className="flex md:flex-row flex-col md:w-auto w-full items-center gap-4 mt-4">
                <Link
                  href={heroData.primaryCta.href}
                  className="inline-flex shrink-0 items-center md:w-auto w-full  justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 hover:bg-primary"
                >
                  {heroData.primaryCta.text}
                  <HiArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href={heroData.secondaryCta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center md:w-auto w-full  justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  <FaGithub className="size-5.5" />
                  {heroData.secondaryCta.text}
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-linear-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]">
              <div
                className="absolute inset-0 opacity-30 mix-blend-overlay dark:opacity-25"
                style={{
                  backgroundPosition: "center",
                  backgroundImage: noisePattern,
                }}
              />
              <div className="relative px-[min(10%,4rem)] pt-[min(10%,4rem)]">
                <div className="relative overflow-hidden rounded-t-md ring-1 ring-black/10">
                  <Image
                    src={heroData.heroImage}
                    alt="Docento LMS Dashboard"
                    width={1920}
                    height={1080}
                    className="h-auto w-full bg-foreground/75"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
