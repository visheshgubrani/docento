"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  HiArrowDownTray,
  HiCheckBadge,
  HiChatBubbleBottomCenterText,
  HiChevronDown,
  HiClock,
  HiClipboardDocumentList,
  HiDevicePhoneMobile,
  HiDocumentText,
  HiEye,
  HiFolder,
  HiLockClosed,
  HiPlayCircle,
  HiShoppingCart,
  HiUsers,
} from "react-icons/hi2";
import { FaPlay } from "react-icons/fa";
import { LiaCertificateSolid } from "react-icons/lia";
import { noisePattern } from "@/components/noise-pattern";
import {
  fetchStudentCourseContent,
  fetchStorefrontCourse,
  type StudentCourseContent,
  type StorefrontCourseDetail,
  type StorefrontCourseViewer,
  type StorefrontLesson,
} from "@/lib/lms-api-client";

function formatDuration(duration?: number | null) {
  if (!duration || duration <= 0) return "—";
  const minutes = Math.max(1, Math.round(duration / 60));
  return `${minutes} min`;
}

function formatPublishedDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCourseVideoDuration(totalSeconds?: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return "0 min";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours <= 0) {
    return `${Math.max(1, minutes)} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function formatAccessDuration(days?: number | null) {
  if (!days || days <= 0) return "Lifetime Access";
  if (days <= 30) return `${days} d`;

  const months = days / 30;
  const roundedMonths =
    Math.abs(months - Math.round(months)) < 0.25
      ? Math.round(months)
      : Math.round(months * 10) / 10;

  return `${roundedMonths}-Month Access`;
}

function resolveContinueLessonId(content: StudentCourseContent | null | undefined) {
  const allLessons = content?.course.modules.flatMap((module) => module.lessons) ?? [];

  if (allLessons.length < 1) {
    return null;
  }

  const progressMap = content?.progressMap ?? {};

  const lastWatched = Object.entries(progressMap)
    .filter(([, progress]) => Boolean(progress?.lastWatchedAt))
    .sort((a, b) => {
      const aTime = new Date(a[1]?.lastWatchedAt || 0).getTime();
      const bTime = new Date(b[1]?.lastWatchedAt || 0).getTime();
      return bTime - aTime;
    })[0]?.[0];

  if (lastWatched && allLessons.some((lesson) => lesson.id === lastWatched)) {
    return lastWatched;
  }

  const firstIncomplete = allLessons.find((lesson) => !progressMap[lesson.id]?.isCompleted);
  if (firstIncomplete?.id) {
    return firstIncomplete.id;
  }

  return allLessons[0]?.id ?? null;
}

function LessonRow({
  courseId,
  lesson,
  isEnrolled,
}: {
  courseId: string;
  lesson: StorefrontLesson;
  isEnrolled: boolean;
}) {
  const shouldShowPlayIcon = lesson.isFree || isEnrolled;

  return (
    <Link
      href={`/courses/${courseId}/${lesson.id}`}
      className="flex flex-wrap cursor-pointer items-start gap-2 border-t border-border bg-background px-3 py-3 transition-colors duration-200 hover:bg-muted/45 sm:items-center sm:gap-3 sm:px-5"
    >
      {shouldShowPlayIcon ? (
        <HiPlayCircle className="mt-0.5 size-5 shrink-0 text-primary sm:mt-0" />
      ) : (
        <HiLockClosed className="mt-0.5 size-4.5 shrink-0 text-muted-foreground/70 sm:mt-0" />
      )}

      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{lesson.title}</span>

      <div className="flex w-full items-center gap-2 pl-7 sm:w-auto sm:pl-0">
        {lesson.isFree && (
          <span className="rounded-full bg-muted px-3 py-0.5 text-[0.65rem] font-semibold tracking-wider text-muted-foreground">
            Free Preview
          </span>
        )}

        <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground sm:ml-0">
          {formatDuration(lesson.duration)}
        </span>
      </div>
    </Link>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || "";

  const [course, setCourse] = useState<StorefrontCourseDetail | null>(null);
  const [viewer, setViewer] = useState<StorefrontCourseViewer | null>(null);
  const [continueLessonHref, setContinueLessonHref] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCourse = async () => {
      try {
        const result = await fetchStorefrontCourse(courseId);
        if (cancelled) return;

        setCourse(result.course);
        setViewer(result.viewer ?? null);
        setContinueLessonHref(`/dashboard/courses/${result.course.id}`);
        setExpandedModules(result.course.modules.slice(0, 1).map((module) => module.id));

        if (result.viewer?.isEnrolled) {
          try {
            const studentContent = await fetchStudentCourseContent(courseId);
            if (cancelled) return;

            const lessonId = resolveContinueLessonId(studentContent);
            setContinueLessonHref(
              lessonId ? `/courses/${result.course.id}/${lessonId}` : `/dashboard/courses/${result.course.id}`
            );
          } catch {
            if (!cancelled) {
              setContinueLessonHref(`/dashboard/courses/${result.course.id}`);
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load course.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const totalLessons = useMemo(
    () => course?.modules.reduce((sum, mod) => sum + mod.lessons.length, 0) ?? 0,
    [course]
  );

  const courseIncludes = useMemo(() => {
    if (!course) {
      return {
        videoDurationSeconds: 0,
        videoDurationText: "0 min on-demand video",
        downloadableResourcesCount: 0,
        articlesCount: 0,
        assessmentsCount: 0,
      };
    }

    const fallback = {
      videoDurationSeconds: 0,
      downloadableResourcesCount: 0,
      articlesCount: 0,
      assessmentsCount: 0,
    };

    course.modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        const contentType = lesson.contentType?.toUpperCase();

        if (contentType === "VIDEO") {
          fallback.videoDurationSeconds += Math.max(0, lesson.duration ?? 0);
        }

        if (contentType === "TEXT") {
          fallback.articlesCount += 1;
        }

        if (contentType === "FILE") {
          fallback.downloadableResourcesCount += 1;
        }

        if (contentType === "QUIZ" || contentType === "MOCK_TEST" || contentType === "ASSIGNMENT") {
          fallback.assessmentsCount += 1;
        }
      });
    });

    const includes = course.includes;
    const videoDurationSeconds = includes?.videoDurationSeconds ?? fallback.videoDurationSeconds;

    let assessmentsCount = fallback.assessmentsCount;
    if (typeof includes?.assessmentsCount === "number") {
      assessmentsCount = includes.assessmentsCount;
    } else if (
      typeof includes?.quizzesCount === "number" ||
      typeof includes?.assignmentsCount === "number"
    ) {
      assessmentsCount = (includes?.quizzesCount ?? 0) + (includes?.assignmentsCount ?? 0);
    }

    return {
      videoDurationSeconds,
      videoDurationText:
        includes?.videoDurationText ??
        `${formatCourseVideoDuration(videoDurationSeconds)} on-demand video`,
      downloadableResourcesCount:
        includes?.downloadableResourcesCount ?? fallback.downloadableResourcesCount,
      articlesCount: includes?.articlesCount ?? fallback.articlesCount,
      assessmentsCount,
    };
  }, [course]);

  const learningOutcomes = useMemo(() => {
    if (!course) return [];
    return course.modules
      .flatMap((module) => module.lessons)
      .slice(0, 8)
      .map((lesson) => `Build confidence with ${lesson.title.toLowerCase()}.`);
  }, [course]);

  const courseCategories = useMemo(() => {
    if (!course) return [];
    const categories = course.category?.length ? course.category : course.categories ?? [];
    return categories.filter(Boolean);
  }, [course]);

  const primaryInstructor = course?.instructors?.[0] ?? null;
  const instructorName = primaryInstructor?.name?.trim() || "Instructor";
  const boughtCount = course?.studentsEnrolled ?? 0;
  const freePreviewLesson = useMemo(
    () =>
      course?.modules.flatMap((module) => module.lessons).find((lesson) => lesson.isFree) ?? null,
    [course]
  );

  const hasEnrollment = Boolean(viewer?.isEnrolled);
  const enrollmentProgress =
    typeof viewer?.enrollment?.progress === "number"
      ? Math.max(0, Math.min(100, Math.round(viewer.enrollment.progress)))
      : 0;
  const canRequestCertificate = hasEnrollment && enrollmentProgress >= 100;
  const allModulesExpanded = useMemo(() => {
    if (!course?.modules.length) return false;
    return course.modules.every((module) => expandedModules.includes(module.id));
  }, [course, expandedModules]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <section className="py-10 md:py-12">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="h-4 w-56 animate-pulse rounded bg-muted/70" />

            <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-8">
                <div className="rounded-xl border border-border p-4 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3].map((item) => (
                      <div key={item} className="h-7 w-20 animate-pulse rounded-full bg-muted" />
                    ))}
                  </div>

                  <div className="mt-4 h-10 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-5 w-full animate-pulse rounded bg-muted/80" />
                  <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-muted/70" />

                  <div className="mt-5 flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4].map((item) => (
                      <div key={item} className="h-7 w-24 animate-pulse rounded-full bg-muted/80" />
                    ))}
                  </div>

                  <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
                    <div className="h-7 w-44 animate-pulse rounded bg-muted" />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="h-4 w-full animate-pulse rounded bg-muted/75" />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-12 animate-pulse rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-3 w-20 animate-pulse rounded bg-muted/75" />
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 sm:p-6">
                  <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                  <div className="mt-4 h-5 w-full animate-pulse rounded bg-muted/80" />
                  <div className="mt-6 space-y-3">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-16 animate-pulse rounded bg-muted/65" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="order-first rounded-xl border border-border p-4 sm:p-5 lg:order-last lg:col-span-4">
                <div className="relative overflow-hidden rounded-sm bg-primary/55">
                  <div
                    className="absolute inset-0 opacity-45 mix-blend-overlay"
                    style={{ backgroundImage: noisePattern }}
                  />
                  <div className="relative px-[min(10%,1rem)] py-[min(10%,1rem)]">
                    <div className="aspect-video animate-pulse rounded-t-sm bg-background/35" />
                  </div>
                </div>
                <div className="mt-5 h-9 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-4 h-11 w-full animate-pulse rounded-full bg-primary/35" />
                <div className="mt-3 h-11 w-full animate-pulse rounded-full bg-muted" />
                <div className="my-6 h-px bg-border" />
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="h-4 w-full animate-pulse rounded bg-muted/70" />
                  ))}
                </div>
                <div className="mt-8 rounded-lg border border-border bg-muted/25 p-4">
                  <div className="h-5 w-36 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted/75" />
                  <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-muted/65" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
        <div className="w-full rounded-xl border border-border bg-muted/45 p-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Course unavailable
          </h1>
          <p className="mt-3 text-sm text-foreground/70">
            {error || "The requested course was not found."}
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  const priceText = hasEnrollment
    ? "Enrolled"
    : !course.price || course.price <= 0
    ? "Free"
    : `₹${course.price.toLocaleString()}`;
  const accessDurationText = formatAccessDuration(course.enrollmentValidityDays);
  const publishedOn = formatPublishedDate(course.createdAt);

  return (
    <div className="min-h-screen">
      <section className="py-10 md:py-12">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
          <nav className="mb-5 text-sm text-foreground/65" aria-label="Breadcrumb">
            <Link
              href="/courses"
              className="font-medium underline hover:text-foreground text-foreground/65 hover:text-foreground"
            >
              courses
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-8">
              <div className="flex flex-col gap-4 rounded-xl border border-muted-foreground/20 p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  {courseCategories.length > 0 ? (
                    courseCategories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-border bg-primary px-4 py-1 text-xs font-medium text-primary-foreground"
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Course details
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="font-display text-3xl/[1.15] font-bold tracking-tight text-foreground sm:text-4xl/[1.15]">
                    {course.title}
                  </h1>
                  <p className="text-pretty text-[1.128rem]/7 text-foreground/85">
                    {course.description || "No description provided for this course yet."}
                  </p>
                </div>

                {/* {allCategories.length > 0 ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Link
                      href="/courses"
                      className="rounded-full border border-border bg-muted/35 px-4 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted"
                    >
                      All
                    </Link>
                    {allCategories.map((category) => {
                      const isActive = courseCategories.includes(category);
                      return (
                        <Link
                          key={category}
                          href={`/courses?category=${encodeURIComponent(category)}`}
                          className={
                            isActive
                              ? "rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                              : "rounded-full border border-border bg-muted/35 px-4 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted"
                          }
                        >
                          {category}
                        </Link>
                      );
                    })}
                  </div>
                ) : null} */}

                <div className="rounded-lg mt-3 border border-border bg-muted/40 p-4">
                  <h2 className="font-display text-[1.28rem] font-medium text-foreground">
                    What you&apos;ll learn
                  </h2>
                  <ul className="mt-5 grid gap-x-8 gap-y-3.5 text-sm/6 text-foreground/90 md:grid-cols-2">
                    {(learningOutcomes.length > 0
                      ? learningOutcomes
                      : ["Start learning with practical, step-by-step lessons."]
                    ).map((outcome, index) => (
                      <li key={`${outcome}-${index}`} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex mt-3 py-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {primaryInstructor?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={primaryInstructor.avatar}
                        alt={instructorName}
                        className="size-12 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                        {instructorName.trim().charAt(0).toUpperCase() || "I"}
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-wide text-foreground/60">
                        Instructor
                      </p>
                      <p className="text-sm mt-1 font-semibold text-foreground">{instructorName}</p>
                    </div>
                  </div>

                  <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <HiUsers className="h-4.5 w-4.5 text-primary/90" />
                    {boughtCount.toLocaleString()} bought this course
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-muted-foreground/20 p-4 sm:p-6">
                <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
                  Course Content
                </h2>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/75">
                    <span className="inline-flex items-center font-medium gap-1.5">
                      <HiFolder className="h-4 w-4 text-primary/90" />
                      {course.modules.length} modules
                    </span>
                    <span className="inline-flex items-center font-medium gap-1.5">
                      <HiPlayCircle className="h-4 w-4 text-primary/90" />
                      {totalLessons} lessons
                    </span>
                    <span className="inline-flex items-center font-medium gap-1.5">
                      <HiClock className="h-4 w-4 text-primary/90" />
                      {formatCourseVideoDuration(courseIncludes.videoDurationSeconds)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedModules((prev) =>
                        course.modules.every((module) => prev.includes(module.id))
                          ? []
                          : course.modules.map((module) => module.id)
                      )
                    }
                    className="text-left text-sm font-semibold text-primary hover:underline sm:text-right"
                  >
                    {allModulesExpanded ? "Collapse all modules" : "Expand all modules"}
                  </button>
                </div>

                <div className="mt-8 overflow-hidden rounded-lg border border-border">
                  {course.modules.map((module, moduleIndex) => {
                    const isExpanded = expandedModules.includes(module.id);
                    return (
                      <div
                        key={module.id}
                        className={moduleIndex > 0 ? "border-t border-border" : ""}
                      >
                        <button
                          onClick={() =>
                            setExpandedModules((prev) =>
                              prev.includes(module.id)
                                ? prev.filter((id) => id !== module.id)
                                : [...prev, module.id]
                            )
                          }
                          className="flex w-full flex-col justify-between gap-1 bg-muted/40 px-3 py-4 text-left transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                        >
                          <div className="flex items-center gap-3">
                            <HiChevronDown
                              className={`h-4.5 w-4.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                                isExpanded ? "rotate-0" : "-rotate-90"
                              }`}
                            />
                            <span className="text-[0.95rem] font-bold text-foreground">
                              {module.title}
                            </span>
                          </div>
                          <span className="shrink-0 pl-7.5 text-xs text-muted-foreground sm:pl-0">
                            {module.lessons.length} lessons
                          </span>
                        </button>

                        {isExpanded ? (
                          <div>
                            {module.lessons.map((lesson) => (
                              <LessonRow
                                key={lesson.id}
                                courseId={course.id}
                                lesson={lesson}
                                isEnrolled={hasEnrollment}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="order-first rounded-xl border border-muted-foreground/20 p-4 sm:p-5 lg:order-last lg:col-span-4">
              <div className="sticky top-8">
                <div className="relative overflow-hidden rounded-sm bg-gradient-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]">
                  <div
                    className="absolute inset-0 opacity-45 mix-blend-overlay"
                    style={{ backgroundImage: noisePattern }}
                  />
                  <div className="relative px-[min(10%,1rem)] py-[min(10%,1rem)]">
                    <div className="relative aspect-video overflow-hidden rounded-t-sm ring-1 ring-black/10 bg-muted">
                      {course.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-foreground/50 bg-gradient-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]"></div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (freePreviewLesson) {
                            router.push(`/courses/${course.id}/${freePreviewLesson.id}`);
                          }
                        }}
                        disabled={!freePreviewLesson}
                        className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors hover:bg-black/25 disabled:cursor-not-allowed disabled:opacity-80"
                        aria-label="Play course preview"
                      >
                        <span className="inline-flex size-18 items-center border-3 border-muted justify-center rounded-full bg-background/80 dark:bg-muted-foreground/85 dark:border-muted-foreground dark:hover:bg-muted-foreground hover:bg-background cursor-pointer shadow-sm backdrop-blur">
                          <FaPlay className="size-7 ml-1" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-3xl font-bold text-foreground">
                      {priceText}
                    </span>
                    <span className="shrink-0 font-display py-0.5 px-4 bg-muted border border-primary/10 rounded-full text-sm font-medium text-cyan-800 dark:text-cyan-500/80">
                      {accessDurationText}
                    </span>
                  </div>
                  {hasEnrollment ? (
                    <>
                      <div className="space-y-2 mb-2">
                        <div className="flex items-center justify-between text-xs font-medium text-foreground/70">
                          <span>Progress</span>
                          <span>{enrollmentProgress}%</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted-foreground/20">
                          <div
                            className="h-full rounded-full bg-lime-500/60 dark:bg-lime-700/65 transition-all duration-300"
                            style={{ width: `${enrollmentProgress}%` }}
                          />
                        </div>
                      </div>
                      <Link
                        href={continueLessonHref ?? `/dashboard/courses/${course.id}`}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <HiPlayCircle className="size-5" />
                        Continue learning
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/checkout/${course.id}`}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <HiShoppingCart className="h-4.5 w-4.5" />
                        {!course.price || course.price <= 0
                          ? "Enroll Now — Free"
                          : "Buy Course Now"}
                      </Link>
                    </>
                  )}

                  <Link
                    href={`/contact?courseTitle=${encodeURIComponent(
                      course.title
                    )}&instructor=${encodeURIComponent(instructorName)}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-muted-foreground/20 px-4 py-3 text-sm font-semibold text-foreground/85 transition-colors bg-muted hover:bg-muted hover:text-foreground"
                  >
                    <HiChatBubbleBottomCenterText className="h-4.5 w-4.5 text-foreground/75" />
                    Contact the instructor
                  </Link>
                  {canRequestCertificate ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          router.push(`/courses/${course.id}/certificate`);
                        }}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LiaCertificateSolid className="h-4.5 w-4.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                        Get certificate
                      </button>
                    </div>
                  ) : null}
                  {publishedOn ? (
                    <p className="text-center mt-2 text-xs text-foreground/65">
                      Published on <span className="text-primary">{publishedOn}</span>
                    </p>
                  ) : null}
                </div>

                <div className="my-6 h-px bg-border" />

                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    This course includes
                  </h3>
                  <ul className="mt-4 flex flex-col space-y-2.5 text-sm text-foreground/80">
                    <li className="inline-flex items-center gap-2">
                      <HiClock className="h-4.5 w-4.5 text-primary/90" />
                      {courseIncludes.videoDurationText}
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <HiArrowDownTray className="h-4.5 w-4.5 text-primary/90" />
                      {formatCount(
                        courseIncludes.downloadableResourcesCount,
                        "downloadable resource"
                      )}
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <HiDocumentText className="h-4.5 w-4.5 text-primary/90" />
                      {formatCount(courseIncludes.articlesCount, "article")}
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <HiClipboardDocumentList className="h-4.5 w-4.5 text-primary/90" />
                      {formatCount(
                        courseIncludes.assessmentsCount,
                        "quiz/assignment",
                        "quizzes/assignments"
                      )}
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <HiDevicePhoneMobile className="h-4.5 w-4.5 text-primary/90" />
                      Access on mobile and TV
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <HiCheckBadge className="h-4.5 w-4.5 text-primary/90" />
                      Certificate of completion
                    </li>
                  </ul>
                </div>

                <div className="mt-8 rounded-lg border border-border bg-primary/20 py-5 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">10 min trial course</h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (freePreviewLesson) {
                          router.push(`/courses/${course.id}/${freePreviewLesson.id}`);
                        }
                      }}
                      disabled={!freePreviewLesson}
                      className="inline-flex items-center cursor-pointer gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <HiEye className="h-4 w-4" />
                      Preview
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-display leading-6 tracking-wider text-foreground/70">
                    Watch a quick lesson preview to evaluate the teaching style and course depth.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
