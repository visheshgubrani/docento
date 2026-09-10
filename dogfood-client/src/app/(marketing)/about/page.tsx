"use client";

import { useId } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { aboutPageData } from "@/config/marketing/about";
import { noisePattern } from "@/components/noise-pattern";

export default function AboutPage() {
  const pathId = useId();

  return (
    <div className="min-h-screen">
      <section className="py-16 md:py-20">
        <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-16"
          >
            <div className="flex flex-col gap-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                {aboutPageData.hero.eyebrow}
              </span>
              <h1 className="font-display text-[2rem]/10 tracking-tight text-pretty text-foreground sm:text-5xl/[1.1] max-w-5xl">
                {aboutPageData.hero.headline}
              </h1>
              <p className="max-w-3xl text-lg/8 text-foreground/70">
                {aboutPageData.hero.description}
              </p>
            </div>

            <div className="rounded-lg bg-olive-950/[0.035] dark:bg-white/5 p-2">
              <div className="relative overflow-hidden rounded-sm bg-gradient-to-b from-[#876d88] to-[#8f6976] dark:from-[#412c42] dark:to-[#3c1a26]">
                <div
                  className="absolute inset-0 opacity-30 mix-blend-overlay dark:opacity-25"
                  style={{
                    backgroundPosition: "center",
                    backgroundImage: noisePattern,
                  }}
                />
                <div className="relative px-[min(10%,3rem)] pt-[min(10%,3rem)]">
                  <div className="relative aspect-video rounded-t-sm overflow-hidden ring-1 ring-black/10">
                    <Image
                      src={aboutPageData.hero.image}
                      alt="About Docento"
                      fill
                      className="object-cover bg-white/75 dark:bg-black/75"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 overflow-hidden">
        <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-10 sm:gap-16"
          >
            <div className="flex max-w-2xl flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {aboutPageData.stats.eyebrow}
                </span>
                <h2 className="font-display text-[2rem]/10 tracking-tight text-pretty text-foreground sm:text-5xl/[1.1]">
                  {aboutPageData.stats.headline}
                </h2>
              </div>
              <p className="text-base/8 md:text-lg/8 font-sans text-foreground/70 text-pretty">
                {aboutPageData.stats.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-2 grid grid-cols-2 gap-x-2 gap-y-10 sm:auto-cols-fr sm:grid-flow-col-dense">
                {aboutPageData.stats.items.map((stat, index) => (
                  <div key={index} className="border-l border-border pl-6">
                    <div className="text-2xl/10 font-medium tracking-tight text-foreground">
                      {stat.value}
                    </div>
                    <p className="mt-2 text-sm/7 text-muted-foreground">{stat.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none relative h-48 sm:h-64 lg:h-36">
              <div className="absolute bottom-0 left-1/2 w-[150vw] max-w-[calc(80rem-2.5rem*2)] -translate-x-1/2">
                <svg className="h-[400px] w-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
                  <defs>
                    <clipPath id={pathId}>
                      <path d="M 0 400 L 0 383 C 396 362.8, 804 264.3, 1200 60 L 1200 60 L 1200 400 Z" />
                    </clipPath>
                  </defs>
                  <path
                    d="M 0 400 L 0 383 C 396 362.8, 804 264.3, 1200 60 L 1200 60 L 1200 400 Z"
                    className="fill-muted-foreground/15 dark:fill-muted/55"
                    stroke="none"
                  />
                  <g
                    strokeWidth="1"
                    strokeDasharray="4 3"
                    clipPath={`url(#${pathId})`}
                    className="stroke-muted-foreground/40 dark:stroke-muted-foreground/25"
                  >
                    {[
                      0, 92.3, 184.6, 276.9, 369.2, 461.5, 553.8, 646.2, 738.5, 830.8, 923.1,
                      1015.4, 1107.7, 1199.5,
                    ].map((x) => (
                      <line
                        key={x}
                        x1={x}
                        y1="400"
                        x2={x}
                        y2="0"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                  <path
                    d="M 0 383 C 396 362.8, 804 264.3, 1200 60"
                    fill="none"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    className="stroke-border"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <figure className="grid grid-cols-1 gap-x-2 rounded-xl bg-muted dark:bg-muted/55 p-2 lg:grid-cols-2">
              <div className="flex flex-col items-start justify-between gap-10 p-6 text-foreground sm:p-10">
                <blockquote className="relative font-medium flex flex-col gap-4 text-2xl/9 text-pretty">
                  <p>&ldquo;{aboutPageData.testimonial.quote}&rdquo;</p>
                </blockquote>
                <figcaption className="text-xl/7">
                  <p className="font-medium">{aboutPageData.testimonial.name}</p>
                  <p className="text-muted-foreground mt-2">{aboutPageData.testimonial.role}</p>
                </figcaption>
              </div>
              <div className="flex justify-end overflow-hidden rounded-sm ">
                <Image
                  src={aboutPageData.testimonial.image}
                  alt="Testimonial"
                  width={500}
                  height={400}
                  className="object-cover opacity-90 rounded-sm bg-white/75 dark:bg-black/75"
                />
              </div>
            </figure>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-10 sm:gap-16"
          >
            <div className="flex max-w-2xl flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {aboutPageData.values.eyebrow}
                </span>
                <h2 className="font-display text-[2rem]/10 tracking-tight text-pretty text-foreground sm:text-5xl/[1.2]">
                  {aboutPageData.values.headline}
                </h2>
              </div>
              <p className="text-base/8 md:text-lg/8 text-foreground/70 text-pretty">
                {aboutPageData.values.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {aboutPageData.values.items.map((value, index) => (
                <figure
                  key={index}
                  className="flex flex-col border-l-4 border-primary/60 justify-between gap-10 rounded-md bg-muted dark:bg-muted/55 p-6 text-sm/7 text-foreground"
                >
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-xl font-display">{value.title}</p>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                </figure>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
