"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import SectionHeading from "../section-heading";
import { CodeEditor } from "@/components/ui/shadcn-io/code-editor";
import { Code } from "lucide-react";
import { GrCube } from "react-icons/gr";
import { LuWebhook } from "react-icons/lu";
import { MdOutlinePayment, MdOutlineViewQuilt } from "react-icons/md";
import { IoMdLogIn } from "react-icons/io";
import { FaArrowRightLong } from "react-icons/fa6";
import { IoShieldCheckmark } from "react-icons/io5";
import { Logo } from "../Logo";

const benefits = [
  {
    name: "APIs First",
    description:
      "Everything is API driven. Build, extend, and control your LMS from any frontend, framework, or platform with full flexibility.",
    image: "/images/icons/api.svg",
    imageClassName: "size-11",
  },
  {
    name: "Official SDKs",
    description:
      "Move faster with official SDKs that wrap our APIs into clean, well-documented, and easy-to-use developer tools.",
    image: "/images/icons/sdk.svg",
    imageClassName: "w-9 h-9",
  },
  {
    name: "Real-time Webhooks",
    description:
      "Receive instant events for enrollments, progress, completions, and content updates to keep systems perfectly in sync.",
    image: "/images/icons/webhook.svg",
    imageClassName: "size-11",
  },
  {
    name: "Headless CMS",
    description:
      "Manage structured courses, lessons, and content without coupling to any frontend or presentation layer.",
    image: "/images/icons/cms.svg",
    imageClassName: "w-9 h-9",
  },
  {
    name: "Security by Design",
    description:
      "Built-in authentication, permissions, and secure access patterns designed for production-ready learning platforms.",
    image: "/images/icons/lock.svg",
    imageClassName: "size-9",
  },
  {
    name: "Works with Your Payment Stack",
    description:
      "Stay payment agnostic. Handle payments your way and notify us via APIs when enrollments are completed.",
    image: "/images/icons/payment.svg",
    imageClassName: "w-10 h-10",
  },
];


export function CodeExample() {
  return (
    <section className="bg-white relative overflow-hidden isolate z-10 w-full py-16 md:py-24">
      <div
        aria-hidden="true"
        className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
      >
        <div
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
          className="aspect-1108/632 w-290 bg-linear-to-r from-[#e4fcfe] via-[#ffffe3] to-[#f7f3ff] to-20% opacity-70"
        />
      </div>

      <div className="mx-auto max-w-7xl z-20 px-6 lg:px-8">
        <SectionHeading
          tag="Built for developers"
          heading="Ship faster with easy-to-use APIs"
          subheading="We handle the complex parts of content delivery, user flows, and learning infrastructure so your team can focus on building. Skip the heavy LMS setup and ship custom learning products on a single, developer-friendly platform."
          alignment="left"
        />
        <div className="mt-12 p-px w-full mx-auto relative">
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[40%_20%_40%] lg:gap-0">
            {/* 1. Request Panel */}
            <div className="flex justify-center lg:justify-end">
              {" "}
              <CodeEditor
                writing={false} // Disables animation
                className="w-full lg:mask-b-from-60% max-w-[30rem] rounded-md border border-accent-foreground/20 bg-white ring-4 ring-black/10"
                lang="typescript"
                title="Request"
                icon={<Code />}
                copyButton
              >
                {`import { Docento } from "docento";

const docento = new Docento({
  token: "EDURAL_API_KEY",
});

const course = await docento.courses.create({
  title: "Intro to Design Systems",
});

console.log(course.id);`}
              </CodeEditor>
            </div>

            {/* 2. Connector + Icon */}
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center lg:flex-row w-full">
                {/* Left dashed line */}
                <div className="relative -z-[1] h-8 border-l border-dashed border-gray-400 lg:h-0 lg:w-full lg:border-t"></div>

                {/* Icon box */}
                <div className="relative flex w-24 h-18 shrink-0 items-center justify-center rounded-[6px] border border-black/15 bg-white ring-5 ring-[#a09f9f2c]">
                  {/* Shimmer */}
                  <div className="lg:block hidden">
                    <div className="absolute -inset-[4px] isolate -z-[1] rotate-90 overflow-hidden rounded-[6px] lg:rotate-0">
                      <div className="size-full bg-[linear-gradient(90deg,transparent_10%,#7c62e1_50%,transparent_90%)] animate-[slide_1.9s_infinite]"></div>
                    </div>
                  </div>
                  {/* LOGO */}
                  <h3 className="font-semibold text-lg font-noto">
                    <Logo showWordmark={false} />
                  </h3>
                </div>

                {/* Right dashed line */}
                <div className="relative -z-[1] h-8 border-l border-dashed border-gray-400 lg:h-0 lg:w-full lg:border-t"></div>
              </div>
            </div>

            {/* 3. Response Panel */}
            <div className="flex  justify-center lg:justify-start">
              {" "}
              <CodeEditor
                writing={false} // Disables animation
                className="w-full lg:mask-b-from-60% max-w-[30rem] rounded-md border border-accent-foreground/20 bg-white ring-4 ring-black/10"
                lang="json"
                title="Response"
                icon={<Code />}
                copyButton
              >
                {`{
  "id": "course_123",
  "title": "Intro to Design Systems",
  "status": "draft",
  "createdAt": "2025-01-12T10:33:21Z"
}`}
              </CodeEditor>
            </div>
          </div>

          <div className="mx-auto my-10 max-w-3xl lg:max-w-none">
            <dl className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 md:gap-14">
              {benefits.map((benefit) => (
                <div
                  key={benefit.name}
                  className="flex relative w-full flex-col items-center text-center gap-2 "
                >
                  {/* Image */}
                  <div className="relative z-10 mb-5 flex size-20 items-center justify-center rounded-full bg-secondary border-2 border-secondary">
                    <Image
                      src={benefit.image}
                      alt={benefit.name}
                      width={45}
                      height={45}
                      className={`object-contain ${
                        benefit.imageClassName ?? ""
                      }`}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="relative z-10 text-[1.06rem] font-noto font-medium text-foreground">
                    {benefit.name}
                  </h3>

                  {/* Description */}
                  <p className="relative z-10 text-sm text-foreground/80 font-ibm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
