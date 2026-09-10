"use client";

import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HiArrowDownTray, HiArrowLeft, HiArrowRight } from "react-icons/hi2";
import { FiDownloadCloud } from "react-icons/fi";
import { CoursePlayerHeader } from "@/components/course-player/header";
import { LessonContent } from "@/components/course-player/lesson-content";
import { CoursePlayerSidebar } from "@/components/course-player/sidebar-layout";
import {
  fetchLessonPlayback,
  fetchStudentCourseContent,
  fetchStorefrontCourse,
  fetchStorefrontLesson,
  updateStudentLessonProgress,
  type LessonPlayback,
  type StudentCourseContent,
  type StorefrontCourseDetail,
  type StorefrontCourseViewer,
  type StorefrontLessonDetail,
  type StorefrontLessonResource,
} from "@/lib/lms-api-client";
import { cn } from "@/lib/utils";

function getResources(lesson: StorefrontLessonDetail | null): StorefrontLessonResource[] {
  if (!lesson) return [];

  const resources = [...(lesson.resources ?? [])];
  if (lesson.fileUrl) {
    resources.unshift({
      id: `${lesson.id}-file`,
      title: "Lesson file",
      fileUrl: lesson.fileUrl,
      type: "FILE",
    });
  }

  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (!resource.fileUrl) return false;
    if (seen.has(resource.fileUrl)) return false;
    seen.add(resource.fileUrl);
    return true;
  });
}

function getLessonIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

function getCompletionMap(progressMap: StudentCourseContent["progressMap"] | undefined) {
  if (!progressMap) return {};

  return Object.fromEntries(
    Object.entries(progressMap).map(([lessonId, progress]) => [lessonId, Boolean(progress?.isCompleted)])
  );
}

