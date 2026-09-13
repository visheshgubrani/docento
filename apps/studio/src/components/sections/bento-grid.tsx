"use client";

import Image from "next/image";
import SectionHeading from "../section-heading";
import { cn } from "@/lib/utils";

const cardData = [
  {
    title: "Learning Progress",
    description:
      "Track how learners move through content. Monitor progress across lessons and courses.",
    imageSrc: "/images/progress.png",
    alt: "progress-bento-illustration",
    imageClassName: "mask-b-from-40% translate-y-2",
    imageAspectClass: "aspect-[5/3]",
  },
  {
    title: "Certificates",
    description:
      "Recognize achievement automatically. Issue certificates when learners complete courses.",
    imageSrc: "/images/cert.png",
    alt: "certificate-bento-illustration",
    imageClassName: "mask-b-from-70%",
    imageAspectClass: "aspect-[5/3]",
  },
  {
    title: "Quizzes & Assignments",
    description:
      "Test understanding with quizzes and assignments. Validate learning at every step.",
    imageSrc: "/images/quiz.png",
    alt: "quiz-bento-illustration",
    imageClassName: "mask-b-from-80% mask-t-from-80% mask-r-from-70%",
    imageAspectClass: "aspect-[5/3]",
  },
  {
    title: "Video Lessons",
    description:
      "Deliver smooth video learning experiences. Stream lessons reliably across devices. Support adaptive playback, progress tracking, and secure hosting.",
    imageSrc: "/images/video.png",
    alt: "video-bento-illustration",
    imageClassName: "mask-b-from-80% mask-r-from-80% translate-y-3",
    featured: true,
    imageAspectClass: "aspect-[5/2]",
  },
  {
    title: "Mobile Friendly",
    description:
      "Built for every screen. Deliver learning experiences that work smoothly on mobile.",
    imageSrc: "/images/mobile.png",
    alt: "mobile-bento-illustration",
    imageClassName: "mask-y-from-70%",
    imageAspectClass: "aspect-[5/4.1]",
  },
  {
    title: "Lesson Completion",
    description:
      "Show what's done at a glance. Mark videos and lessons as completed automatically.",
    imageSrc: "/images/completion.png",
    alt: "completion-bento-illustration",
    imageClassName: "mask-b-from-60% mask-x-from-90% mask-t-from-60%",
    imageAspectClass: "aspect-[5/3]",
  },
  {
    title: "AI Notes",
    description:
      "Turn lessons into clear notes. Generate summaries from learning content.",
    imageSrc: "/images/ai.png",
    alt: "ai-bento-illustration",
    imageClassName: "mask-t-from-30%  mask-x-from-95% mask-b-from-70%",
    imageAspectClass: "aspect-[5/3]",
  },
  {
    title: "Structured Courses",
    description:
      "Organize learning clearly. Build courses with modules, lessons, and flexible flows.",
    imageSrc: "/images/courses.png",
    alt: "structure-bento-illustration",
    imageClassName: "mask-x-from-90% mask-b-from-80% mask-t-from-85%",
    imageAspectClass: "aspect-[5/3]",
  },
];

export function BentoSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          tag="Core Features"
          heading="Everything you need to build a complete LMS"
          subheading="Docento building blocks are designed to help you create modern learning experiences without the usual constraints."
          alignment="left"
        />

        <div className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {cardData.map((card, index) => (
            <article
              key={index}
              className={cn(
                "rounded-xl border border-border bg-muted shadow-md",
                card.featured && "xl:col-span-2"
              )}
            >
              {/* Text */}
              <div className="p-5">
                <h3 className="mb-2 text-[1.05rem] font-semibold leading-snug">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/85">
                  {card.description}
                </p>
              </div>

              {/* Image */}
              <div className=" bg-white pb-5 rounded-xl">
                <div
                  className={cn(
                    "w-full overflow-hidden rounded-xl",
                    card.imageAspectClass
                  )}
                >
                  <Image
                    src={card.imageSrc}
                    alt={card.alt}
                    width={600}
                    height={450}
                    className={cn(
                      "h-full w-full object-contain",
                      card.imageClassName
                    )}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
