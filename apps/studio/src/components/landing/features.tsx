"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { SectionHeader } from "./section-header";
import { HiMiniSquaresPlus, HiMiniArrowsPointingOut } from "react-icons/hi2";
import {
  BsFillPlayBtnFill,
  BsFillQuestionCircleFill,
  BsFillFileEarmarkFill,
  BsFillAwardFill,
} from "react-icons/bs";
import {
  HiMiniCpuChip,
  HiMiniChatBubbleLeftRight,
  HiMiniMicrophone,
} from "react-icons/hi2";
import {
  HiMiniUsers,
  HiMiniChartBar,
  HiMiniCurrencyDollar,
  HiMiniChartPie,
  HiMiniUser,
} from "react-icons/hi2";
import { GridPattern } from "@/components/GridPattern";
import { noiseOverlayStyles } from "@/components/noise-pattern";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/* ============================================
   COURSE BUILDER SECTION
============================================ */
const courseBuilderFeatures = [
  {
    icon: HiMiniSquaresPlus,
    label: "Structured courses",
  },
  { icon: HiMiniArrowsPointingOut, label: "Drag & drop content" },
  { icon: BsFillPlayBtnFill, label: "Video, text, images & PDFs" },
  { icon: BsFillQuestionCircleFill, label: "Quizzes & assessments" },
  { icon: BsFillFileEarmarkFill, label: "Downloadable resources" },
  { icon: BsFillAwardFill, label: "Completion certificates" },
];

export function CourseBuilderSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:pr-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:pr-8"
          >
            <SectionHeader
              badge="Course Builder"
              title={<>Build courses your way</>}
              description="Create beautifully structured courses with our flexible content builder. Organize lessons into modules, add any type of content, and deliver engaging learning experiences."
              align="left"
              className="mb-8"
              animated={false}
            />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 pt-4 sm:grid-cols-2 gap-5"
            >
              {courseBuilderFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="flex items-center gap-3 p-3 rounded-sm bg-muted/90 border border-accent-100/50"
                >
                  <feature.icon className="w-5 h-5 text-foreground/90 shrink-0" />
                  <span className="text-sm font-inter text-foreground">
                    {feature.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Visual - sticks to right edge */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative scale-110 lg:-mr-[calc((100vw-80rem)/0.9+1.5rem)]"
          >
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-b from-accent-400 to-accent-200">
              <div
                className="absolute inset-0 opacity-30 mix-blend-overlay"
                style={noiseOverlayStyles}
              />
              <div className="relative pl-[min(10%,1.5rem)] py-[min(10%,1.5rem)]">
                <div className="relative overflow-hidden rounded-tl-md border-l border-t border-black/10 bg-white">
                  <Image
                    alt="Course Builder Screenshot"
                    src="/images/landing/course-builder.png"
                    width={2432}
                    height={1442}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="w-full max-w-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   AI TOOLS SECTION
============================================ */
const aiFeatures = [
  {
    icon: HiMiniCpuChip,
    title: "Course Outline Generation",
    description:
      "Enter a topic and let AI create a complete course structure with modules and lessons.",
    image: "/images/landing/course-outline.svg",
  },
  {
    icon: HiMiniMicrophone,
    title: "Automatic Subtitles",
    description:
      "AI-powered transcription and subtitle generation for all your video content.",
    image: "/images/landing/subtitles.png",
  },
  {
    icon: HiMiniChatBubbleLeftRight,
    title: "Quiz Generation",
    description:
      "Automatically generate quizzes from your lesson content to test student comprehension.",
    image: "/images/landing/generate-quiz.svg",
  },
];

export function AIToolsSection() {
  return (
    <section className="relative bg-accent-50/95 w-full py-20 md:py-28 overflow-hidden">
      <GridPattern
        className="absolute inset-0 h-full w-full fill-accent-100/40 stroke-neutral-200/60"
        style={{
          maskImage:
            "linear-gradient(to bottom left, white 50%, transparent 70%)",
          WebkitMaskImage:
            "linear-gradient(to bottom left, white 50%, transparent 70%)",
        }}
        yOffset={-256}
      />
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeader
          badge="AI-Powered"
          title="Let AI do the heavy lifting"
          description="Create courses faster with AI assistance. Generate outlines, quizzes, and subtitles automatically."
          align="center"
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid lg:grid-cols-3 gap-8 lg:gap-5"
        >
          {aiFeatures.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative flex flex-col rounded-md bg-white/80 backdrop-blur-sm border-2 border-neutral-200 hover:bg-white hover:border-accent-500/30 transition-all duration-500 overflow-hidden"
            >
              {/* Image on top */}
              <div className="relative w-full aspect-[16/9] bg-accent-100">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>

              {/* Content */}
              <div className="px-6 pt-6 pb-5">
                {/* Icon and Title flexed together */}
                <div className="flex items-center gap-3 mb-3">
                  <feature.icon className="w-6 h-6 text-foreground/90 shrink-0" />
                  <h3 className="font-inter font-semibold text-lg lg:text-xl text-foreground">
                    {feature.title}
                  </h3>
                </div>

                {/* Description below */}
                <p className="text-base text-neutral-600 font-inter leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================
   DASHBOARD SECTION
============================================ */
const dashboardFeatures = [
  { icon: HiMiniUsers, label: "Students & enrollments" },
  { icon: HiMiniChartBar, label: "Course completion rates" },
  { icon: HiMiniCurrencyDollar, label: "Revenue analytics" },
  { icon: HiMiniChartPie, label: "Engagement metrics" },
  { icon: HiMiniUser, label: "Individual progress" },
  { icon: HiMiniCpuChip, label: "Real-time insights" },
];

export function DashboardSection() {
  return (
    <section className="w-full py-20 md:py-28 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:pl-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Visual - sticks to left edge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="relative order-2 lg:order-1 lg:-ml-[calc((100vw-80.5rem)/2+0.1rem)]"
          >
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-b from-accent-400 to-accent-200">
              <div
                className="absolute inset-0 opacity-30 mix-blend-overlay"
                style={noiseOverlayStyles}
              />
              <div className="relative pr-[min(10%,1.5rem)] py-[min(10%,1.5rem)]">
                <div className="relative overflow-hidden rounded-tr-md border-r border-t border-black/10 bg-white">
                  <Image
                    alt="Dashboard Screenshot"
                    src="/images/landing/dashboard.png"
                    width={2432}
                    height={1442}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="w-full max-w-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2 lg:pl-8"
          >
            <SectionHeader
              badge="Analytics Dashboard"
              title="See everything at a glance"
              description="Track student progress, monitor course performance, and grow your revenue with powerful analytics built right in."
              align="left"
              className="mb-8"
              animated={false}
            />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 pt-4 sm:grid-cols-2 gap-5"
            >
              {dashboardFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="flex items-center gap-3 p-3 rounded-sm bg-muted/90 border border-accent-100/50"
                >
                  <feature.icon className="w-5 h-5 text-foreground/90 shrink-0" />
                  <span className="text-sm font-inter text-foreground">
                    {feature.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
