"use client";

import Image from "next/image";
import { testimonialsData } from "@/config/marketing/home";

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

function TestimonialCard({ quote, name, role, avatar }: TestimonialCardProps) {
  return (
    <figure className="flex flex-col justify-between gap-10 rounded-lg border border-border dark:border-border/80 bg-muted/60 p-6 text-sm/7 text-foreground dark:bg-muted/40">
      <blockquote className="relative flex flex-col gap-4">
        <p>&ldquo;{quote}&rdquo;</p>
      </blockquote>
      <figcaption className="flex items-center gap-4">
        <div className="flex size-12 overflow-hidden rounded-full border border-border/70">
          <Image
            src={avatar}
            alt={name}
            width={160}
            height={160}
            className="size-full object-cover bg-white/75 dark:bg-black/75"
          />
        </div>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-foreground/75">{role}</p>
        </div>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
        <div className="flex flex-col gap-10 sm:gap-16">
          <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                {testimonialsData.eyebrow}
              </span>
              <h2 className="text-foreground font-display text-[2rem]/10 tracking-tight text-pretty sm:text-5xl/[1.2]">
                {testimonialsData.headline}
              </h2>
            </div>
            <p className="text-base/8 md:text-lg/8 text-foreground/75 text-pretty">
              {testimonialsData.subheadline}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonialsData.testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                quote={testimonial.quote}
                name={testimonial.name}
                role={testimonial.role}
                avatar={testimonial.avatar}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
