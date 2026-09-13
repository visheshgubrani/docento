"use client";
import { FaArrowRightLong } from "react-icons/fa6";
import Link from "next/link";

export function CTA() {
  return (
    <section className="w-full mx-auto relative md:py-20 py-16">
      <div
        className="bg-gradient-to-b from-muted to-secondary max-w-7xl mx-auto overflow-hidden shadow-[inset_0px_0px_30px_-3px_#bab5eb]
rounded-[2rem] md:rounded-[3rem]"
      >
        <div className="mx-auto">
          <div className="relative isolate overflow-hidden px-6 pt-16 sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
            <svg
              viewBox="0 0 1024 1024"
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-y-1/2 mask-[radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
            >
              <circle
                r={512}
                cx={512}
                cy={512}
                fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
                fillOpacity="0.8"
              />
              <defs>
                <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
                  <stop stopColor="#9d6ae5" />
                  <stop offset={1} stopColor="#986fd9" />
                </radialGradient>
              </defs>
            </svg>
            <div className="relative mx-auto max-w-2xl text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
              <svg
                aria-hidden="true"
                className="absolute inset-x-0 top-0 -z-10 h-256 w-full mask-[radial-gradient(32rem_32rem_at_center,white,transparent)] stroke-white/70"
              >
                <defs>
                  <pattern
                    x="50%"
                    y={-1}
                    id="1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84"
                    width={200}
                    height={200}
                    patternUnits="userSpaceOnUse"
                  >
                    <path d="M.5 200V.5H200" fill="none" />
                  </pattern>
                </defs>
                <svg x="50%" y={-1} className="overflow-visible fill-white">
                  <path
                    d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                    strokeWidth={0}
                  />
                </svg>
                <rect
                  fill="url(#1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84)"
                  width="100%"
                  height="100%"
                  strokeWidth={0}
                />
              </svg>
              <h2 className="text-3xl font-medium tracking-tight font-noto lg:leading-14 text-foreground sm:text-5xl">
                Everything you need to launch your learning platform, faster.{" "}
              </h2>
              <p className="mt-6 text-lg/7 font-ibm text-pretty text-foreground/85">
                Save weeks of engineering time and start creating courses,
                users, and workflows in minutes. Get Started today.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                <button className="cursor-pointer rounded-sm bg-gradient-to-b from-accent/65 border border-accent/95 from-5% to-accent hover:from-accent/60 transition-colors duration-200 ease-in-out px-5 py-[6px] text-xs/6 font-[550] font-noto text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600">
                  Get Started
                </button>
                <Link
                  href="/docs"
                  className="text-base/6 group flex items-center gap-2 font-medium text-foreground/90 hover:text-foreground"
                >
                  Read Docs
                  <span aria-hidden="true">
                    <FaArrowRightLong className="group-hover:translate-x-1 transition-all duration-200 ease-in-out" />
                  </span>
                </Link>
              </div>
            </div>
            <div className="relative mt-16 h-80 lg:mt-8 ">
              <img
                alt="App screenshot"
                src="/images/dashboard.png"
                width={1824}
                height={1080}
                className="absolute top-0 mask-t-from-80%  mask-b-from-60% mask-x-from-90% left-0 w-200 max-w-none shadow-2xl shadow-accent/50 rounded-md"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