function LessonDetailsSkeleton() {
  return (
    <section className="md:mt-4 rounded-xl py-6 px-4 md:p-6 bg-muted border border-border dark:bg-muted/25">
      <div className="h-9 w-2/5 animate-pulse rounded bg-muted/70" />
      <div className="mt-4 h-5 w-full animate-pulse rounded bg-muted/60" />
      <div className="mt-2 h-5 w-4/5 animate-pulse rounded bg-muted/60" />
      <div className="mt-2 h-5 w-3/5 animate-pulse rounded bg-muted/60" />

      <div className="mt-10 md:mt-12 rounded-xl border border-border/40 bg-primary/15 p-4 md:p-5">
        <div className="h-5 w-28 animate-pulse rounded bg-muted/70" />
        <div className="mt-4 grid gap-2">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-11 w-full animate-pulse rounded-lg border border-border/70 bg-muted/30"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LessonPageSkeleton({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  return (
    <div className="min-h-screen bg-muted/10">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden h-dvh border-r border-border bg-background lg:block",
          isSidebarOpen ? "w-80" : "w-16"
        )}
      >
        <div className="my-3 flex h-14 items-center px-3">
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted/60" />
        </div>
        {isSidebarOpen ? (
          <div className="space-y-4 px-3 pb-4">
            <div className="rounded-lg border border-border/60 bg-muted/35 p-3">
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted/70" />
              <div className="mt-3 h-2.5 w-full animate-pulse rounded-full bg-muted/70" />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted/70" />
              </div>
            </div>

            {[0, 1, 2].map((module) => (
              <div key={module} className="space-y-2 border-b border-border pb-4 last:border-b-0">
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted/70" />
                {[0, 1, 2].map((lesson) => (
                  <div key={`${module}-${lesson}`} className="flex items-center gap-2 py-1">
                    <div className="h-4.5 w-4.5 animate-pulse rounded-sm bg-muted/70" />
                    <div className="h-4.5 w-4.5 animate-pulse rounded bg-muted/70" />
                    <div className="h-3.5 w-full animate-pulse rounded bg-muted/60" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      <div
        className={cn(
          "min-h-screen pl-0 transition-[padding] duration-300",
          isSidebarOpen ? "lg:pl-80" : "lg:pl-16"
        )}
      >
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/80">
          <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted/70 sm:w-2/5" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 animate-pulse rounded-md bg-muted/70" />
              <div className="h-9 w-32 animate-pulse rounded-md bg-muted/70" />
              <div className="h-9 w-9 animate-pulse rounded-md bg-muted/70" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted/70" />
            </div>
          </div>
        </header>

        <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[calc(100dvh-4.25rem)] w-full flex-col">
            <div className="flex w-full flex-col gap-8 md:gap-10">
              <section>
                <div className="h-[340px] animate-pulse rounded-xl border border-border bg-muted/30" />
              </section>

              <LessonDetailsSkeleton />
            </div>

            <section className="mt-auto pt-10 xl:pt-20 pb-3">
              <div className="flex w-full items-stretch gap-3">
                <div className="h-24 w-full animate-pulse rounded-xl border border-border bg-muted/40 sm:max-w-[48%]" />
                <div className="ml-auto h-24 w-full animate-pulse rounded-xl border border-border bg-muted/40 sm:max-w-[48%]" />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || "";
  const routeLessonId = (params?.lessonId as string) || "";

  const [activeLessonId, setActiveLessonId] = useState(routeLessonId);
  const [course, setCourse] = useState<StorefrontCourseDetail | null>(null);
  const [viewer, setViewer] = useState<StorefrontCourseViewer | null>(null);
  const [lessonDetail, setLessonDetail] = useState<StorefrontLessonDetail | null>(null);
  const [playback, setPlayback] = useState<LessonPlayback | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lessonCompletionMap, setLessonCompletionMap] = useState<Record<string, boolean>>({});
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateSidebarState = () => {
      setIsSidebarOpen(mediaQuery.matches);
    };

    updateSidebarState();
    mediaQuery.addEventListener("change", updateSidebarState);

    return () => {
      mediaQuery.removeEventListener("change", updateSidebarState);
    };
  }, []);

  useEffect(() => {
    if (!routeLessonId) return;
    setActiveLessonId(routeLessonId);
  }, [routeLessonId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const lessonIdFromPath = getLessonIdFromPath(window.location.pathname);
      if (lessonIdFromPath) {
        setActiveLessonId(lessonIdFromPath);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const loadCourse = async () => {
      try {
        const courseResponse = await fetchStorefrontCourse(courseId);
        if (cancelled) return;

        setCourse(courseResponse.course);
        setViewer(courseResponse.viewer ?? null);

        const allCourseLessons = courseResponse.course.modules.flatMap((module) => module.lessons);
        const hasRequestedLesson = allCourseLessons.some((lesson) => lesson.id === routeLessonId);
        const initialLessonId = hasRequestedLesson ? routeLessonId : allCourseLessons[0]?.id ?? "";

        if (!initialLessonId) {
          setError("No lessons are available in this course yet.");
          return;
        }

        const canLoadStudentProgress = Boolean(
          courseResponse.viewer?.isAuthenticated && courseResponse.viewer?.isEnrolled
        );

        if (canLoadStudentProgress) {
          try {
            const studentContent = await fetchStudentCourseContent(courseId);
            if (cancelled) return;

            setLessonCompletionMap(getCompletionMap(studentContent.progressMap));
            setViewer((previous) =>
              previous
                ? {
                    ...previous,
                    enrollment: {
                      id: studentContent.enrollment.id,
                      progress: studentContent.enrollment.progress,
                      completedAt: studentContent.enrollment.completedAt ?? null,
                      expiresAt: studentContent.enrollment.expiresAt ?? null,
                    },
                  }
                : previous
            );
          } catch {
            if (cancelled) return;
            setLessonCompletionMap({});
          }
        } else {
          setLessonCompletionMap({});
        }

        setActiveLessonId(initialLessonId);

        if (typeof window !== "undefined" && initialLessonId !== routeLessonId) {
          window.history.replaceState(null, "", `/courses/${courseId}/${initialLessonId}`);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load lesson page.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadCourse();
    return () => {
      cancelled = true;
    };
  }, [courseId, routeLessonId, router]);

  useEffect(() => {
    if (!activeLessonId) return;

    let cancelled = false;
    setLessonLoading(true);
    setLessonError(null);
    setLessonDetail(null);

    const loadLesson = async () => {
      try {
        const lessonResponse = await fetchStorefrontLesson(activeLessonId);
        if (cancelled) return;
        setLessonDetail(lessonResponse.lesson);
      } catch (err) {
        if (cancelled) return;
        setLessonError(err instanceof Error ? err.message : "Failed to load lesson.");
      } finally {
        if (!cancelled) setLessonLoading(false);
      }
    };

    void loadLesson();
    return () => {
      cancelled = true;
    };
  }, [activeLessonId]);

  const allLessons = useMemo(
    () => course?.modules.flatMap((module) => module.lessons) ?? [],
    [course]
  );

  useEffect(() => {
    if (!course || !activeLessonId) return;

    const hasActiveLesson = allLessons.some((lesson) => lesson.id === activeLessonId);
    if (hasActiveLesson) return;

    const fallbackLessonId = allLessons[0]?.id;
    if (!fallbackLessonId) return;

    setActiveLessonId(fallbackLessonId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/courses/${courseId}/${fallbackLessonId}`);
    }
  }, [activeLessonId, allLessons, course, courseId]);

  const selectedLesson = useMemo(
    () => allLessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [allLessons, activeLessonId]
  );

  const selectedModule = useMemo(
    () =>
      course?.modules.find((module) =>
        module.lessons.some((lesson) => lesson.id === activeLessonId)
      ) ?? null,
    [course, activeLessonId]
  );

  const canAccessLesson = Boolean(
    selectedLesson?.isFree || viewer?.isEnrolled || lessonDetail?.canAccess
  );
  const isLockedPaidLesson = Boolean(!canAccessLesson && !selectedLesson?.isFree);

  useEffect(() => {
    if (
      !selectedLesson ||
      selectedLesson.contentType.toUpperCase() !== "VIDEO" ||
      !canAccessLesson
    ) {
      setPlayback(null);
      setPlaybackError(null);
      setPlaybackLoading(false);
      return;
    }

    let cancelled = false;
    setPlaybackLoading(true);
    setPlaybackError(null);

    const loadPlayback = async () => {
      try {
        const data = await fetchLessonPlayback(selectedLesson.id);
        if (cancelled) return;
        setPlayback(data);
      } catch (err) {
        if (cancelled) return;
        setPlayback(null);
        setPlaybackError(err instanceof Error ? err.message : "Failed to load lesson playback.");
      } finally {
        if (!cancelled) setPlaybackLoading(false);
      }
    };

    void loadPlayback();
    return () => {
      cancelled = true;
    };
  }, [canAccessLesson, selectedLesson]);

  const resources = useMemo(() => getResources(lessonDetail), [lessonDetail]);
  const currentIndex = allLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const completedLessonsCount = useMemo(
    () => allLessons.reduce((total, lesson) => (lessonCompletionMap[lesson.id] ? total + 1 : total), 0),
    [allLessons, lessonCompletionMap]
  );
  const completionPercent = useMemo(() => {
    if (allLessons.length < 1) return 0;
    return Math.round((completedLessonsCount / allLessons.length) * 100);
  }, [allLessons.length, completedLessonsCount]);
  const canRequestCertificate = Boolean(
    viewer?.isAuthenticated && viewer?.isEnrolled && !nextLesson && completionPercent >= 100
  );

  const navigateToLesson = useCallback((nextLessonId: string) => {
    if (!nextLessonId || nextLessonId === activeLessonId) return;

    setActiveLessonId(nextLessonId);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/courses/${courseId}/${nextLessonId}`);
    }
  }, [activeLessonId, courseId]);

  const markLessonAsCompleted = useCallback(
    async (lessonId: string, options?: { continueToNext?: boolean }) => {
      if (!lessonId) return;

      const shouldContinue = Boolean(options?.continueToNext);
      const targetLesson = allLessons.find((lesson) => lesson.id === lessonId);
      const canPersistCompletion = Boolean(viewer?.isAuthenticated && viewer?.isEnrolled);
      const alreadyCompleted = Boolean(lessonCompletionMap[lessonId]);

      if (!alreadyCompleted) {
        setLessonCompletionMap((previous) => ({
          ...previous,
          [lessonId]: true,
        }));
      }

      if (canPersistCompletion && !alreadyCompleted) {
        try {
          setIsCompletingLesson(true);
          setLessonError(null);

          await updateStudentLessonProgress(lessonId, {
            watchedDuration: Math.max(0, targetLesson?.duration ?? 0),
            isCompleted: true,
          });
        } catch (err) {
          setLessonError(
            err instanceof Error
              ? `Completed locally, but failed to sync: ${err.message}`
              : "Completed locally, but failed to sync progress."
          );
        } finally {
          setIsCompletingLesson(false);
        }
      }

      if (shouldContinue && nextLesson) {
        navigateToLesson(nextLesson.id);
      }
    },
    [allLessons, lessonCompletionMap, navigateToLesson, nextLesson, viewer?.isAuthenticated, viewer?.isEnrolled]
  );

  const handleCompleteAndContinue = useCallback(() => {
    if (!selectedLesson) return;
    void markLessonAsCompleted(selectedLesson.id, { continueToNext: true });
  }, [markLessonAsCompleted, selectedLesson]);

  const handleVideoEnded = useCallback(() => {
    if (!selectedLesson) return;
    void markLessonAsCompleted(selectedLesson.id);
  }, [markLessonAsCompleted, selectedLesson]);

  const handleAssignmentSubmitted = useCallback(() => {
    if (!selectedLesson) return;
    void markLessonAsCompleted(selectedLesson.id);
  }, [markLessonAsCompleted, selectedLesson]);

  const handleGoPrevious = useCallback(() => {
    if (!previousLesson) return;
    navigateToLesson(previousLesson.id);
  }, [navigateToLesson, previousLesson]);

  const handleLessonLinkClick = (event: MouseEvent<HTMLAnchorElement>, nextLessonId: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    navigateToLesson(nextLessonId);
  };

  if (isLoading) {
    return <LessonPageSkeleton isSidebarOpen={isSidebarOpen} />;
  }

  if (error || !course || !selectedLesson || !selectedModule) {
    return (
      <main className="min-h-screen bg-muted/10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-background p-6">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Lesson unavailable
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {error || "Unable to load this lesson right now."}
          </p>
          <Link
            href={`/courses/${courseId}`}
            className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Back to course
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <CoursePlayerSidebar
        courseId={course.id}
        courseTitle={course.title}
        modules={course.modules}
        currentLessonId={selectedLesson.id}
        lessonCompletionMap={lessonCompletionMap}
        completionPercent={completionPercent}
        completedLessonsCount={completedLessonsCount}
        totalLessons={allLessons.length}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        onClose={() => setIsSidebarOpen(false)}
        onNavigateLesson={navigateToLesson}
      />

      <div
        className={cn(
          "min-h-screen pl-0 transition-[padding] duration-300",
          isSidebarOpen ? "lg:pl-80" : "lg:pl-16"
        )}
      >
        <CoursePlayerHeader
          courseId={course.id}
          moduleTitle={selectedModule.title}
          lessonTitle={selectedLesson.title}
          coursePrice={course.price}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isAuthenticated={Boolean(viewer?.isAuthenticated)}
          isEnrolled={Boolean(viewer?.isEnrolled)}
          hasPreviousLesson={Boolean(previousLesson)}
          hasNextLesson={Boolean(nextLesson)}
          onGoPrevious={handleGoPrevious}
          onGetCertificate={() => {
            router.push(`/courses/${course.id}/certificate`);
          }}
          onCompleteAndContinue={handleCompleteAndContinue}
          canGetCertificate={canRequestCertificate}
          canCompleteLesson={canAccessLesson}
          isCompletingLesson={isCompletingLesson}
        />

        <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[calc(100dvh-4.25rem)] w-full flex-col">
            <div className="flex w-full flex-col gap-8 md:gap-10">
              {lessonError ? (
                <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {lessonError}
                </section>
              ) : null}

              <section
                className={cn(
                  isLockedPaidLesson
                    ? "flex min-h-[560px] items-center justify-center rounded-xl border border-border/70 bg-muted/20 p-4 md:p-8"
                    : ""
                )}
              >
                <div className={cn("w-full", isLockedPaidLesson ? "mx-auto max-w-3xl" : "")}>
                  <LessonContent
                    courseId={course.id}
                    coursePrice={course.price}
                    lesson={selectedLesson}
                    lessonDetail={lessonDetail}
                    playback={playback}
                    playbackLoading={playbackLoading}
                    playbackError={playbackError}
                    isLoading={lessonLoading}
                    canAccess={canAccessLesson}
                    isAuthenticated={Boolean(viewer?.isAuthenticated)}
                    onVideoEnded={handleVideoEnded}
                    onAssignmentSubmitted={handleAssignmentSubmitted}
                  />
                </div>
              </section>

              {!isLockedPaidLesson ? (
                lessonLoading ? (
                  <LessonDetailsSkeleton />
                ) : (
                  <section className="md:mt-4 rounded-xl py-6 px-4 md:p-6 bg-muted border border-border dark:bg-muted/25">
                    <h2 className="font-display text-[1.6rem] font-light tracking-wide text-primary">
                      {selectedLesson.title}
                    </h2>
                    <p className="mt-2 text-lg leading-7 text-foreground/70">
                      {lessonDetail?.description ||
                        selectedLesson.description ||
                        "No description provided for this lesson yet."}
                    </p>

                    {resources.length > 0 ? (
                      <div className="mt-10 md:mt-12 dark:bg-muted bg-primary/25 p-4 md:p-5 rounded-xl mr-auto md:w-fit">
                        <h3 className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-foreground/70 dark:text-foreground/60">
                          <FiDownloadCloud className="size-5" />
                          Resources
                        </h3>
                        <div className="mt-3 grid gap-2">
                          {resources.map((resource) => (
                            <a
                              key={resource.id}
                              href={resource.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex  items-center gap-5 md:gap-8 xl:gap-14 justify-between rounded-lg border border-border/80 bg-muted/20 dark:bg-muted/20 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/35"
                            >
                              <span className="line-clamp-1 font-medium">
                                {resource.title || "Resource file"}
                              </span>
                              <span className="inline-flex items-center bg-white dark:bg-sidebar/60 hover:bg-sidebar/80 py-1.5 px-2.5 rounded-md gap-1.5 text-xs font-semibold text-foreground/85">
                                <HiArrowDownTray className="size-4.5" />
                                Download
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                )
              ) : null}
            </div>

            {previousLesson || nextLesson ? (
              <section className="mt-auto pt-10 xl:pt-20 pb-3">
                <div className="flex w-full items-stretch gap-3">
                  {previousLesson ? (
                    <Link
                      href={`/courses/${course.id}/${previousLesson.id}`}
                      onClick={(event) => handleLessonLinkClick(event, previousLesson.id)}
                      className="group flex h-full w-full cursor-pointer flex-col rounded-xl border border-border bg-muted/80 dark:bg-muted/30 p-4 transition-colors duration-200 hover:bg-muted/65 sm:max-w-[48%]"
                    >
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary/75 group-hover:text-primary">
                        <HiArrowLeft className="size-4" />
                        Previous
                      </span>
                      <p className="mt-4 text-sm font-medium text-foreground/80">
                        {previousLesson.title}
                      </p>
                    </Link>
                  ) : null}

                  {nextLesson ? (
                    <Link
                      href={`/courses/${course.id}/${nextLesson.id}`}
                      onClick={(event) => handleLessonLinkClick(event, nextLesson.id)}
                      className={cn(
                        "group flex h-full w-full cursor-pointer flex-col rounded-xl border border-border bg-muted/80 dark:bg-muted/30 p-4 transition-colors duration-200 hover:bg-muted/60 sm:max-w-[48%]",
                        !previousLesson ? "ml-auto" : ""
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary/75 group-hover:text-primary">
                        Next
                        <HiArrowRight className="size-4" />
                      </span>
                      <p className="mt-4 text-sm font-medium text-foreground/80">
                        {nextLesson.title}
                      </p>
                    </Link>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
