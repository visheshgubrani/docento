import type { Metadata } from "next";
import { fetchAPI } from "@/lib/fetch-api";

type StorefrontCourseResponse = {
  data?: {
    course?: {
      title?: string | null;
    };
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Course Details",
    description: "View course details and syllabus on Acme Learning.",
  };

  try {
    const { courseId } = await params;
    const response = await fetchAPI<StorefrontCourseResponse>(`/storefront/courses/${courseId}`);
    const courseTitle = response?.data?.course?.title?.trim();

    if (!courseTitle) return fallback;

    return {
      title: courseTitle,
      description: `View course details for ${courseTitle} on Acme Learning.`,
    };
  } catch {
    return fallback;
  }
}

export default function CourseDetailsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
