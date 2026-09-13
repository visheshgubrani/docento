"use client";

import { StaticSectionHeader } from "@/components/landing";
import { GridPattern } from "@/components/GridPattern";
import {
  HiOfficeBuilding,
  HiMail,
  HiUser,
  HiPhone,
  HiChat,
} from "react-icons/hi";
import Link from "next/link";
import { MdKeyboardArrowLeft } from "react-icons/md";
import { Logo } from "@/components/Logo";
import { FaMapPin } from "react-icons/fa";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};


export default function ContactUs() {
  return (
    <div className="relative z-0 bg-gradient-to-b from-accent-400 to-accent-50/80 flex flex-col items-center justify-center w-full mx-auto overflow-hidden min-h-screen">
      {/* Grid Pattern Background */}
      <div className="absolute -z-[1] inset-0 overflow-hidden pointer-events-none">
        <GridPattern
          className="absolute inset-0 h-full w-full fill-accent-100/20 stroke-neutral-300/50"
          style={{
            maskImage:
              "linear-gradient(to bottom left, white 40%, transparent 50%)",
            WebkitMaskImage:
              "linear-gradient(to bottom left, white 40%, transparent 50%)",
          }}
          yOffset={-330}
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
      >
        <div
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
          className="aspect-1108/632 w-290 bg-linear-to-r from-[#e3fcfe] via-[#fcfcdd] to-[#f0e9ff] to-20% opacity-50"
        />
      </div>
      <Link
        href="/"
        className="group absolute top-0 left-0 hidden md:flex gap-0.5 items-center p-6 font-semibold"
      >
        <MdKeyboardArrowLeft className="text-foreground/80 group-hover:-translate-x-1 transition-all duration-200 ease-in-out" />
        <span className="text-foreground/80 group-hover:underline">Home</span>
      </Link>
      <div className="flex items-center w-full flex-col justify-center px-4 py-4 sm:py-6 sm:px-6">
        <div className="max-w-6xl w-full mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
          >
            {/* Left Side - Info */}
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-b from-accent-200 to-white sm:p-6 p-4 md:py-10 md:px-8 border border-neutral-300 shadow-lg shadow-accent-300 rounded-3xl"
            >
              <Logo showWordmark={false} />
              <div className="mt-6">
                <StaticSectionHeader
                  badge="Contact Us"
                  title="Let's talk"
                  description="Whether you're curious about Docento or need help with something, we'd love to hear from you."
                  align="left"
                  className="mb-0"
                />
              </div>

              <dl className="mt-8 space-y-4 text-base/7 text-gray-600">
                <div className="flex gap-x-4">
                  <dt className="flex-none">
                    <span className="sr-only">Address</span>
                    <FaMapPin
                      aria-hidden="true"
                      className="h-6 w-6 text-gray-600"
                    />
                  </dt>
                  <dd>
                    India
                  </dd>
                </div>
                <div className="flex gap-x-4">
                  <dt className="flex-none">
                    <span className="sr-only">Email</span>
                    <HiMail aria-hidden="true" className="h-6 w-6 text-gray-600" />
                  </dt>
                  <dd>
                    <a
                      href="mailto:support@docento.dev"
                      className="hover:text-gray-700"
                    >
                      support@docento.dev
                    </a>
                  </dd>
                </div>
              </dl>
            </motion.div>

            {/* Right Side - Form */}
            <motion.div
              variants={cardVariants}
              className="bg-gradient-to-b from-accent-100/80 to-white sm:p-6 p-4 md:py-10 md:px-8 border border-neutral-300 shadow-lg shadow-accent-300 rounded-3xl"
            >
              <form action="#" method="POST">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                        <HiUser className="size-5" />
                      </span>
                      <input
                        id="first-name"
                        name="first-name"
                        type="text"
                        autoComplete="given-name"
                        placeholder="First name"
                        className="block w-full rounded-lg bg-white/75 pl-10 pr-3 py-2.5 text-base text-gray-900 border border-foreground/15 placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                        <HiUser className="size-5" />
                      </span>
                      <input
                        id="last-name"
                        name="last-name"
                        type="text"
                        autoComplete="family-name"
                        placeholder="Last name"
                        className="block w-full rounded-lg bg-white/75 pl-10 pr-3 py-2.5 text-base text-gray-900 border border-foreground/15 placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                        <HiMail className="size-5" />
                      </span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Email address"
                        className="block w-full rounded-lg bg-white/75 pl-10 pr-3 py-2.5 text-base text-gray-900 border border-foreground/15 placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                        <HiPhone className="size-5" />
                      </span>
                      <input
                        id="phone-number"
                        name="phone-number"
                        type="tel"
                        autoComplete="tel"
                        placeholder="Phone number"
                        className="block w-full rounded-lg bg-white/75 pl-10 pr-3 py-2.5 text-base text-gray-900 border border-foreground/15 placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-neutral-500">
                        <HiChat className="size-5" />
                      </span>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        placeholder="Your message"
                        className="block w-full rounded-lg bg-white/75 pl-10 pr-3 py-2.5 text-base text-gray-900 border border-foreground/15 placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6"
                        defaultValue={""}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-foreground/90 font-noto px-5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-foreground/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground/80"
                  >
                    Send message
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
