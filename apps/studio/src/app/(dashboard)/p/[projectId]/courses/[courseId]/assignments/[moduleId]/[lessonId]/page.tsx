"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchCourseEnrollments,
  getAssignment,
  gradeAssignmentSubmission,
  listAssignmentSubmissions,
  type AssignmentSubmission,
  type CourseEnrollment,
} from "@/lib/api";
import { useCourse } from "@/lib/hooks/use-courses";
import { useProjectRouteId } from "@/lib/hooks/use-project-route-id";
import { cn } from "@/lib/utils";

type AssignmentsDetailTab = "submitted" | "not-submitted";

const submissionDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const lastActiveFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatSubmissionDate(value?: string | null) {
  if (!value) return "Unknown";
  try {
    return submissionDateFormatter.format(new Date(value));
  } catch {
    return "Unknown";
  }
}

function formatLastActive(value?: string | null) {
  if (!value) return "Not tracked";
  try {
    return lastActiveFormatter.format(new Date(value));
  } catch {
    return "Not tracked";
  }
}

function getEnrollmentDisplayName(enrollment: CourseEnrollment) {
  return (
    enrollment.endUser?.managedUser?.name?.trim() ||
    enrollment.endUser?.email ||
    enrollment.endUser?.externalId ||
    "Unnamed user"
  );
}

function getEnrollmentContact(enrollment: CourseEnrollment) {
  return (
    enrollment.endUser?.email ||
    enrollment.endUser?.externalId ||
    "Not provided"
  );
}

function getSubmissionFileName(fileUrl?: string | null) {
  if (!fileUrl) return "Uploaded file";

  const normalizeFileName = (value: string) => {
    const decoded = decodeURIComponent(value);
    const extensionIndex = decoded.lastIndexOf(".");
    const baseName =
      extensionIndex > 0 ? decoded.slice(0, extensionIndex) : decoded;
    const extension = extensionIndex > 0 ? decoded.slice(extensionIndex) : "";
    const cleanedBaseName = baseName.replace(
      /-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ""
    );

    return cleanedBaseName
      ? `${cleanedBaseName}${extension}`
      : decoded || "Uploaded file";
  };

  try {
    const pathname = new URL(fileUrl).pathname;
    const filename = pathname.split("/").pop();
    return filename ? normalizeFileName(filename) : "Uploaded file";
  } catch {
    const filename = fileUrl.split("/").pop()?.split("?")[0];
    return filename ? normalizeFileName(filename) : "Uploaded file";
  }
}

function getSubmissionViewHref(submission: AssignmentSubmission) {
  const fileUrl = submission.fileUrl?.trim();
  if (fileUrl) return fileUrl;

  const content = submission.content?.trim();
  if (!content) return null;

  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}

function SubmissionPreview({
  submission,
}: {
  submission: AssignmentSubmission;
}) {
  const textSubmission = submission.content?.trim() ?? "";
  const fileUrl = submission.fileUrl?.trim() ?? "";
  const hasTextSubmission = textSubmission.length > 0;
  const hasFileSubmission = fileUrl.length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-muted p-4">
      <div className="space-y-1">
        {/* <p className='text-sm font-medium text-foreground'>Submitted work</p> */}
        <p className="text-base font-medium text-foreground/85">
          Submitted on {formatSubmissionDate(submission.submittedAt)}
        </p>
      </div>

      {hasTextSubmission ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Text response
          </p>
          <ScrollArea className="max-h-64 rounded-md border border-neutral-200 bg-background">
            <div className="p-3">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                {textSubmission}
              </pre>
            </div>
          </ScrollArea>
        </div>
      ) : null}

      {hasFileSubmission ? (
        <div className="space-y-2">
          <p className="text-xs pt-2 font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Uploaded file
          </p>
          <div className="rounded-md border border-neutral-300 bg-background p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold text-accent">
                  {getSubmissionFileName(fileUrl)}
                </p>
                <p className="text-xs mt-1 text-foreground/60">
                  Open the student&apos;s uploaded file in a new tab.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="shrink-0 py-5 hover:text-lime-700 font-semibold"
              >
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open file
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!hasTextSubmission && !hasFileSubmission ? (
        <div className="rounded-md border border-dashed border-neutral-200 bg-background px-3 py-4 text-sm text-muted-foreground">
          No submission content was attached to this record.
        </div>
      ) : null}
    </div>
  );
}

