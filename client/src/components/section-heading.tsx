import React from "react";

interface SectionHeadingProps {
  tag?: string;
  heading: string;
  subheading: string;
  alignment?: "left" | "center";
}

export default function SectionHeading({
  tag,
  heading,
  subheading,
  alignment = "left",
}: SectionHeadingProps) {
  const isCentered = alignment === "center";
  const containerClasses = `max-w-3xl w-full ${
    isCentered ? "text-center" : "text-left"
  }`;

  const textContentClasses = `mt-4 font-noto text-base max-w-3xl text-pretty text-neutral-600 sm:text-lg/7 ${
    isCentered ? "lg:mx-auto" : ""
  }`;

  return (
    <div className={containerClasses}>
      {/* 1. Tag/Pill */}
      {tag && (
        <span className="inline-block rounded-full bg-gradient-to-r from-[#ddfcff]/25 to-[#fcfcdd]/40 px-4 py-1 text-xs/5 font-noto font-medium text-[#6444e6] ring-1 ring-accent-foreground/60 ring-inset">
          {tag}
        </span>
      )}

      {/* 2. Main Heading */}
      <h2 className="font-ibm mt-4 text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl lg:text-5xl/15">
        {heading}
      </h2>

      {/* 3. Subheading */}
      <p className={textContentClasses}>{subheading}</p>
    </div>
  );
}
