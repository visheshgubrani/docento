"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { MdOutlineAssignment } from "react-icons/md";

import { useCourse } from "@/lib/hooks/use-courses";
import { useProjectRouteId } from "@/lib/hooks/use-project-route-id";
import {
  createAssignment,
  deleteAssignment,
  getAssignment,
  updateAssignment,
  type Assignment,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

function toDatePickerValue(isoDate?: string | null) {
  if (!isoDate) return "";
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AssignmentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = useProjectRouteId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const courseId = typeof params?.courseId === "string" ? params.courseId : "";
  const lessonId = typeof params?.lessonId === "string" ? params.lessonId : "";

  const { data: course, isLoading: isLoadingCourse } = useCourse(
    projectId,
    courseId
  );

  const currentModule = course?.modules?.find((module) =>
    module.lessons.some((lesson) => lesson.id === lessonId)
  );
  const currentLesson = currentModule?.lessons?.find(
    (lesson) => lesson.id === lessonId
  );

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalPoints, setTotalPoints] = useState("100");

  useEffect(() => {
    const loadAssignment = async () => {
      if (!projectId || !courseId || !currentModule?.id || !lessonId) {
        setAssignment(null);
        setIsLoadingAssignment(false);
        return;
      }

      try {
        setIsLoadingAssignment(true);
        const data = await getAssignment(
          projectId,
          courseId,
          currentModule.id,
          lessonId
        );
        setAssignment(data);

        if (data) {
          setTitle(data.title);
          setDescription(data.description ?? "");
          setDueDate(toDatePickerValue(data.dueDate));
          setTotalPoints(String(data.totalPoints));
        } else {
          setTitle(
            currentLesson?.title ? `${currentLesson.title} Assignment` : ""
          );
          setDescription("");
          setDueDate("");
          setTotalPoints("100");
        }
      } catch (error) {
        console.error("Failed to load assignment:", error);
        toast({
          title: "Error",
          description: "Failed to load assignment details.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAssignment(false);
      }
    };

    loadAssignment();
  }, [
    projectId,
    courseId,
    currentModule?.id,
    lessonId,
    currentLesson?.title,
    toast,
  ]);

  const handleBack = () => {
    router.push(`/p/${projectId}/courses/${courseId}/curriculum/${lessonId}`);
  };

  const handleSave = async () => {
    if (!projectId || !courseId || !currentModule?.id || !lessonId) return;

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for this assignment.",
        variant: "destructive",
      });
      return;
    }

    const points = Number(totalPoints);
    if (!Number.isFinite(points) || points < 1) {
      toast({
        title: "Invalid points",
        description: "Total points must be at least 1.",
        variant: "destructive",
      });
      return;
    }

    let normalizedDueDate: Date | null = null;
    if (dueDate) {
      const [year, month, day] = dueDate.split("-").map(Number);
      if (year && month && day) {
        normalizedDueDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      } else {
        normalizedDueDate = new Date(dueDate);
      }
    }
    if (normalizedDueDate && Number.isNaN(normalizedDueDate.getTime())) {
      toast({
        title: "Invalid due date",
        description: "Please provide a valid due date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        dueDate: normalizedDueDate ? normalizedDueDate.toISOString() : null,
        totalPoints: Math.round(points),
      };

      const saved = assignment
        ? await updateAssignment(
            projectId,
            courseId,
            currentModule.id,
            lessonId,
            payload
          )
        : await createAssignment(
            projectId,
            courseId,
            currentModule.id,
            lessonId,
            payload
          );

      setAssignment(saved);
      setTitle(saved.title);
      setDescription(saved.description ?? "");
      setDueDate(toDatePickerValue(saved.dueDate));
      setTotalPoints(String(saved.totalPoints));

      await queryClient.invalidateQueries({
        queryKey: ["project-course", projectId, courseId],
      });

      toast({
        title: assignment ? "Assignment updated" : "Assignment created",
        description: "Assignment details were saved successfully.",
      });
      router.push(`/p/${projectId}/courses/${courseId}/curriculum/${lessonId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save assignment.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !assignment ||
      !projectId ||
      !courseId ||
      !currentModule?.id ||
      !lessonId
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAssignment(projectId, courseId, currentModule.id, lessonId);
      await queryClient.invalidateQueries({
        queryKey: ["project-course", projectId, courseId],
      });
      toast({
        title: "Assignment deleted",
        description: "The assignment was removed from this lesson.",
      });
      router.push(`/p/${projectId}/courses/${courseId}/curriculum/${lessonId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete assignment.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!projectId || !courseId || !lessonId) {
    return (
      <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Missing lesson information. Select a lesson from the curriculum to
        continue.
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          className="gap-2 cursor-pointer hover:underline"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4" />
          Back to lesson
        </Button>
      </div>

      <div className="rounded-md border border-neutral-300 bg-background overflow-hidden">
        <div className="flex items-start gap-3 border-b border-neutral-200 bg-muted px-5 py-4">
          <MdOutlineAssignment className="mt-1.5 size-7 text-accent" />
          <div>
            {isLoadingCourse || isLoadingAssignment ? (
              <div className="space-y-2 pt-0.5">
                <h1 className="text-lg font-semibold text-foreground">
                  Assignment Builder
                </h1>
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-foreground">
                  Assignment Builder
                </h1>
                <p className="text-sm text-foreground/70">
                  {currentLesson?.title ?? "Lesson"}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-8 bg-muted/5 p-5">
          {isLoadingCourse || isLoadingAssignment ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-sm" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-28 w-full rounded-sm" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-11 w-full rounded-sm" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-11 w-full rounded-sm" />
                </div>
              </div>
              <Skeleton className="h-11 w-40 rounded-sm" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="assignment-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assignment-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Final project submission"
                  className="mt-2 rounded-xs shadow-none border border-muted-foreground/75 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignment-description">Description</Label>
                <Textarea
                  id="assignment-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  className="mt-2 rounded-xs shadow-none border border-muted-foreground/75 bg-white"
                  placeholder="Describe what students must submit and any grading criteria."
                />
              </div>

              <div className="grid gap-4 md:gap-7 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignment-due-date">
                    Due date{" "}
                    <span className="ml-1 text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <DatePickerInput
                    id="assignment-due-date"
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="Select due date"
                    className="mt-2 rounded-xs shadow-none border border-muted-foreground/75 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment-points">
                    Total points <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="assignment-points"
                    type="number"
                    className="mt-2 rounded-xs py-5 shadow-none border border-muted-foreground/75 bg-white"
                    min={1}
                    value={totalPoints}
                    onChange={(event) => setTotalPoints(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-6">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="cursor-pointer rounded-xs shadow-none border border-muted-foreground/75 bg-accent/85 font-semibold hover:bg-accent"
                >
                  {isSaving
                    ? "Saving..."
                    : assignment
                    ? "Save changes"
                    : "Create assignment"}
                </Button>
                {/* {assignment ? (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving}
                    className="cursor-pointer gap-1.5 rounded-xs shadow-none border border-muted-foreground/75"
                  >
                    <Trash2 className="size-4" />
                    {isDeleting ? "Deleting..." : "Delete assignment"}
                  </Button>
                ) : null} */}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