async function fetchAllActiveEnrollments(projectId: string, courseId: string) {
  const all: CourseEnrollment[] = [];
  const pageSize = 100;
  let page = 1;

  while (true) {
    const response = await fetchCourseEnrollments(projectId, courseId, {
      page,
      limit: pageSize,
      status: "active",
    });

    all.push(...response.enrollments);

    if (
      !response.pagination?.hasMore ||
      page >= response.pagination.totalPages
    ) {
      break;
    }

    page += 1;
  }

  return all;
}

function TableSkeletonRows({
  includeStatus = true,
  includeScore = false,
}: {
  includeStatus?: boolean;
  includeScore?: boolean;
}) {
  return (
    <>
      {[0, 1, 2, 3].map((item) => (
        <TableRow key={item}>
          <TableCell>
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-44 rounded bg-muted animate-pulse" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          </TableCell>
          {includeStatus ? (
            <TableCell>
              <div className="h-7 w-24 rounded-full bg-muted animate-pulse" />
            </TableCell>
          ) : null}
          {includeScore ? (
            <TableCell>
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </TableCell>
          ) : null}
          <TableCell className="text-right">
            <div className="ml-auto h-8 w-24 rounded bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function AssignmentSubmissionsDetailPage() {
  const params = useParams();
  const projectId = useProjectRouteId();
  const courseId = typeof params?.courseId === "string" ? params.courseId : "";
  const moduleId = typeof params?.moduleId === "string" ? params.moduleId : "";
  const lessonId = typeof params?.lessonId === "string" ? params.lessonId : "";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<AssignmentsDetailTab>("submitted");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<AssignmentSubmission | null>(null);
  const [gradeValue, setGradeValue] = useState("");
  const [feedbackValue, setFeedbackValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: course, isLoading: isCourseLoading } = useCourse(
    projectId,
    courseId
  );

  const {
    data: assignment,
    isLoading: isAssignmentLoading,
    isError: isAssignmentError,
    error: assignmentError,
    refetch: refetchAssignment,
  } = useQuery({
    queryKey: ["course-assignment", projectId, courseId, moduleId, lessonId],
    enabled: Boolean(projectId && courseId && moduleId && lessonId),
    queryFn: () => getAssignment(projectId, courseId, moduleId, lessonId),
  });

  const {
    data: submissionsData,
    isLoading: isSubmissionsLoading,
    isFetching: isSubmissionsFetching,
    isError: isSubmissionsError,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: [
      "course-assignment-submissions",
      projectId,
      courseId,
      moduleId,
      lessonId,
    ],
    enabled: Boolean(
      projectId && courseId && moduleId && lessonId && assignment?.id
    ),
    queryFn: () =>
      listAssignmentSubmissions(projectId, courseId, moduleId, lessonId),
  });

  const {
    data: enrollments = [],
    isLoading: isEnrollmentsLoading,
    isError: isEnrollmentsError,
    error: enrollmentsError,
    refetch: refetchEnrollments,
  } = useQuery<CourseEnrollment[], Error>({
    queryKey: ["course-assignment-enrollments", projectId, courseId],
    enabled: Boolean(projectId && courseId),
    queryFn: () => fetchAllActiveEnrollments(projectId, courseId),
  });

  const submissions = useMemo(
    () => submissionsData?.submissions ?? [],
    [submissionsData?.submissions]
  );

  const enrollmentByEndUserId = useMemo(
    () =>
      new Map(
        enrollments.map((enrollment) => [enrollment.endUser.id, enrollment])
      ),
    [enrollments]
  );

  const submittedEndUserIds = useMemo(
    () => new Set(submissions.map((submission) => submission.endUserId)),
    [submissions]
  );

  const notSubmittedEnrollments = useMemo(
    () =>
      enrollments.filter(
        (enrollment) => !submittedEndUserIds.has(enrollment.endUser.id)
      ),
    [enrollments, submittedEndUserIds]
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredSubmissions = useMemo(() => {
    if (!normalizedSearchQuery) return submissions;

    return submissions.filter((submission) => {
      const enrollment = enrollmentByEndUserId.get(submission.endUserId);
      const displayName =
        enrollment?.endUser?.managedUser?.name?.trim() ||
        submission.endUser?.email ||
        submission.endUser?.externalId ||
        enrollment?.endUser?.email ||
        enrollment?.endUser?.externalId ||
        "Unnamed user";

      return displayName.toLowerCase().includes(normalizedSearchQuery);
    });
  }, [enrollmentByEndUserId, normalizedSearchQuery, submissions]);

  const filteredNotSubmittedEnrollments = useMemo(() => {
    if (!normalizedSearchQuery) return notSubmittedEnrollments;

    return notSubmittedEnrollments.filter((enrollment) =>
      getEnrollmentDisplayName(enrollment)
        .toLowerCase()
        .includes(normalizedSearchQuery)
    );
  }, [normalizedSearchQuery, notSubmittedEnrollments]);

  const moduleContext = useMemo(
    () => course?.modules.find((module) => module.id === moduleId),
    [course, moduleId]
  );
  const lessonContext = useMemo(
    () => moduleContext?.lessons.find((lesson) => lesson.id === lessonId),
    [moduleContext, lessonId]
  );

  const gradeMutation = useMutation({
    mutationFn: async (payload: {
      submissionId: string;
      grade: number;
      feedback?: string;
    }) =>
      gradeAssignmentSubmission(
        projectId,
        courseId,
        moduleId,
        lessonId,
        payload.submissionId,
        {
          grade: payload.grade,
          feedback: payload.feedback,
        }
      ),
    onSuccess: () => {
      toast({
        title: "Submission graded",
        description: "The grade was saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [
          "course-assignment-submissions",
          projectId,
          courseId,
          moduleId,
          lessonId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["course-assignments-directory", projectId, courseId],
      });
      setReviewDialogOpen(false);
      setSelectedSubmission(null);
      setGradeValue("");
      setFeedbackValue("");
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to save grade",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openReviewDialog = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setGradeValue(
      submission.grade === null || submission.grade === undefined
        ? ""
        : String(submission.grade)
    );
    setFeedbackValue(submission.feedback ?? "");
    setReviewDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission || !assignment) return;

    const parsedGrade = Number(gradeValue);
    if (!Number.isFinite(parsedGrade)) {
      toast({
        title: "Invalid grade",
        description: "Enter a valid numeric grade.",
        variant: "destructive",
      });
      return;
    }

    if (parsedGrade < 0 || parsedGrade > assignment.totalPoints) {
      toast({
        title: "Grade out of range",
        description: `Grade must be between 0 and ${assignment.totalPoints}.`,
        variant: "destructive",
      });
      return;
    }

    await gradeMutation.mutateAsync({
      submissionId: selectedSubmission.id,
      grade: parsedGrade,
      feedback: feedbackValue,
    });
  };

  const handleSendReminder = () => {
    toast({
      title: "Coming soon",
      description: "Email reminders will be available in a future update.",
    });
  };

  const isInitialLoading =
    isCourseLoading ||
    isAssignmentLoading ||
    (Boolean(assignment?.id) && isSubmissionsLoading);

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <Button
          asChild
          variant="ghost"
          className="mb-4 -ml-3 text-foreground/70 hover:text-foreground"
        >
          <Link href={`/p/${projectId}/courses/${courseId}/assignments`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Assignments
          </Link>
        </Button>
        <h2 className="text-3xl font-semibold font-literata tracking-wide">
          {assignment?.title || lessonContext?.title || "Assignment"}
        </h2>
        <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
          {moduleContext?.title || "Module"} • Review submissions and track
          students who still need to submit.
        </p>
      </div>

      {isInitialLoading ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-neutral-200">
                <TableHead className="text-foreground/90 font-medium pl-4">
                  Student
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Submission Date
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Status
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Score
                </TableHead>
                <TableHead className="text-right text-foreground/90 font-medium pr-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeletonRows includeStatus includeScore />
            </TableBody>
          </Table>
        </div>
      ) : isAssignmentError || isSubmissionsError || isEnrollmentsError ? (
        <div className="rounded-lg border border-neutral-200 bg-background p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                Unable to load assignment submissions
              </p>
              <p className="text-sm text-muted-foreground">
                {assignmentError?.message ||
                  submissionsError?.message ||
                  enrollmentsError?.message ||
                  "Please try again in a moment."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                refetchAssignment();
                refetchSubmissions();
                refetchEnrollments();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : !assignment ? (
        <div className="w-full bg-background rounded-sm border border-neutral-200 py-16 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Assignment not found
            </h3>
            <p className="text-base text-foreground/60 max-w-md">
              This lesson does not have an assignment record yet.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-sm border border-neutral-200 bg-background p-1">
              <button
                type="button"
                onClick={() => setActiveTab("submitted")}
                className={cn(
                  "rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === "submitted"
                    ? "bg-muted text-foreground"
                    : "text-foreground/65 hover:text-foreground"
                )}
              >
                Submitted ({submissions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("not-submitted")}
                className={cn(
                  "rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === "not-submitted"
                    ? "bg-muted text-foreground"
                    : "text-foreground/65 hover:text-foreground"
                )}
              >
                Not Submitted ({notSubmittedEnrollments.length})
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full min-w-[240px] sm:w-[380px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by student name"
                  className="h-10 rounded-sm shadow-none border-neutral-300 bg-background pl-9"
                />
              </div>
              {isSubmissionsFetching ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing
                </span>
              ) : null}
            </div>
          </div>

          {activeTab === "submitted" ? (
            filteredSubmissions.length === 0 ? (
              <div className="w-full bg-background rounded-sm border border-neutral-200 py-14 px-6 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {normalizedSearchQuery
                    ? "No matching submissions"
                    : "No submissions yet"}
                </h3>
                <p className="text-sm text-foreground/60">
                  {normalizedSearchQuery
                    ? "Try a different student name."
                    : "Student submissions will appear here as soon as they upload their work."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b border-neutral-200">
                      <TableHead className="text-foreground/90 font-medium pl-4">
                        Student
                      </TableHead>
                      <TableHead className="text-foreground/90 font-medium">
                        Submission Date
                      </TableHead>
                      <TableHead className="pl-6 text-foreground/90 font-medium">
                        Status
                      </TableHead>
                      <TableHead className="text-foreground/90 font-medium">
                        Score
                      </TableHead>
                      <TableHead className="text-end text-foreground/90 font-medium pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => {
                      const viewHref = getSubmissionViewHref(submission);
                      const enrollment = enrollmentByEndUserId.get(
                        submission.endUserId
                      );
                      const displayName =
                        enrollment?.endUser?.managedUser?.name?.trim() ||
                        submission.endUser?.email ||
                        submission.endUser?.externalId ||
                        enrollment?.endUser?.email ||
                        enrollment?.endUser?.externalId ||
                        "Unnamed user";

                      const contact =
                        submission.endUser?.email ||
                        submission.endUser?.externalId ||
                        enrollment?.endUser?.email ||
                        enrollment?.endUser?.externalId ||
                        "Not provided";

                      const isGraded =
                        submission.grade !== null &&
                        submission.grade !== undefined;

                      return (
                        <TableRow
                          key={submission.id}
                          className="border-b border-neutral-100 hover:bg-muted/70"
                        >
                          <TableCell className="pl-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {displayName}
                              </span>
                              <span className="text-sm text-foreground/60">
                                {contact}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground/70">
                            {formatSubmissionDate(submission.submittedAt)}
                          </TableCell>
                          <TableCell>
                            {isGraded ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Graded
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                Pending
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-foreground/80">
                            {isGraded ? `${submission.grade}/${assignment.totalPoints}` : "—"}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex justify-end gap-3">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-9 min-w-24 cursor-pointer px-3 hover:text-lime-600"
                              >
                                <a
                                  href={viewHref ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-disabled={!viewHref}
                                  onClick={(event) => {
                                    if (!viewHref) {
                                      event.preventDefault();
                                    }
                                  }}
                                >
                                  <ExternalLink className="mr-0.5 h-4 w-4" />
                                  View Submission
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 min-w-24 cursor-pointer px-3 hover:text-lime-600"
                                onClick={() => openReviewDialog(submission)}
                              >
                                Grade
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          ) : isEnrollmentsLoading ? (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b border-neutral-200">
                    <TableHead className="text-foreground/90 font-medium pl-4">
                      Student
                    </TableHead>
                    <TableHead className="text-foreground/90 font-medium">
                      Last Active
                    </TableHead>
                    <TableHead className="text-right text-foreground/90 font-medium pr-4">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableSkeletonRows includeStatus={false} />
                </TableBody>
              </Table>
            </div>
          ) : filteredNotSubmittedEnrollments.length === 0 ? (
            <div className="w-full bg-background rounded-sm border border-neutral-200 py-14 px-6 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {normalizedSearchQuery
                  ? "No matching students"
                  : "Everyone has submitted"}
              </h3>
              <p className="text-sm text-foreground/60">
                {normalizedSearchQuery
                  ? "Try a different student name."
                  : "There are no outstanding students for this assignment."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b border-neutral-200">
                    <TableHead className="text-foreground/90 font-medium pl-4">
                      Student
                    </TableHead>
                    <TableHead className="text-foreground/90 font-medium">
                      Last Active
                    </TableHead>
                    <TableHead className="text-right text-foreground/90 font-medium pr-4">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotSubmittedEnrollments.map((enrollment) => (
                    <TableRow
                      key={enrollment.id}
                      className="border-b border-neutral-100 hover:bg-muted/70"
                    >
                      <TableCell className="pl-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {getEnrollmentDisplayName(enrollment)}
                          </span>
                          <span className="text-sm text-foreground/60">
                            {getEnrollmentContact(enrollment)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground/70">
                        {formatLastActive(
                          enrollment.endUser?.delegatedUser?.lastSeenAt ??
                            enrollment.enrolledAt
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3"
                          onClick={handleSendReminder}
                        >
                          Send Reminder
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <Dialog
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          if (gradeMutation.isPending) return;
          setReviewDialogOpen(open);
          if (!open) {
            setSelectedSubmission(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-neutral-200 px-6 py-4 sm:px-6">
            <DialogTitle>Grade submission</DialogTitle>
            <DialogDescription className="text-foreground/70">
              Provide a score between 0 and {assignment?.totalPoints ?? 100}.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6">
            {selectedSubmission ? (
              <SubmissionPreview submission={selectedSubmission} />
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
              <div className="rounded-lg gap-4 flex flex-col items-center justify-center w-full text-center border border-neutral-200 bg-accent-100/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/65">
                  Assignment score
                </p>
                <p className="mt-2 text-3xl font-semibold text-lime-700">
                  ___ / {assignment?.totalPoints ?? 100}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Maximum points available for this submission.
                </p>
              </div>

              <div className="space-y-4 rounded-lg border border-neutral-200 bg-muted/50 p-4">
                <div className="space-y-2">
                  <Label className="font-semibold" htmlFor="grade">
                    Score
                  </Label>
                  <Input
                    id="grade"
                    type="number"
                    min={0}
                    max={assignment?.totalPoints ?? 100}
                    step="0.01"
                    value={gradeValue}
                    onChange={(event) => setGradeValue(event.target.value)}
                    placeholder={`0 - ${assignment?.totalPoints ?? 100}`}
                    className="mt-1.5 h-11 rounded-sm border-accent-500 shadow-none bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold" htmlFor="feedback">
                    Feedback (optional)
                  </Label>
                  <Textarea
                    id="feedback"
                    value={feedbackValue}
                    onChange={(event) => setFeedbackValue(event.target.value)}
                    placeholder="Add notes for the student..."
                    className="mt-1.5 min-h-32 rounded-sm border-accent-500 shadow-none bg-white"
                    rows={6}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-neutral-200 bg-background px-6 py-4 sm:justify-between sm:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={gradeMutation.isPending}
              className="h-10 rounded-sm cursor-pointer hover:text-foreground sm:min-w-28"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveGrade}
              disabled={gradeMutation.isPending}
              className="h-10 rounded-sm hover:bg-accent/90 cursor-pointer bg-accent sm:min-w-32"
            >
              {gradeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Grade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
