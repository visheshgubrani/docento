"use client";

import SectionHeading from "../section-heading";
import {
  Briefcase,
  GraduationCap,
  ShoppingCart,
  Users,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

export function UseCases() {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({
      left: -340,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({
      left: 340,
      behavior: "smooth",
    });
  };

  const useCases = [
    {
      title: "Corporate Training",
      icon: Briefcase,
      shortDescription:
        "Deliver scalable team training programs with tracking, assessments, certifications, and compliance reporting.",
      longDescription:
        "Deliver scalable, enterprise-grade training programs with centralized content, learner tracking, assessments, certifications, and compliance reporting. Empower teams to upskill faster while maintaining full visibility across departments.",
      image: "/images/work1.jpg",
    },
    {
      title: "EdTech Platforms",
      icon: GraduationCap,
      shortDescription:
        "Build and scale modern learning platforms using flexible APIs, SDKs, and modular infrastructure designed for growth.",
      longDescription:
        "Build and scale modern learning platforms using flexible APIs, SDKs, and modular infrastructure. Focus on innovation while Docento handles users, content delivery, analytics, and performance.",
      image: "/images/work2.jpg",
    },
    {
      title: "Sell Online Courses",
      icon: ShoppingCart,
      shortDescription:
        "Create, package, and sell digital courses with built-in checkout, secure hosting, and automated learner enrollments.",
      longDescription:
        "Create, market, and sell digital courses with built-in checkout, secure content hosting, automated enrollments, and learner management — all designed to scale with your business.",
      image: "/images/work3.jpg",
    },
    {
      title: "Membership Communities",
      icon: Users,
      shortDescription:
        "Build premium learning communities that combine content, discussions, live events, and gated access.",
      longDescription:
        "Launch premium communities that combine structured learning, discussions, live events, and gated access. Deliver ongoing value through memberships without stitching multiple tools together.",
      image: "/images/work4.jpg",
    },
    {
      title: "Cohort-Based Courses",
      icon: BookOpen,
      shortDescription:
        "Run structured, time-bound cohort programs with collaboration, accountability, and progress tracking built in.",
      longDescription:
        "Run structured, time-bound cohort programs with schedules, assignments, live sessions, and progress tracking. Enable collaboration and accountability while scaling effortlessly.",
      image: "/images/work5.jpg",
    },
    {
      title: "Internal Training Systems",
      icon: Layers,
      shortDescription:
        "Power employee onboarding and continuous skill development with a modern, customizable LMS foundation.",
      longDescription:
        "Power employee onboarding and continuous skill development with a customizable LMS foundation. Give teams everything they need without the complexity of traditional enterprise systems.",
      image: "/images/work6.jpg",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-secondary to-white shadow-[inset_0px_20px_30px_-16px_#e1defc] rounded-t-[2rem] relative overflow-hidden isolate z-10 w-full  py-16 md:pb-20 pt-24">
        <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200"
      >
        <defs>
          <pattern
            x="50%"
            y={-1}
            id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
            width={200}
            height={200}
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <svg x="50%" y={-1} className="overflow-visible fill-accent-foreground/10">
          <path
            d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
          width="100%"
          height="100%"
          strokeWidth={0}
        />
      </svg>
      {/* Heading container (constrained) */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex md:flex-row flex-col items-start justify-between gap-2 md:gap-6">
          <SectionHeading
            tag="Works for all"
            heading="Built to power any learning business"
            subheading="Whether you're training teams, building an edtech product, or selling courses online, Docento adapts to your workflow, not the other way around."
            alignment="left"
          />

          {/* Scroll buttons */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={scrollLeft}
              aria-label="Scroll left"
              className="size-11 rounded-full border border-black/20 
                         flex items-center justify-center
                         bg-[#f9f9f9] hover:bg-[#eeeeee] transition"
            >
              <ChevronLeft className="size-5" />
            </button>

            <button
              onClick={scrollRight}
              aria-label="Scroll right"
              className="size-11 rounded-full border border-black/20 
                         flex items-center justify-center
                         bg-[#f9f9f9] hover:bg-[#eeeeee] transition"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div ref={scrollRef} className="mt-12 overflow-x-auto hide-scrollbar">
        <div className="flex w-max gap-6">
          {/* LEFT SPACER */}
          <div className="shrink-0 w-0.5 md:w-6 lg:w-[calc((100vw-1280px)/2+0.4rem)]" />

          {useCases.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="group relative isolate  flex flex-col justify-end
                           min-w-[300px] max-w-md h-[380px]
                           overflow-hidden rounded-2xl"
              >
                {/* Background Image */}
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                />

                {/* Default gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-300 group-hover:opacity-0" />

                {/*  content */}
                <div className="relative z-10 p-6">
                  <h3 className="text-[1.6rem] font-allerta font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-200/85 leading-normal font-noto">
                    {item.shortDescription}
                  </p>
                </div>

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4
                             bg-gradient-to-br from-accent via-accent-foreground to-accent
                             p-6 text-center text-white
                             opacity-0 transition-opacity duration-500
                             group-hover:opacity-100"
                >
                  <Icon className="w-8 h-8 mb-4" />
                  <p className="text-sm font-noto leading-relaxed max-w-xs">
                    {item.longDescription}
                  </p>
                </div>
              </article>
            );
          })}

          {/* RIGHT SPACER */}
          <div className="shrink-0 w-0.5 md:w-6 lg:w-[calc((100vw-1280px)/2+0.5rem)]" />
        </div>
      </div>
    </section>
  );
}
