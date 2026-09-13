"use client";

import { type MouseEvent, useMemo, useState } from "react";
import Link from "next/link";
import { HiAcademicCap, HiChevronDown, HiPlayCircle } from "react-icons/hi2";
import { MdOutlineAssignment } from "react-icons/md";
import { LuLetterText } from "react-icons/lu";
import { FiSidebar } from "react-icons/fi";
import { AiOutlineCheckSquare } from "react-icons/ai";
import { PiNotePencilFill } from "react-icons/pi";
import { BsQuestionDiamondFill } from "react-icons/bs";
import type { StorefrontModule } from "@/lib/lms-api-client";
import { AiFillCheckSquare } from "react-icons/ai";
import { cn } from "@/lib/utils";

type CoursePlayerSidebarProps = {
  courseId: string;
  courseTitle: string;
  modules: StorefrontModule[];
  currentLessonId: string;
  lessonCompletionMap: Record<string, boolean>;
  completionPercent: number;
  completedLessonsCount: number;
  totalLessons: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigateLesson: (lessonId: string) => void;
};

function getLessonIcon(contentType: string) {
  const normalized = contentType.toUpperCase();

  if (normalized === "VIDEO") return HiPlayCircle;
  if (normalized === "QUIZ") return BsQuestionDiamondFill;
  if (normalized === "TEXT") return LuLetterText;
  if (normalized === "MOCK_TEST") return PiNotePencilFill;
  if (normalized === "ASSIGNMENT") return MdOutlineAssignment;
  return HiAcademicCap;
}

export function CoursePlayerSidebar({
  courseId,
  courseTitle,
  modules,
  currentLessonId,
  lessonCompletionMap,
  completionPercent,
  completedLessonsCount,
  totalLessons,
  isOpen,
  onToggle,
  onClose,
  onNavigateLesson,
}: CoursePlayerSidebarProps) {
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<string[]>([]);
  const currentModuleId = useMemo(
    () =>
      modules.find((module) => module.lessons.some((lesson) => lesson.id === currentLessonId))?.id,
    [currentLessonId, modules]
  );
  const normalizedCompletionPercent = Math.max(0, Math.min(100, completionPercent));

  const handleLessonClick = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      onClose();
    }
  };

  const handleLessonNavigation = (event: MouseEvent<HTMLAnchorElement>, lessonId: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    onNavigateLesson(lessonId);
    handleLessonClick();
  };

  const handleModuleToggle = (moduleId: string) => {
    setCollapsedModuleIds((previous) =>
      previous.includes(moduleId)
        ? previous.filter((id) => id !== moduleId)
        : [...previous, moduleId]
    );
  };

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[1px] lg:hidden"
          aria-label="Close lesson sidebar overlay"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 h-dvh bg-background lg:pt-0 transition-[width] duration-300",
          isOpen
            ? "w-[85vw] max-w-80 overflow-y-auto border-r border-border [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent lg:w-80"
            : "w-0 overflow-hidden border-r-0 lg:w-16 lg:border-r lg:border-border"
        )}
      >
        <div className="my-1 flex h-14 items-center px-2.5 md:my-3 md:px-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border/50 bg-muted-foreground/20 dark:bg-muted/50 p-1 md:p-2 text-foreground/70 transition-colors hover:bg-muted"
            aria-label={isOpen ? "Collapse lesson sidebar" : "Expand lesson sidebar"}
          >
            <FiSidebar className="size-5" />
          </button>
        </div>

        <div className={cn("pb-3", isOpen ? "opacity-100" : "pointer-events-none opacity-0")}>
          {completedLessonsCount > 0 ? (
            <div className="px-3 pb-3">
              <div className="rounded-lg flex flex-col gap-2 border border-muted-foreground/30 shadow-sm dark:border-border bg-primary dark:bg-primary/60 p-3">
                <p className="line-clamp-2 text-xs font-semibold text-primary-foreground dark:text-foreground">
                  {courseTitle}
                </p>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-foreground/40">
                  <div
                    className="h-full rounded-full bg-primary-foreground transition-[width] duration-300"
                    style={{ width: `${normalizedCompletionPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center gap-1">
                  <p className="mt-2 text-xs text-primary-foreground font-medium">
                    {normalizedCompletionPercent}% completed
                  </p>
                  <p className="mt-1 bg-primary-foreground/15 font-display py-1 w-fit rounded-full px-3 text-[11px] text-primary-foreground/85 dark:text-foreground">
                    {completedLessonsCount}/{totalLessons} lessons
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {modules.map((module) => {
            const isActiveModule = module.id === currentModuleId;
            const isExpanded = !collapsedModuleIds.includes(module.id);
            return (
              <div key={module.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => handleModuleToggle(module.id)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors",
                    isActiveModule ? "bg-accent dark:bg-muted/50" : "bg-background"
                  )}
                >
                  <p className="text-sm font-semibold leading-5 text-foreground/90">
                    {module.title}
                  </p>
                  <HiChevronDown
                    className={cn(
                      "size-4 shrink-0 text-foreground/55 transition-transform",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>

                {isExpanded ? (
                  <div>
                    {module.lessons.map((lesson) => {
                      const isActive = lesson.id === currentLessonId;
                      const isCompleted = Boolean(lessonCompletionMap[lesson.id]);
                      const LessonIcon = getLessonIcon(lesson.contentType);

                      return (
                        <Link
                          key={lesson.id}
                          href={`/courses/${courseId}/${lesson.id}`}
                          onClick={(event) => handleLessonNavigation(event, lesson.id)}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 px-4 py-2.5 text-xs transition-colors duration-200",
                            isActive
                              ? "bg-primary/15 dark:bg-primary/10 text-primary"
                              : "text-foreground/75 dark:text-foreground/60 hover:bg-muted dark:hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <AiFillCheckSquare className="mt-1 size-4.5 shrink-0 text-primary" />
                          ) : (
                            <AiOutlineCheckSquare className="mt-1 size-4.5 text-primary/70 shrink-0" />
                          )}
                          <LessonIcon className="mt-1 size-4.5 shrink-0" />
                          <span className="leading-5.5 text-xs">{lesson.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
