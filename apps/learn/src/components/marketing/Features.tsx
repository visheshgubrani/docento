'use client'

import { HiAcademicCap, HiChartBar, HiSparkles } from 'react-icons/hi2'
import { noisePattern } from '@/components/noise-pattern'
import { featuresData } from '@/config/marketing/home'

const featureIcons = [HiAcademicCap, HiChartBar, HiSparkles]
const featureStyles = [
  {
    gradient: 'from-[#dcd0ff] to-[#c4b8f0]', // lilac
    darkGradient: 'dark:from-[#4a3f6e] dark:to-[#3a2f5e]',
  },
  {
    gradient: 'from-[#9ca88f] to-[#7a8a6f]', // olive
    darkGradient: 'dark:from-[#333a2b] dark:to-[#26361b]',
  },
  {
    gradient: 'from-[#FADADD] to-[#f0c8cc]', // soft pink
    darkGradient: 'dark:from-[#5e3a3d] dark:to-[#4a2a2d]',
  },
]

export function Features() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
        <div className="flex flex-col gap-14">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                {featuresData.eyebrow}
              </span>
              <h2 className="text-foreground font-display text-[2rem]/10 tracking-tight text-pretty sm:text-5xl/[1.2]">
                {featuresData.headline}
              </h2>
            </div>
            <p className="max-w-2xl text-base/8 md:text-lg/8 text-foreground/75 text-pretty">
              {featuresData.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {featuresData.features.map((feature, index) => {
              const Icon = featureIcons[index]
              const style = featureStyles[index]
              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center text-center gap-4 rounded-xl border border-border dark:border-border/80 bg-muted/60 dark:bg-muted/40 p-6 py-6 md:px-6"
                >
                  <div
                    className={`relative flex size-16 items-center justify-center rounded-full overflow-hidden bg-gradient-to-b ${style.gradient} ${style.darkGradient}`}
                  >
                    <div
                      className="absolute inset-0 opacity-40 mix-blend-overlay dark:opacity-25"
                      style={{
                        backgroundPosition: 'center',
                        backgroundImage: noisePattern,
                      }}
                    />
                    <Icon className="relative size-7.5 text-foreground/75" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="text-foreground text-[1.4rem] font-display font-medium">
                      {feature.title}
                    </h3>
                    <p className="text-sm/7 text-foreground/75">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
