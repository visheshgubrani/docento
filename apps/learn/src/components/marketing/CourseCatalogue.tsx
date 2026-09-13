"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HiMagnifyingGlass, HiXMark } from "react-icons/hi2";

import { CourseCard } from "@/components/common/course-card";
import { CourseCardSkeleton } from "@/components/common/course-card-skeleton";
import {
  fetchStorefrontCourses,
  fetchStudentCourses,
  type StorefrontCourse,
} from "@/lib/lms-api-client";

type CourseCatalogueProps = {
  enableSearch?: boolean;
};

export function CourseCatalogue({ enableSearch = false }: CourseCatalogueProps) {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<StorefrontCourse[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        const [storefrontCourses, studentCourses] = await Promise.all([
          fetchStorefrontCourses(),
          fetchStudentCourses().catch(() => []),
        ]);
        if (cancelled) return;
        setCourses(storefrontCourses);
        setEnrolledCourseIds(studentCourses.map((course) => course.id));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load courses.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enableSearch) return;
    const categoryFromQuery = searchParams.get("category")?.trim();
    if (!categoryFromQuery) return;
    setSelectedCategory(categoryFromQuery);
  }, [enableSearch, searchParams]);

  const allCategories = useMemo(() => {
    const categorySet = new Set<string>();
    courses.forEach((course) => {
      (course.category ?? [])
        .map((category) => category.trim())
        .filter(Boolean)
        .forEach((category) => categorySet.add(category));
    });
    return [...categorySet].sort((a, b) => a.localeCompare(b));
  }, [courses]);

  useEffect(() => {
    if (selectedCategory !== "All" && !allCategories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [allCategories, selectedCategory]);

  const filteredCourses = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return courses.filter((course) => {
      const categories = (course.category ?? []).map((category) => category.trim());
      const matchesCategory = selectedCategory === "All" || categories.includes(selectedCategory);

      if (!matchesCategory) return false;
      if (!query) return true;

      const text = [course.title, course.description ?? "", categories.join(" ")]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [courses, searchValue, selectedCategory]);
  const enrolledCourseIdSet = useMemo(() => new Set(enrolledCourseIds), [enrolledCourseIds]);

  const titleText = useMemo(() => {
    if (loading) return "Loading courses...";
    if (error) return "Unable to load courses";
    if (filteredCourses.length === 0) return "No matching courses found";
    return "Courses to build your skills";
  }, [error, filteredCourses.length, loading]);

  return (
    <section className="w-full py-16 md:py-20">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col gap-10 sm:gap-16">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                Course Library
              </span>
              <h2 className="text-foreground font-display text-[2rem]/10 tracking-tight text-pretty sm:text-5xl/[1.2]">
                {titleText}
              </h2>
            </div>
            <p className="max-w-2xl text-base/8 md:text-lg/8 text-foreground/75 text-pretty">
              Browse our latest published catalog from your LMS project.
            </p>

            {allCategories.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {["All", ...allCategories].map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={
                        isActive
                          ? "rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                          : "rounded-full border border-border bg-muted/35 px-4 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted"
                      }
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {enableSearch ? (
              <div className="mt-3">
                <div className="relative max-w-xl">
                  <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-foreground/55" />
                  <input
                    type="search"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search courses by title, description, or category..."
                    className="h-11 w-full rounded-full border border-muted-foreground/40 bg-background pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/55 focus:border-primary/55"
                    aria-label="Search courses"
                  />
                  {searchValue ? (
                    <button
                      type="button"
                      onClick={() => setSearchValue("")}
                      className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <HiXMark className="size-4.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <CourseCardSkeleton key={item} index={item} />
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={index}
                  isEnrolled={enrolledCourseIdSet.has(course.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-start">
              {error ? (
                <p className="text-sm font-medium text-red-600">{error}</p>
              ) : (
                <p className="text-foreground/70">No courses found for the selected filters.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
