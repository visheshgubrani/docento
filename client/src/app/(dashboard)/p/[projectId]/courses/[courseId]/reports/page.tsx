"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Eye, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import type { IconType } from "react-icons";
import { BiSortAlt2 } from "react-icons/bi";
import { FaMoneyBillWave } from "react-icons/fa";
import { FaUserGraduate } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
import { PiLadderSimpleBold } from "react-icons/pi";
import { TbChartDonutFilled } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CourseEnrollment } from "@/lib/api";
import {
  useProjectAnalyticsCourseInsights,
  useProjectAnalyticsStudents,
} from "@/lib/hooks/use-analytics";
import { useCourseEnrollments } from "@/lib/hooks/use-course-enrollments";
import { useProjectRouteId } from "@/lib/hooks/use-project-route-id";
import { cn } from "@/lib/utils";

type ReportStatus = "in_progress" | "completed";
type CertificateStatus = "received" | "not_available";
type FilterTab = "all" | "in_progress" | "completed";
type SortBy = "name_asc" | "progress_desc" | "progress_asc" | "recent_activity";

type StudentReportRow = {
  id: string;
  name: string;
  email: string;
  progress: number;
  status: ReportStatus;
  certificateStatus: CertificateStatus;
  lastActive: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const lastActiveFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getDisplayName(enrollment: CourseEnrollment) {
  return (
    enrollment.endUser?.managedUser?.name?.trim() ||
    enrollment.endUser?.email ||
    enrollment.endUser?.externalId ||
    "Unnamed user"
  );
}

function getContact(enrollment: CourseEnrollment) {
  return (
    enrollment.endUser?.email ||
    enrollment.endUser?.externalId ||
    "Not provided"
  );
}

function getInitials(name: string) {
  const [first, second] = name.trim().split(" ");
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase() || "ST";
}

function getStageLabel(progress: number) {
  if (progress === 100) return "Stage 5";
  if (progress >= 76) return "Stage 4";
  if (progress >= 51) return "Stage 3";
  if (progress >= 26) return "Stage 2";
  return "Stage 1";
}

function formatLastActive(timestamp: string | null) {
  if (!timestamp) return "Not tracked";

  try {
    return lastActiveFormatter.format(new Date(timestamp));
  } catch {
    return "Not tracked";
  }
}

function getStatusMeta(status: ReportStatus) {
  if (status === "completed") {
    return {
      label: "Completed",
      className: "border-lime-400 bg-lime-50 font-medium text-lime-700",
    };
  }

  return {
    label: "In Progress",
    className: "border-sky-200 bg-sky-50 font-medium text-sky-700",
  };
}

function getCertificateMeta(certificateStatus: CertificateStatus) {
  if (certificateStatus === "received") {
    return {
      label: "Certificate Available",
      icon: CheckCircle2,
      className: "text-lime-700 font-medium",
    };
  }

  return {
    label: "Not Yet Available",
    icon: Clock3,
    className: "text-amber-700 font-medium",
  };
}

export default function CourseReportsPage() {
  const projectId = useProjectRouteId();
  const params = useParams();
  const courseIdParam = params?.courseId;
  const courseId = Array.isArray(courseIdParam)
    ? courseIdParam[0]
    : courseIdParam ?? "";

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [sortBy, setSortBy] = useState<SortBy>("recent_activity");

  const {
    data: courseInsights,
    isLoading: isCourseInsightsLoading,
    isError: isCourseInsightsError,
    error: courseInsightsError,
  } = useProjectAnalyticsCourseInsights(projectId, courseId);

  const { data: studentAnalytics = [] } =
    useProjectAnalyticsStudents(projectId);

  const {
    data: enrollmentsData,
    isLoading: isEnrollmentsLoading,
    isFetching: isEnrollmentsFetching,
    isError: isEnrollmentsError,
    error: enrollmentsError,
    refetch,
  } = useCourseEnrollments(projectId, courseId, {
    page: 1,
    limit: 100,
    status: "all",
  });

  const studentActivityMap = useMemo(
    () =>
      new Map(
        studentAnalytics.map((student) => [
          student.id,
          student.lastActiveAt ?? null,
        ])
      ),
    [studentAnalytics]
  );

  const studentRows = useMemo<StudentReportRow[]>(() => {
    const enrollments = enrollmentsData?.enrollments ?? [];

    return enrollments.map((enrollment) => {
      const progress = Math.max(
        0,
        Math.min(100, Math.round(Number(enrollment.progress ?? 0)))
      );
      const isCompleted = Boolean(enrollment.completedAt) || progress >= 100;

      return {
        id: enrollment.endUserId,
        name: getDisplayName(enrollment),
        email: getContact(enrollment),
        progress,
        status: isCompleted ? "completed" : "in_progress",
        certificateStatus: isCompleted ? "received" : "not_available",
        lastActive:
          studentActivityMap.get(enrollment.endUserId) ??
          enrollment.endUser?.delegatedUser?.lastSeenAt ??
          enrollment.enrolledAt,
      };
    });
  }, [enrollmentsData, studentActivityMap]);

  const totalEnrollments =
    courseInsights?.metrics.totalEnrollments ??
    enrollmentsData?.pagination?.total ??
    studentRows.length;

  const completedStudents = studentRows.filter(
    (row) => row.status === "completed"
  ).length;

  const completionRate =
    courseInsights?.metrics.completionRate ??
    (totalEnrollments
      ? Math.round((completedStudents / totalEnrollments) * 100)
      : 0);

  const averageProgress =
    courseInsights?.metrics.averageProgress ??
    (studentRows.length
      ? Math.round(
          studentRows.reduce((sum, row) => sum + row.progress, 0) /
            studentRows.length
        )
      : 0);

  const totalRevenue = courseInsights?.metrics.revenue ?? 0;

  const filteredRows = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    let rows = [...studentRows];

    if (activeTab === "in_progress") {
      rows = rows.filter((row) => row.status === "in_progress");
    } else if (activeTab === "completed") {
      rows = rows.filter((row) => row.status === "completed");
    }

    if (normalizedSearch) {
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(normalizedSearch) ||
          row.email.toLowerCase().includes(normalizedSearch)
      );
    }

    rows.sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "progress_desc") return b.progress - a.progress;
      if (sortBy === "progress_asc") return a.progress - b.progress;

      return (
        new Date(b.lastActive ?? 0).getTime() -
        new Date(a.lastActive ?? 0).getTime()
      );
    });

    return rows;
  }, [activeTab, deferredSearch, sortBy, studentRows]);

  const kpiCards: {
    id: string;
    title: string;
    value: string;
    subtitle: string;
    icon: IconType;
    color: "emerald" | "violet" | "blue" | "amber" | "rose";
  }[] = [
    {
      id: "revenue",
      title: "Total Revenue",
      value: isCourseInsightsLoading
        ? "..."
        : currencyFormatter.format(totalRevenue),
      subtitle: "Course earnings",
      icon: FaMoneyBillWave,
      color: "emerald",
    },
    {
      id: "enrollments",
      title: "Total Enrollments",
      value: isEnrollmentsLoading ? "..." : String(totalEnrollments),
      subtitle: "Students enrolled",
      icon: FaUserGraduate,
      color: "violet",
    },
    {
      id: "completion-rate",
      title: "Completion Rate",
      value: isCourseInsightsLoading ? "..." : `${completionRate}%`,
      subtitle: "Reached 100% progress",
      icon: TbChartDonutFilled,
      color: "blue",
    },
    {
      id: "average-progress",
      title: "Average Progress",
      value: isCourseInsightsLoading ? "..." : `${averageProgress}%`,
      subtitle: "Across all students",
      icon: PiLadderSimpleBold,
      color: "rose",
    },
  ];

  if (isEnrollmentsError) {
    return (
      <div className="space-y-8">
        <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Course Analytics
          </h2>
          <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
            Get a complete view of course performance and learner progress.
          </p>
        </div>

        <div className="rounded-sm border border-neutral-200 bg-background p-6">
          <p className="text-base font-medium text-foreground">
            Unable to load reports
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {enrollmentsError?.message ?? "Please try again."}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <h2 className="text-3xl font-semibold font-literata tracking-wide">
          Course Analytics
        </h2>
        <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
          Get a complete view of course performance and learner progress.
        </p>
        {isCourseInsightsError ? (
          <p className="mt-2 text-sm text-amber-700">
            Course summary metrics are unavailable right now.
            {courseInsightsError?.message
              ? ` (${courseInsightsError.message})`
              : null}
          </p>
        ) : null}
      </div>

      <section className="grid gap-5 pb-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ id, title, value, subtitle, icon, color }) => (
          <KpiCard
            key={id}
            title={title}
            value={value}
            subtitle={subtitle}
            icon={icon}
            color={color}
          />
        ))}
      </section>

      <section className="w-full rounded-sm border border-neutral-200 bg-background overflow-hidden">
        <div className="flex flex-col bg-muted/50 gap-4 border-b border-neutral-200 px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-fit items-center rounded-sm border border-sidebar/30 bg-muted-foreground/10">
              <FilterTabButton
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
                label="All"
              />
              <FilterTabButton
                active={activeTab === "in_progress"}
                onClick={() => setActiveTab("in_progress")}
                label="In Progress"
              />
              <FilterTabButton
                active={activeTab === "completed"}
                onClick={() => setActiveTab("completed")}
                label="Completed"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64 lg:w-80">
                <IoSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/60" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search students..."
                  className="h-10 rounded-sm border-sidebar/30 bg-white pl-9 shadow-none placeholder:text-foreground/60"
                />
                {isEnrollmentsFetching && !isEnrollmentsLoading ? (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-foreground/60" />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {isEnrollmentsLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading report data...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="w-full bg-background py-16 px-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted-foreground/20 p-5 mb-5">
                <FaUserGraduate className="h-12 w-12 text-foreground/60" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                No students found
              </h3>
              <p className="text-lg text-foreground/70 max-w-sm">
                {searchTerm
                  ? `No students match "${searchTerm}".`
                  : "Students will appear here once they enroll in this course."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block w-full overflow-x-auto">
              <Table className="w-full min-w-[980px] table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[13%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <TableHeader className="bg-muted-foreground/15">
                  <TableRow className="border-b border-neutral-200 bg-muted/30">
                    <TableHead className="pl-5 text-left text-foreground/90 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        Student
                        <BiSortAlt2
                          onClick={() => setSortBy("name_asc")}
                          className="size-4.5 cursor-pointer text-foreground/50"
                        />
                      </span>
                    </TableHead>
                    <TableHead className="text-left text-foreground/90 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        Progress
                        <BiSortAlt2
                          onClick={() =>
                            setSortBy((current) =>
                              current === "progress_desc"
                                ? "progress_asc"
                                : "progress_desc"
                            )
                          }
                          className="size-4.5 cursor-pointer text-foreground/50"
                        />
                      </span>
                    </TableHead>
                    <TableHead className="text-center text-foreground/90 font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-center text-foreground/90 font-semibold">
                      Certificates
                    </TableHead>
                    <TableHead className="pr-5 text-center text-foreground/90 font-semibold">
                      View
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((student) => {
                    const statusMeta = getStatusMeta(student.status);
                    const certificateMeta = getCertificateMeta(
                      student.certificateStatus
                    );
                    const CertificateIcon = certificateMeta.icon;

                    return (
                      <TableRow
                        key={student.id}
                        className="border-b py-1 border-neutral-200"
                      >
                        <TableCell className="pl-5 text-left">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-xs font-semibold text-cyan-800 bg-muted">
                              {getInitials(student.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {student.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-left">
                          <div className="w-full pr-8 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-normal text-xs text-foreground/70">
                                {getStageLabel(student.progress)}
                              </span>
                              <span className="font-medium text-foreground/90">
                                {student.progress}%
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted-foreground/20">
                              <div
                                className="h-full rounded-full bg-accent/65 transition-all"
                                style={{ width: `${student.progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                              statusMeta.className
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusMeta.label}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-semibold",
                              certificateMeta.className
                            )}
                          >
                            <CertificateIcon className="size-4" />
                            {certificateMeta.label}
                          </span>
                        </TableCell>

                        <TableCell className="pr-5 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title={`Last active: ${formatLastActive(
                              student.lastActive
                            )}`}
                            className="h-8 rounded-sm cursor-pointer"
                          >
                            <Eye className="size-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-neutral-200">
              {filteredRows.map((student) => {
                const statusMeta = getStatusMeta(student.status);
                const certificateMeta = getCertificateMeta(
                  student.certificateStatus
                );
                const CertificateIcon = certificateMeta.icon;

                return (
                  <div key={student.id} className="space-y-3 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-muted/35 text-xs font-semibold text-foreground/80">
                          {getInitials(student.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {student.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        title={`Last active: ${formatLastActive(
                          student.lastActive
                        )}`}
                        className="h-8 rounded-sm cursor-pointer"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-xs text-foreground/70">
                          {getStageLabel(student.progress)}
                        </span>
                        <span className="font-medium text-foreground/90">
                          {student.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted-foreground/20">
                        <div
                          className="h-full rounded-full bg-accent/65"
                          style={{ width: `${student.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between mt-2 items-center gap-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                          statusMeta.className
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {statusMeta.label}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold",
                          certificateMeta.className
                        )}
                      >
                        <CertificateIcon className="size-4" />
                        {certificateMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function FilterTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
        active
          ? "bg-white border border-muted-foreground/30 rounded-sm font-semibold text-foreground"
          : "text-foreground/60 bg-gray-100 border-l rounded-sm border-neutral-300 hover:bg-muted/50"
      )}
    >
      {label}
    </button>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: IconType;
  color: "emerald" | "violet" | "blue" | "amber" | "rose";
}) {
  const colorClasses = {
    emerald: "bg-[#87d932]/25 text-[#87d932]",
    violet: "bg-[#ad90fe]/25 text-[#ad90fe]",
    blue: "bg-[#0bdbf0]/25 text-[#0bdbf0]",
    amber: "bg-[#fbbf24]/25 text-[#f59e0b]",
    rose: "bg-[#fb7185]/20 text-[#f43f5e]",
  };

  return (
    <Card className="h-full rounded-sm border border-muted-foreground/30 shadow-sm shadow-muted-foreground/10 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex h-full">
          <div
            className={cn(
              "flex items-center justify-center p-4",
              colorClasses[color]
            )}
          >
            <Icon className="size-7" />
          </div>
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-foreground/75 tracking-wide">
                {title}
              </p>
              {/* <p className="text-xs text-foreground/60 mt-1">{subtitle}</p> */}
            </div>
            <p className="text-2xl font-semibold text-foreground/90 font-noto mt-4">
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
