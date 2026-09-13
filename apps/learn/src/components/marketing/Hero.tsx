'use client'

import Link from 'next/link'
import { heroData } from '@/config/marketing/home'
import { ProductFrame, ProductPreview } from './ProductPreview'
import { FaGithub } from 'react-icons/fa6'
import { HiArrowRight } from 'react-icons/hi2'

export function Hero() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col gap-24">
            <div className="flex flex-col items-start gap-6">
              <h1 className="max-w-5xl text-balance font-display text-5xl/[1] tracking-tight text-foreground sm:text-[5rem]/[1]">
                {heroData.headline}
              </h1>

              <p className="max-w-3xl text-lg/8 text-foreground/75">
                {heroData.subheadline}
              </p>

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

            <ProductFrame>
              <ProductPreview />
            </ProductFrame>
          </div>
        </div>
      </div>
    </section>
  )
}
