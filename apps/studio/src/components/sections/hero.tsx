"use client";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { FaGithub } from "react-icons/fa";
import React, { useState, useCallback } from "react";
import { motion, Variants } from "motion/react"; 
import Link from "next/link";
import Image from "next/image";
import BenefitsSection from "./benefits";

export default function HeroSection() {
  const ClipboardIcon = (props: any) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );

  const commandToCopy = "npm install docento";
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const tempInput = document.createElement("textarea");
    tempInput.value = commandToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand("copy");
      document.execCommand("copy");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy text: ", err);
    }
    document.body.removeChild(tempInput);
  }, [commandToCopy]);

  // Framer Motion Variants converted to Motion One compatible objects.
  // We must use the 'stagger' utility here for the left side to work.

  // 1. LEFT SIDE CONTAINER: Changed transition structure to use 'stagger' utility.

  const liftFade: Variants = {
    hidden: {
      opacity: 0,
      y: 16,
    },
    show: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay,
      },
    }),
  };

  const dashboardVariants: Variants = {
    hidden: {
      opacity: 0,
      filter: "blur(25px)",
      scale: 0.7,
    },
    show: {
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.05,
      },
    },
  };

  const videoPlayerVariants: Variants = {
    hidden: {
      opacity: 0,
      filter: "blur(30px)",
      scale: 0.8,
    },
    show: {
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.1,
      },
    },
  };

  return (
    <div className="relative w-full isolate overflow-hidden rounded-b-[2rem] bg-gradient-to-b from-white via-[#f9fbff] to-[#eceafc] shadow-[inset_0px_0px_29px_-4px_#d4d0f7]">
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
          className="aspect-1108/632 w-290 bg-linear-to-r from-[#e5fdfe] via-[#fefeec] to-[#f1eaff] to-20% opacity-70"
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-5 md:pt-4   lg:flex lg:px-8 ">
        {/* LEFT SIDE */}
        <div className="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:pt-8">
          <div className="mt-10 md:mt-32 lg:mt-16">
            <a href="#" className="inline-flex space-x-3 sm:space-x-5">
              <span className="rounded-full bg-neutral-50 px-2 sm:px-4 py-1 text-xs/5 font-noto font-medium text-[#6444e6] ring-1 ring-accent-foreground/60 ring-inset">
                Introducing Docento
              </span>
            </a>
          </div>

          {/* HERO HEADING */}
          <h1 className="hero-heading space-y-1 mt-8 max-w-3xl font-ibm text-4xl font-medium tracking-tight sm:text-5xl">
            <span data-text="Headless">Headless</span>{" "}
            <span data-text="LMS">LMS</span>{" "}
            <span data-text="infrastructure">infrastructure</span>{" "}
            <span data-text="to">to</span> <span data-text="build">build</span>{" "}
            <span data-text="faster">faster</span>
          </h1>

          <motion.p
            // variants={liftFade}
            initial="hidden"
            animate="show"
            custom={0.3}
            className="mt-6 font-noto text-lg max-w-2xl text-pretty text-foreground sm:text-lg/7.5"
          >
            Tired of rigid LMS platforms? Our headless system gives you the
            building blocks you need to create a fully branded experience and
            ship features in less time.
          </motion.p>

          <motion.div
            // variants={liftFade}
            initial="hidden"
            animate="show"
            custom={0.4}
            className="mt-8 flex items-center gap-x-6"
          >
            <Link
              href="/docs"
              className="rounded-sm bg-gradient-to-b from-accent/85 border border-accent-foreground ring-white ring-2 from-5% to-accent hover:from-accent/65 hover:ring-accent transition-all duration-200 ease-in-out px-4 py-2 text-sm font-[550] font-noto text-white shadow-xs"
            >
              Start for free
            </Link>
            <Link
              href="/docs"
              className="group text-sm/6 inline-flex items-center gap-1 font-noto font-semibold text-foreground/80"
            >
              <span className="group-hover:text-foreground">Read Docs</span>
              <ArrowRightIcon className="size-4 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
            </Link>
          </motion.div>

          <motion.div
            // variants={liftFade}
            initial="hidden"
            animate="show"
            custom={0.4}
            className="mt-12 flex items-center shadow-md justify-between rounded-md bg-neutral-50 border border-muted-foreground/20 p-3 max-w-[23rem]"
          >
            <code className="text-sm font-mono font-[450] text-gray-800 select-all">
              {commandToCopy}
            </code>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopy}
                className="inline-flex items-center rounded-md p-2 bg-neutral-200/60 text-foreground/60 hover:text-foreground transition-all duration-200"
              >
                {isCopied ? "Copied!" : <ClipboardIcon className="size-5" />}
              </button>
              <FaGithub className="size-6 text-foreground/70 hover:text-foreground cursor-pointer" />
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative mx-auto mt-16 pt-8 flex flex-col items-center justify-center max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-16">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            {/* Dashboard Image */}
            <motion.img
              alt="App screenshot"
              src="/images/dashboard.png"
              width={2432}
              height={1442}
              className="will-change-[opacity,filter,transform] w-207 select-none rounded-md  shadow-xl"
              // variants={dashboardVariants}
              initial="hidden"
              animate="show"
            />
          </div>
          {/* Video Player Image */}

          <div className="lg:absolute lg:top-0 lg:left-0 w-full h-full">
            <motion.img
              alt="Video player screenshot"
              src="/images/video-player.png"
              width={400}
              height={400}
              className="will-change-[opacity,filter,transform] lg:absolute select-none lg:mt-0 mt-8 lg:-bottom-10 lg:-left-70 w-full lg:w-110 rounded-md shadow-2xl ring-4 ring-white"
              // variants={videoPlayerVariants}
              initial="hidden"
              animate="show"
            />
          </div>
        </div>
      </div>
      <div className="mt-10 pb-20 xl:pb-24">
        <BenefitsSection />
      </div>
    </div>
  );
}
