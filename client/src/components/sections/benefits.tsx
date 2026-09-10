"use client";

import Image from "next/image";

const benefits = [
  {
    name: "Skip the LMS complexity",
    description:
      "Avoid the heavy limitations of traditional LMS platforms with a simple, flexible, API-first foundation.",
    image: "/images/icons/complex.svg",
    imageClassName: "size-12",
  },
  {
    name: "Launch faster",
    description:
      "Go from idea to production quickly using ready-made components and a streamlined content workflow.",
    image: "/images/icons/launch.svg",
    imageClassName: "size-13",
  },
  {
    name: "Build your own brand",
    description:
      "Create a fully custom learning experience in any framework while we handle the backend infrastructure.",
    image: "/images/icons/paint.svg",
    imageClassName: "size-12",
  },
  {
    name: "Save development time",
    description:
      "Use AI tools, templates, and clean APIs to ship features faster without rebuilding core LMS logic.",
    image: "/images/icons/time.svg",
    imageClassName: "size-9",
  },
];

export default function BenefitsSection() {
  return (
    <section className="relative w-full overflow-hidden z-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mt-18">
          <dl className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.name}
                className="flex flex-col items-center text-center"
              >
                {/* Image */}
                <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-white border-secondary border-2">
                  <Image
                    src={benefit.image}
                    alt={benefit.name}
                    width={45}
                    height={45}
                    className={`object-contain ${benefit.imageClassName ?? ""}`}
                  />
                </div>

                {/* Title */}
                <dt className="text-[1.12rem] font-noto font-[520] text-foreground">
                  {benefit.name}
                </dt>

                {/* Description */}
                <dd className="mt-3 text-[1rem] font-ibm text-foreground/80">
                  {benefit.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
