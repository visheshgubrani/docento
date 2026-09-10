"use client";

import { useId } from "react";
import { statsData } from "@/config/marketing/home";

export function Stats() {
  const pathId = useId();

  return (
    <section className="overflow-hidden py-16 md:py-20">
      <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
        <div className="flex flex-col gap-10 sm:gap-16">
          <div className="flex max-w-2xl flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                {statsData.eyebrow}
              </span>
              <h2 className="text-foreground font-display text-[2rem]/10 tracking-tight text-pretty sm:text-5xl/[1.1]">
                {statsData.headline}
              </h2>
            </div>
            <p className="text-base/8 md:text-lg/8 text-foreground/75 text-pretty">
              {statsData.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-2 grid grid-cols-2 gap-x-2 gap-y-10 sm:auto-cols-fr sm:grid-flow-col-dense">
              {statsData.stats.map((stat, index) => (
                <div key={index} className="border-l border-border pl-6">
                  <div className="text-foreground text-2xl/10 font-medium tracking-tight">
                    {stat.value}
                  </div>
                  <p className="mt-2 text-sm/7 text-foreground/75">{stat.text}</p>
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
                    0, 92.3, 184.6, 276.9, 369.2, 461.5, 553.8, 646.2, 738.5, 830.8, 923.1, 1015.4,
                    1107.7, 1199.5,
                  ].map((x) => (
                    <line key={x} x1={x} y1="400" x2={x} y2="0" vectorEffect="non-scaling-stroke" />
                  ))}
                </g>
                <path
                  d="M 0 383 C 396 362.8, 804 264.3, 1200 60"
                  fill="none"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-muted/60 dark:stroke-muted/40"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
