"use client";

import { useState } from "react";
import { BsStars } from "react-icons/bs";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  Video,
  FileText,
  CheckCircle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type GeneratedCourseOutline, type GeneratedModule } from "@/lib/api";

type AIOutlinePreviewModalProps = {
  isOpen: boolean;
  outline: GeneratedCourseOutline | null;
  onClose: () => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  isCreating: boolean;
};

export function AIOutlinePreviewModal({
  isOpen,
  outline,
  onClose,
  onConfirm,
  onRegenerate,
  isGenerating,
  isCreating,
}: AIOutlinePreviewModalProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    new Set([0])
  );

  const toggleModule = (index: number) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(outline?.modules.map((_, i) => i) ?? []));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  if (!outline) return null;

  const totalLessons = outline.modules.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isCreating && onClose()}
    >
      <DialogContent className="md:max-w-[800px] lg:max-w-[900px] p-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200 bg-gradient-to-br from-accent/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 h-full flex items-center justify-center rounded-lg bg-accent/10">
              <BsStars className="size-6.5 text-accent" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">
                Review AI-Generated Course Outline
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-foreground/70">
                Preview the generated course structure before creating it
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="size-10 animate-spin text-accent" />
              <p className="text-foreground/70">
                Regenerating course outline...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Course Overview */}
              <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <h3 className="font-semibold text-lg mb-2">{outline.title}</h3>
                <p className="text-sm text-foreground/70 mb-4">
                  {outline.description}
                </p>

                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    <BookOpen className="size-4" />
                    <span>{outline.modules.length} modules</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle className="size-4" />
                    <span>{totalLessons} lessons</span>
                  </div>
                  {/* <div className="flex items-center gap-2 text-foreground">
                    <Clock className="size-4" />
                    <span>{outline.estimatedTotalHours} hours</span>
                  </div> */}
                </div>
              </div>

              {/* Expand/Collapse Controls */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAll}
                  className="text-xs h-8 cursor-pointer hover:text-accent"
                >
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collapseAll}
                  className="text-xs h-8 cursor-pointer hover:text-accent"
                >
                  Collapse All
                </Button>
              </div>

              {/* Modules List */}
              <div className="space-y-6">
                {outline.modules.map((module, moduleIndex) => (
                  <ModuleCard
                    key={moduleIndex}
                    module={module}
                    moduleIndex={moduleIndex}
                    isExpanded={expandedModules.has(moduleIndex)}
                    onToggle={() => toggleModule(moduleIndex)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-row items-center justify-between shrink-0">
          <div className="text-sm text-foreground/60">
            {isCreating ? (
              <span className="flex items-center gap-2">
                {/* <Loader2 className="size-4 animate-spin" /> */}
                Creating modules and lessons...
              </span>
            ) : (
              <span>Review the outline before confirming</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="rounded-md cursor-pointer hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRegenerate}
              disabled={isGenerating || isCreating}
              className="rounded-md cursor-pointer hover:text-foreground gap-2"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BsStars className="size-4" />
              )}
              Regenerate
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isGenerating || isCreating}
              className={cn(
                "gap-2 rounded-md cursor-pointer",
                "bg-accent hover:bg-accent/90 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4" />
                  Confirm & Create
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Module Card Component
function ModuleCard({
  module,
  moduleIndex,
  isExpanded,
  onToggle,
}: {
  module: GeneratedModule;
  moduleIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden bg-white">
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="size-5 text-foreground/50 shrink-0" />
        ) : (
          <ChevronUp className="size-5 text-foreground/50 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            Module {moduleIndex + 1}: {module.title}
          </div>
          <div className="text-sm text-foreground/50 truncate">
            {module.lessons.length} lesson
            {module.lessons.length === 1 ? "" : "s"}
          </div>
        </div>
      </button>

      {/* Module Content */}
      {isExpanded && (
        <div className="border-t border-neutral-200">
          {/* {module.description && (
            <div className="px-4 py-3 text-sm text-foreground/70 bg-neutral-50/50 border-b border-neutral-100">
              {module.description}
            </div>
          )} */}
          <div className="divide-y divide-neutral-100">
            {module.lessons.map((lesson, lessonIndex) => (
              <div
                key={lessonIndex}
                className="px-4 py-2.5 flex items-center gap-3 transition-colors"
              >
                <div className="text-xs text-foreground/60 w-6 shrink-0">
                  {lessonIndex + 1}
                </div>
                <div className="shrink-0">
                  {lesson.contentType === "VIDEO" ? (
                    <Video className="size-4 text-accent fill-accent" />
                  ) : (
                    <FileText className="size-4 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {lesson.title}
                  </div>
                  {lesson.description && (
                    <div className="text-xs text-foreground/60 mt-1 truncate">
                      {lesson.description}
                    </div>
                  )}
                </div>
                {/* {lesson.estimatedDuration > 0 && (
                  <div className="text-xs text-foreground/40 shrink-0 flex items-center gap-1">
                    <Clock className="size-3" />
                    {lesson.estimatedDuration} min
                  </div>
                )} */}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
