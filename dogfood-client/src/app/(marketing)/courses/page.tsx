import type { Metadata } from "next";
import React, { Suspense } from "react";
import { CourseCatalogue } from "@/components/marketing/CourseCatalogue";

export const metadata: Metadata = {
  title: "Courses",
  description: "Explore all courses on Acme Learning.",
};

export default function CoursesPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="p-10 text-center">Loading courses...</div>}>
        <CourseCatalogue enableSearch />
      </Suspense>
    </div>
  );
}
