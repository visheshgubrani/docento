"use client";

import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiCheckCircle,
  HiClock,
  HiDocumentText,
  HiXCircle,
} from "react-icons/hi2";
import {
  ApiRequestError,
  createStudentAssignmentUploadPresign,
  fetchStudentAssignmentSubmission,
  fetchStudentLessonAssignment,
  submitStudentAssignment,
  type StudentAssignmentSubmission,
  type StudentLessonAssignment,
} from "@/lib/lms-api-client";
import { cn } from "@/lib/utils";
import { RiTaskFill } from "react-icons/ri";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".zip"];

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".zip": "application/zip",
};

const ACCEPTED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
]);

type AssignmentLessonContentProps = {
  lessonId: string;
  lessonTitle: string;
  lessonDescription?: string | null;
  onSubmissionSuccess?: () => void;
};

type AssignmentViewState = "briefing" | "processing" | "result";

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return fileName.slice(dotIndex).toLowerCase();
}

function inferFileName(fileUrl?: string | null) {
  if (!fileUrl) return "submission";

  try {
    const parsed = new URL(fileUrl);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
    if (!lastSegment) return "submission";

    const decoded = decodeURIComponent(lastSegment);
    return decoded.replace(
      /-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\.)/i,
      ""
    );
  } catch {
    return "submission";
  }
}

