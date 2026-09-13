"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HiArrowRightOnRectangle, HiEllipsisVertical } from "react-icons/hi2";
import { FiSidebar } from "react-icons/fi";
import { LiaCertificateSolid } from "react-icons/lia";
import { signOut } from "@/actions/auth";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CoursePlayerHeaderProps = {
  courseId: string;
  moduleTitle: string;
  lessonTitle: string;
  coursePrice?: number | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  hasPreviousLesson: boolean;
  hasNextLesson: boolean;
  onGoPrevious: () => void;
  onGetCertificate?: () => void;
  onCompleteAndContinue: () => void;
  canGetCertificate?: boolean;
  canCompleteLesson: boolean;
  isPreparingCertificate?: boolean;
  isCompletingLesson?: boolean;
};

function truncateToWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function CoursePlayerHeader({
  courseId,
  moduleTitle,
  lessonTitle,
  coursePrice,
  isSidebarOpen,
  onToggleSidebar,
  isAuthenticated,
  isEnrolled,
  hasPreviousLesson,
  hasNextLesson,
  onGoPrevious,
  onGetCertificate,
  onCompleteAndContinue,
  canGetCertificate = false,
  canCompleteLesson,
  isPreparingCertificate = false,
  isCompletingLesson = false,
}: CoursePlayerHeaderProps) {
  const purchaseLabel = !coursePrice || coursePrice <= 0 ? "Enroll Free" : "Purchase Course";
  const signOutFormId = "lesson-header-signout";

  const compactLessonTitle = useMemo(() => truncateToWords(lessonTitle, 3), [lessonTitle]);
  const compactModuleTitle = useMemo(() => truncateToWords(moduleTitle, 3), [moduleTitle]);

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/80">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3 translate-y-0.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0 lg:hidden">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted"
              aria-label={isSidebarOpen ? "Collapse lesson sidebar" : "Expand lesson sidebar"}
            >
              <FiSidebar className="size-5" />
            </button>
          </div>

          <p className="truncate text-xs font-medium text-foreground/80 sm:text-sm">
            <span className="font-semibold text-foreground/70 font-brand">{siteConfig.name}</span>
            <span className="mx-2 text-foreground/50">/</span>
            <span className="hidden text-foreground/70 xl:inline">{compactModuleTitle}</span>
            <span className="mx-2 hidden text-foreground/50 xl:inline">/</span>
            <span className="text-foreground">{compactLessonTitle}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onGoPrevious}
            disabled={!hasPreviousLesson}
            className="inline-flex cursor-pointer items-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          {canGetCertificate ? (
            <button
              type="button"
              onClick={onGetCertificate}
              disabled={isPreparingCertificate}
              className="inline-flex cursor-pointer items-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LiaCertificateSolid className="mr-1.5 size-4.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
              {isPreparingCertificate ? "Preparing..." : "Get Certificate"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onCompleteAndContinue}
            disabled={!canCompleteLesson || isCompletingLesson}
            className="inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCompletingLesson ? (
              "Completing..."
            ) : (
              <>
                <span className="sm:hidden">Complete</span>
                <span className="hidden sm:inline">
                  {hasNextLesson ? "Complete and Continue" : "Complete Lesson"}
                </span>
              </>
            )}
          </button>

          <form id={signOutFormId} action={signOut} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted"
                aria-label="Open lesson actions"
              >
                <HiEllipsisVertical className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-2 w-52 p-2.5 space-y-2">
              <DropdownMenuItem asChild>
                <Link href={`/courses/${courseId}`} className="cursor-pointer">
                  Course
                </Link>
              </DropdownMenuItem>

              {!isAuthenticated ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/courses/${courseId}`)}`}
                      className="cursor-pointer"
                    >
                      Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/checkout/${courseId}`} className="cursor-pointer">
                      {purchaseLabel}
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : isEnrolled ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/contact" className="cursor-pointer">
                      Contact
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild variant="destructive">
                    <button
                      type="submit"
                      form={signOutFormId}
                      className="flex w-full cursor-pointer items-center gap-2 text-left"
                    >
                      <HiArrowRightOnRectangle className="size-4" />
                      Sign Out
                    </button>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/checkout/${courseId}`} className="cursor-pointer">
                      {purchaseLabel}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild variant="destructive">
                    <button
                      type="submit"
                      form={signOutFormId}
                      className="flex w-full cursor-pointer items-center gap-2 text-left"
                    >
                      <HiArrowRightOnRectangle className="size-4" />
                      Sign Out
                    </button>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
