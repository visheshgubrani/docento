import React, { Suspense } from "react";
import { Hero, Features, CourseCatalogue, Stats, Testimonials, FAQ } from "@/components/marketing";

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center mx-auto w-full">
      <Hero />
      <Features />
      <Suspense fallback={<div className="p-10 text-center">Loading courses...</div>}>
        <CourseCatalogue />
      </Suspense>
      <Stats />
      <Testimonials />
      <FAQ />
    </main>
  );
}