function formatDueDate(value?: string | null) {
  if (!value) return "No due date";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No due date";

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSubmissionTime(value?: string | null) {
  if (!value) return "Unknown";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isSubmissionGraded(submission: StudentAssignmentSubmission | null) {
  if (!submission) return false;
  return typeof submission.grade === "number";
}

function isAllowedFile(file: File) {
  const extension = getFileExtension(file.name);
  if (ACCEPTED_EXTENSIONS.includes(extension)) return true;
  return ACCEPTED_CONTENT_TYPES.has(file.type);
}

function toStatusLabel(
  state: AssignmentViewState,
  isDueDatePassed: boolean
): { text: string; tone: string } {
  if (state === "result") {
    return {
      text: "Graded",
      tone: "border-lime-400 bg-lime-50 text-lime-700 dark:border-lime-500/25 dark:bg-lime-500/15 dark:text-lime-300",
    };
  }

  if (state === "processing") {
    return {
      text: "Waiting for Grading",
      tone: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }

  if (isDueDatePassed) {
    return {
      text: "Deadline Passed",
      tone: "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300",
    };
  }

  return {
    text: "Not Submitted",
    tone: "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-300",
  };
}

export function AssignmentLessonContent({
  lessonId,
  lessonTitle,
  lessonDescription,
  onSubmissionSuccess,
}: AssignmentLessonContentProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [assignmentData, setAssignmentData] = useState<StudentLessonAssignment | null>(null);
  const [submission, setSubmission] = useState<StudentAssignmentSubmission | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastUploadedFileName, setLastUploadedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUpdatingSubmission, setIsUpdatingSubmission] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadAssignmentState = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);

    try {
      const [assignmentSnapshot, submissionSnapshot] = await Promise.all([
        fetchStudentLessonAssignment(lessonId),
        fetchStudentAssignmentSubmission(lessonId),
      ]);

      setAssignmentData(assignmentSnapshot);
      setSubmission(submissionSnapshot);
      setIsUpdatingSubmission(false);
      setUploadError(null);
      setSelectedFile(null);
      setLastUploadedFileName(null);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setLoadingError("This lesson does not have an assignment configured yet.");
      } else {
        setLoadingError(error instanceof Error ? error.message : "Failed to load assignment.");
      }
      setAssignmentData(null);
      setSubmission(null);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadAssignmentState();
  }, [loadAssignmentState]);

  const assignment = assignmentData?.assignment ?? null;
  const dueDateLabel = formatDueDate(assignment?.dueDate);
  const isDueDatePassed = useMemo(() => {
    if (!assignment?.dueDate) return false;
    const parsed = new Date(assignment.dueDate);
    if (Number.isNaN(parsed.getTime())) return false;
    return Date.now() > parsed.getTime();
  }, [assignment?.dueDate]);

  const canResubmit = assignmentData?.permissions?.canResubmit ?? !isDueDatePassed;

  const state: AssignmentViewState = useMemo(() => {
    if (isUpdatingSubmission) return "briefing";
    if (!submission) return "briefing";
    if (isSubmissionGraded(submission)) return "result";
    return "processing";
  }, [isUpdatingSubmission, submission]);

  const status = toStatusLabel(state, isDueDatePassed);

  const assignmentTitle = assignment?.title || lessonTitle;
  const assignmentInstructions =
    assignment?.description?.trim() ||
    lessonDescription?.trim() ||
    "No additional instructions were added by the instructor.";
  const totalPoints = assignment?.totalPoints ?? 100;
  const submittedFileName =
    lastUploadedFileName || inferFileName(submission?.fileUrl) || "submission";

  const handleFileSelection = (file: File | null) => {
    setUploadError(null);
    setSelectedFile(file);
  };

  const handleBrowseClick = () => {
    if (isDueDatePassed) return;
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadError("Choose a file before uploading.");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setUploadError("File size exceeds 10MB. Upload a smaller file.");
      return;
    }

    if (!isAllowedFile(selectedFile)) {
      setUploadError("Invalid format. Upload .pdf, .docx, or .zip.");
      return;
    }

    if (isDueDatePassed) {
      setUploadError("The due date has passed. New submissions are closed.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const extension = getFileExtension(selectedFile.name);
      const inferredType = CONTENT_TYPE_BY_EXTENSION[extension] || "application/pdf";
      const contentType = selectedFile.type?.trim() || inferredType;

      const presign = await createStudentAssignmentUploadPresign(lessonId, {
        contentType,
        fileName: selectedFile.name,
      });

      const providedType = presign.headers?.["Content-Type"] || presign.headers?.["content-type"];

      const uploadResponse = await fetch(presign.presignedUrl, {
        method: presign.method || "PUT",
        headers: {
          ...(presign.headers ?? {}),
          ...(providedType ? {} : { "Content-Type": contentType }),
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage.");
      }

      const submitResponse = await submitStudentAssignment(lessonId, {
        fileUrl: presign.fileUrl,
      });

      setSubmission(submitResponse.submission);
      setLastUploadedFileName(selectedFile.name);
      setSelectedFile(null);
      setIsUpdatingSubmission(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onSubmissionSuccess?.();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to submit assignment.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (isDueDatePassed) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-2/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-48 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
      </div>
    );
  }

  if (loadingError || !assignment) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
        <p>{loadingError || "Assignment unavailable for this lesson."}</p>
        <button
          type="button"
          onClick={() => {
            void loadAssignmentState();
          }}
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-300/35 dark:text-red-100 dark:hover:bg-red-500/15"
        >
          <HiArrowPath className={cn("h-3.5 w-3.5", isLoading ? "animate-spin" : "")} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-950/70">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Assignment
        </p>
        <h3 className="mt-2 text-2xl font-medium text-neutral-900 dark:text-neutral-100 md:text-3xl">
          {assignmentTitle}
        </h3>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-4 flex flex-col items-start justify-between dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-[11px] uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Due Date
            </p>
            <p className="mt-2 font-medium text-sm text-neutral-800 dark:text-neutral-200">{dueDateLabel}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-4 flex flex-col items-start justify-between dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-[11px] uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Points
            </p>
            <p className="mt-2 font-medium text-sm text-neutral-800 dark:text-neutral-200">{totalPoints}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-4 flex flex-col items-start justify-between dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-[11px] uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              Status
            </p>
            <span
              className={`mt-2 font-medium inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${status.tone}`}
            >
              {status.text}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-950/70">
        {state === "briefing" ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-neutral-500 dark:text-neutral-500">
                Upload your final file to send it to your instructor.
              </p>
              <h4 className="text-lg xl:text-lg flex gap-1 items-center font-semibold text-neutral-800 dark:text-neutral-100">
                <RiTaskFill />
                {assignmentInstructions}
              </h4>
            </div>
            {/* 
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/80">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Assignment instructions
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                {assignmentInstructions}
              </p>
              <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
                Total Points: {totalPoints}
              </p>
            </div> */}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.zip"
              onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={handleBrowseClick}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleBrowseClick();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:bg-neutral-900/70",
                isDueDatePassed && "cursor-not-allowed opacity-70"
              )}
            >
              <div className="mx-auto inline-flex rounded-full border border-neutral-300 bg-white p-2 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                <HiDocumentText className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Drag and drop your PDF or Doc here
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                or click to choose a file
              </p>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-500">
              Max file size: 10MB. Accepted formats: .pdf, .docx, .zip
            </p>

            {selectedFile ? (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200">
                Selected: <span className="font-medium">{selectedFile.name}</span>
              </div>
            ) : null}

            {uploadError ? (
              <div className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-200">
                <HiXCircle className="h-4 w-4" />
                {uploadError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={isUploading || isDueDatePassed}
                className="cursor-pointer rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "Uploading..." : "Upload submission"}
              </button>

              {submission && isUpdatingSubmission ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsUpdatingSubmission(false);
                    setUploadError(null);
                  }}
                  className="cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {state === "processing" ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-100 px-3 py-1 text-sm font-semibold text-lime-700 dark:border-lime-500/30 dark:bg-lime-500/15 dark:text-lime-400">
              <HiCheckCircle className="h-4.5 w-4.5" />
              Assignment Submitted!
            </div>

            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/70">
              <p className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                Uploaded file
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="line-clamp-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {submittedFileName}
                </p>
                {submission?.fileUrl ? (
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <HiArrowDownTray className="h-4 w-4" />
                    Download
                  </a>
                ) : null}
              </div>
            </div>

            {/* <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
              <HiClock className="h-4 w-4" />
              Waiting for Grading
            </div> */}

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Submitted on {formatSubmissionTime(submission?.submittedAt)}
            </p>
          </div>
        ) : null}

        {state === "result" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-lime-300 bg-lime-100/70 p-4 dark:border-lime-500/30 dark:bg-lime-500/10">
              <p className="text-xs uppercase tracking-wide text-lime-700 dark:text-lime-300/90">
                Score
              </p>
              <p className="mt-2 text-2xl font-semibold text-lime-800 dark:text-lime-200">
                {submission?.grade ?? 0} / {totalPoints}
              </p>
            </div>

            <div className="rounded-md border border-neutral-200 bg-neutral-100 p-3 dark:border-neutral-800 dark:bg-neutral-800/70">
              <p className="text-sm uppercase font-light text-neutral-700 dark:text-neutral-300">
                Instructor Comment
              </p>
              <p className="mt-4 font-semibold whitespace-pre-wrap text-sm text-lime-800 dark:text-lime-300">
                {submission?.feedback?.trim() || "No comments were shared for this submission."}
              </p>
            </div>

            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/70">
              <p className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                Submitted file
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="line-clamp-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {submittedFileName}
                </p>
                {submission?.fileUrl ? (
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <HiArrowDownTray className="h-4 w-4" />
                    Download
                  </a>
                ) : null}
              </div>
            </div>

            {canResubmit ? (
              <button
                type="button"
                onClick={() => {
                  setIsUpdatingSubmission(true);
                  setUploadError(null);
                }}
                className="cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Update Submission
              </button>
            ) : (
              <p className="text-xs text-neutral-600 dark:text-neutral-500">
                Resubmission is currently disabled for this assignment.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
