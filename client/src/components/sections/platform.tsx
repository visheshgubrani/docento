"use client";
import SectionHeading from "@/components/section-heading";
import Features from "../features-verticle";
import Image from "next/image";
import { HiMiniUsers } from "react-icons/hi2";
import { SiAuthy } from "react-icons/si";
import { SiGoogleanalytics } from "react-icons/si";

const platformFeatures = [
  {
    id: 1,
    title: "User management",
    content:
      "Create and manage learners, instructors, and teams using flexible, scalable APIs built for growing platforms.",
    image: "/images/user-management.png",
    icon: <HiMiniUsers className="size-9 text-accent" />,
  },
  {
    id: 2,
    title: "Auth & permissions",
    content:
      "Secure access with role-based permissions and fine-grained control over content, actions, and user roles.",
    image: "/images/authentication.png",
    icon: <SiAuthy className="size-9 text-accent" />,
  },
  {
    id: 3,
    title: "Analytics",
    content:
      "Track engagement, progress, and completions with clear, actionable insights across courses and learners.",
    image: "/images/analytics.png",
    icon: <SiGoogleanalytics className="size-7 text-accent" />,
  },
];


const platformSecondaryFeatures = [
  {
    id: 4,
    title: "White labeling",
    description:
      "Remove Docento branding and make the learning experience feel fully yours, aligned with your product and visual identity.",
    image: "/images/icons/label.svg",
    imageClassName: "size-10",
  },
  {
    id: 5,
    title: "No vendor lock-in",
    description:
      "Use Docento as infrastructure. Your frontend, data, and business logic stay fully under your control.",
    image: "/images/icons/noLock.svg",
    imageClassName: "size-9",
  },
  {
    id: 6,
    title: "Pricing control",
    description:
      "Define access rules, plans, and entitlements through flexible APIs that adapt to how your business sells and delivers learning.",
    image: "/images/icons/price.svg",
    imageClassName: "size-12",
  },
];



export function PlatformSection() {
  return (
    <section className="relative bg-muted overflow-hidden isolate z-10 w-full py-16 md:py-24">
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
        <svg x="50%" y={-1} className="overflow-visible fill-neutral-50">
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
      <div
        aria-hidden="true"
        className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
      >
        <div
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
          className="aspect-1108/632 w-290 bg-linear-to-r from-[#e7fdfe] via-[#fdfded] to-[#f1eaffe2] to-20% opacity-70"
        />
      </div>
      <div className="mx-auto max-w-[82rem] z-20 px-4 sm:px-6 lg:px-8">
        <SectionHeading
          tag="Platform"
          heading="Everything to run your learning product"
          subheading="Core platform capabilities that power authentication, access control, analytics, and branding. Designed for headless use, so you stay in control of the experience."
          alignment="left"
        />

        <div className="mx-auto mt-16">
          <Features data={platformFeatures} />
        </div>

        <div className="mt-10 md:mt-28 grid grid-cols-1 w-full mx-auto gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {platformSecondaryFeatures.map((feature) => (
            <div
              key={feature.id}
              className="flex flex-col items-center justify-center text-center"
            >
              {/* Image circle */}
              <div className="mb-5 flex size-18 items-center justify-center rounded-full bg-white border-secondary border-2">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={45}
                  height={45}
                  className={`object-contain ${feature.imageClassName ?? ""}`}
                />
              </div>

              {/* Title */}
              <h3 className="text-[1.12rem] font-noto font-[520] text-foreground">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-[1.03rem] font-ibm text-foreground/70">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
