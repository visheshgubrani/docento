"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Eye,
  Loader2,
  Plus,
  TrendingUp,
} from "lucide-react";
import { FaUserGraduate } from "react-icons/fa6";
import { FaMoneyBillWave } from "react-icons/fa";
import { ImBooks } from "react-icons/im";
import { MdAdminPanelSettings, MdFilterAlt } from "react-icons/md";
import { PiBookOpenUserFill, PiLadderSimpleBold } from "react-icons/pi";
import { TbChartDonutFilled } from "react-icons/tb";
import { AiOutlineTransaction } from "react-icons/ai";
import type { IconType } from "react-icons";
import { HiUsers } from "react-icons/hi2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  useProjectAnalyticsEngagement,
  useProjectAnalyticsOverview,
  useProjectAnalyticsRecentSales,
  useProjectAnalyticsStudents,
} from "@/lib/hooks/use-analytics";
import { useProjectCourses } from "@/lib/hooks/use-courses";
import { useProjectRouteId } from "@/lib/hooks/use-project-route-id";
import { useProject } from "@/lib/hooks/use-projects";
import { useProtectedSession } from "@/components/auth/protected-route";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const formatNumber = (value?: number | null) =>
  new Intl.NumberFormat("en-IN").format(value ?? 0);

const formatCurrency = (amount?: number | null, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatPercent = (value?: number | null) => `${Math.round(value ?? 0)}%`;

const formatShortDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatChartDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
};

type SalesTrendPoint = {
  dateKey: string;
  label: string;
  amount: number;
};

const salesChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#ad90fe",
  },
} satisfies ChartConfig;

// Copied state for copy buttons
function CopyButton({
  value,
  label,
  toast,
}: {
  value: string;
  label: string;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-slate-400 hover:text-white transition-colors"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export default function ProjectOverviewPage() {
  const projectId = useProjectRouteId();
  const session = useProtectedSession();
  const { toast } = useToast();
  const {
    data: project,
    isLoading: isProjectLoading,
    isError,
    error,
  } = useProject(projectId);
  const { data: courses, isLoading: isCoursesLoading } =
    useProjectCourses(projectId);

  const { data: overview, isLoading: isOverviewLoading } =
    useProjectAnalyticsOverview(projectId);
  const {
    data: engagement,
    isLoading: isEngagementLoading,
    isFetching: isEngagementFetching,
  } = useProjectAnalyticsEngagement(projectId);
  const {
    data: transactions = [],
    isLoading: isSalesLoading,
    isFetching: isSalesFetching,
  } = useProjectAnalyticsRecentSales(projectId);
  const {
    data: students = [],
    isLoading: isStudentsLoading,
    isFetching: isStudentsFetching,
  } = useProjectAnalyticsStudents(projectId);

  const revenueBreakdown = overview?.revenueByCurrency ?? [];
  const primaryCurrency = revenueBreakdown[0]?.currency ?? "INR";
  const [salesFilterDate, setSalesFilterDate] = useState("");
  const recentTransactions = useMemo(
    () => transactions.slice(0, 4),
    [transactions]
  );

  const courseLeaderboard = useMemo(() => {
    const map = new Map<
      string,
      {
        courseId: string;
        title: string;
        enrollments: number;
        progressSum: number;
        completions: number;
      }
    >();

    students.forEach((student) => {
      student.enrollments.forEach((enrollment) => {
        const existing = map.get(enrollment.courseId) ?? {
          courseId: enrollment.courseId,
          title: enrollment.courseTitle,
          enrollments: 0,
          progressSum: 0,
          completions: 0,
        };
        existing.enrollments += 1;
        existing.progressSum += enrollment.progress ?? 0;
        if ((enrollment.progress ?? 0) >= 100) {
          existing.completions += 1;
        }
        map.set(enrollment.courseId, existing);
      });
    });

    return Array.from(map.values())
      .map((course) => ({
        ...course,
        averageProgress:
          course.enrollments > 0
            ? Math.round(course.progressSum / course.enrollments)
            : 0,
        completionRate:
          course.enrollments > 0
            ? Math.round((course.completions / course.enrollments) * 100)
            : 0,
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 10);
  }, [students]);

  const firstTransactionDate = useMemo(() => {
    if (transactions.length === 0) {
      return undefined;
    }

    let minTimestamp = Number.POSITIVE_INFINITY;
    transactions.forEach((tx) => {
      const timestamp = new Date(tx.createdAt).getTime();
      if (!Number.isNaN(timestamp) && timestamp < minTimestamp) {
        minTimestamp = timestamp;
      }
    });

    if (!Number.isFinite(minTimestamp)) {
      return undefined;
    }

    return new Date(minTimestamp);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!salesFilterDate) {
      return transactions;
    }

    const selectedEndDate = new Date(`${salesFilterDate}T23:59:59.999`);
    if (Number.isNaN(selectedEndDate.getTime())) {
      return transactions;
    }

    return transactions.filter(
      (tx) => new Date(tx.createdAt).getTime() <= selectedEndDate.getTime()
    );
  }, [transactions, salesFilterDate]);

  const courseRevenueById = useMemo(() => {
    const map = new Map<string, { amount: number; currency: string }>();

    transactions.forEach((tx) => {
      if ((tx.status ?? "").toLowerCase() !== "completed" || !tx.course?.id) {
        return;
      }

      const existing = map.get(tx.course.id) ?? {
        amount: 0,
        currency: tx.currency ?? primaryCurrency,
      };
      existing.amount += tx.amount ?? 0;
      map.set(tx.course.id, existing);
    });

    return map;
  }, [transactions, primaryCurrency]);

  const leaderboardRows = useMemo(() => {
    const withEnrollments = courseLeaderboard.map((course) => {
      const revenue = courseRevenueById.get(course.courseId);
      return {
        courseId: course.courseId,
        title: course.title,
        enrollments: course.enrollments,
        amount: revenue?.amount ?? 0,
        currency: revenue?.currency ?? primaryCurrency,
      };
    });

    if (withEnrollments.length > 0) {
      return withEnrollments
        .sort((a, b) => {
          if (b.amount !== a.amount) {
            return b.amount - a.amount;
          }

          if (b.enrollments !== a.enrollments) {
            return b.enrollments - a.enrollments;
          }

          return a.title.localeCompare(b.title);
        })
        .slice(0, 10);
    }

    return (courses ?? [])
      .map((course) => {
        const revenue = courseRevenueById.get(course.id);
        return {
          courseId: course.id,
          title: course.title,
          enrollments: 0,
          amount: revenue?.amount ?? 0,
          currency: revenue?.currency ?? primaryCurrency,
        };
      })
      .sort((a, b) => {
        if (b.amount !== a.amount) {
          return b.amount - a.amount;
        }

        if (b.enrollments !== a.enrollments) {
          return b.enrollments - a.enrollments;
        }

        return a.title.localeCompare(b.title);
      })
      .slice(0, 10);
  }, [courseLeaderboard, courseRevenueById, courses, primaryCurrency]);

  const salesTrendPoints = useMemo<SalesTrendPoint[]>(() => {
    const revenueByDay = new Map<string, number>();
    const completedTransactions = filteredTransactions
      .filter((tx) => (tx.status ?? "").toLowerCase() === "completed")
      .map((tx) => ({
        ...tx,
        createdAtDate: new Date(tx.createdAt),
      }))
      .filter((tx) => !Number.isNaN(tx.createdAtDate.getTime()))
      .sort((a, b) => a.createdAtDate.getTime() - b.createdAtDate.getTime());

    if (completedTransactions.length === 0) {
      return [];
    }

    completedTransactions.forEach((tx) => {
      const dateKey = toDateKey(tx.createdAtDate);
      revenueByDay.set(dateKey, (revenueByDay.get(dateKey) ?? 0) + tx.amount);
    });

    const lastCompletedDate = startOfDay(
      completedTransactions[completedTransactions.length - 1].createdAtDate
    );
    const selectedEndDate = salesFilterDate
      ? startOfDay(new Date(`${salesFilterDate}T00:00:00`))
      : lastCompletedDate;
    const rangeEnd =
      Number.isNaN(selectedEndDate.getTime()) ||
      selectedEndDate < lastCompletedDate
        ? lastCompletedDate
        : selectedEndDate;
    const firstCompletedDate = startOfDay(
      completedTransactions[0].createdAtDate
    );
    const minimumRangeStart = addDays(rangeEnd, -6);
    const rangeStart =
      firstCompletedDate < minimumRangeStart
        ? firstCompletedDate
        : minimumRangeStart;

    const points: SalesTrendPoint[] = [];

    for (
      let cursor = new Date(rangeStart);
      cursor <= rangeEnd;
      cursor = addDays(cursor, 1)
    ) {
      const dateKey = toDateKey(cursor);
      points.push({
        dateKey,
        label: formatChartDate(dateKey),
        amount: revenueByDay.get(dateKey) ?? 0,
      });
    }

    return points;
  }, [filteredTransactions, salesFilterDate]);

  const completedSalesCount = useMemo(
    () =>
      filteredTransactions.filter(
        (tx) => (tx.status ?? "").toLowerCase() === "completed"
      ).length,
    [filteredTransactions]
  );

  const completedSalesRevenue = useMemo(
    () =>
      filteredTransactions.reduce((total, tx) => {
        if ((tx.status ?? "").toLowerCase() !== "completed") {
          return total;
        }

        return total + (tx.amount ?? 0);
      }, 0),
    [filteredTransactions]
  );

  const salesTrendDelta = useMemo(() => {
    if (salesTrendPoints.length === 0) {
      return 0;
    }

    const first = salesTrendPoints[0]?.amount ?? 0;
    const last = salesTrendPoints[salesTrendPoints.length - 1]?.amount ?? 0;

    if (first === 0) {
      return last > 0 ? 100 : 0;
    }

    return ((last - first) / first) * 100;
  }, [salesTrendPoints]);

  const isSalesTrendUp = salesTrendDelta >= 0;

  if (!projectId) {
    return <div>Invalid project.</div>;
  }

  if (isProjectLoading) {
    return <OverviewSkeleton />;
  }

  if (isError || !project) {
    return <div>Error: {error?.message ?? "Unable to load project."}</div>;
  }

  const userName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "there";
  const lessonCompletionValue = Math.max(
    0,
    Math.min(100, Math.round(overview?.averageProgress ?? 0))
  );

  return (
    <div className="space-y-6 w-full">
      {/* Hero Section - School Details Only */}
      <section className="relative overflow-hidden rounded-sm border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-xl">
        <div className="absolute left-[-20%] top-[-30%] h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute right-[-18%] top-[-10%] h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/3 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-violet-200/80">
                Live LMS Analytics
              </p>
              <p className="text-lg text-white/90">
                Hi, <span className="font-semibold text-white">{userName}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 text-white">
                <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                  {project.name}
                </h1>
                <Badge className="bg-accent/20 text-white hover:bg-accent/30 border-accent/40">
                  {project.authMode.toLowerCase()} auth
                </Badge>
              </div>
              <p className="text-sm text-slate-300/80">
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded">
                  {project.slug}
                </span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/40">
                  <MdAdminPanelSettings className="mr-1 size-5" />
                  Admin view
                </Badge>
                <Button
                  asChild
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20 border-white/10"
                >
                  <Link href={`/p/${projectId}/courses`} className="gap-2">
                    Manage courses
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              {/* Developer Config */}
              <div className="flex flex-col gap-1.5 text-xs mt-2">
                <div className="flex items-center gap-2 bg-white/5 rounded px-2.5 py-1.5">
                  <span className="text-slate-400 min-w-[70px]">
                    Project ID
                  </span>
                  <code className="font-mono text-white/80 flex-1 truncate">
                    {projectId}
                  </code>
                  <CopyButton
                    value={projectId}
                    label="Project ID"
                    toast={toast}
                  />
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded px-2.5 py-1.5">
                  <span className="text-slate-400 min-w-[70px]">API Base</span>
                  <code className="font-mono text-white/80 flex-1 truncate">
                    {API_BASE_URL}
                  </code>
                  <CopyButton
                    value={API_BASE_URL}
                    label="API Endpoint"
                    toast={toast}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Revenue"
          value={
            isOverviewLoading
              ? "—"
              : formatCurrency(overview?.totalRevenue, primaryCurrency)
          }
          icon={FaMoneyBillWave}
          color="emerald"
        />

        <MetricCard
          title="Enrollments"
          value={
            isOverviewLoading
              ? "—"
              : formatNumber(overview?.totalEnrollments ?? 0)
          }
          icon={FaUserGraduate}
          color="violet"
        />

        <MetricCard
          title="Total Courses"
          value={isCoursesLoading ? "—" : formatNumber(courses?.length ?? 0)}
          icon={ImBooks}
          color="blue"
        />

        <MetricCard
          title="Active"
          value={
            isEngagementLoading
              ? "—"
              : formatNumber(engagement?.activeStudents7d ?? 0)
          }
          icon={PiBookOpenUserFill}
          color="amber"
        />

        <MetricCard
          title="Registered"
          value={
            isOverviewLoading ? "—" : formatNumber(overview?.totalStudents ?? 0)
          }
          icon={HiUsers}
          color="violet"
        />
      </section>

      {/* Sales Overview & Lesson Completion */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-sm h-[480px] flex flex-col overflow-hidden">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 font-noto text-lg font-[550] text-foreground/90">
                <BarChart3 className="size-6 text-[#ad90fe]" />
                Sales Overview
              </CardTitle>
              <CardDescription className="mt-1.5 text-foreground/60">
                Revenue trend over time
              </CardDescription>
            </div>
            <div className="w-full sm:w-auto shrink-0 flex items-center justify-end gap-2">
              {salesFilterDate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSalesFilterDate("")}
                  className="h-9 shrink-0 gap-1.5 rounded-sm text-foreground/85"
                >
                  <MdFilterAlt className="size-4 text-foreground/80" />
                  Clear filter
                </Button>
              ) : null}
              <div className="w-full sm:w-[220px]">
                <DatePickerInput
                  id="sales-overview-filter-date"
                  value={salesFilterDate}
                  onChange={setSalesFilterDate}
                  placeholder="Filter up to date"
                  fromDate={firstTransactionDate}
                  toDate={new Date()}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-1 flex-1 min-h-0">
            <SalesOverviewChart
              points={salesTrendPoints}
              currency={primaryCurrency}
              isLoading={isSalesLoading || isSalesFetching}
            />
          </CardContent>
          <CardFooter className="flex-col items-start gap-1.5 pt-2 pb-3 text-sm">
            <div className="flex items-center gap-2 leading-none font-medium">
              {isSalesTrendUp ? "Trending up" : "Trending down"} by{" "}
              {Math.round(Math.abs(salesTrendDelta))}%
              <TrendingUp
                className={cn("h-4 w-4", isSalesTrendUp ? "" : "rotate-180")}
              />
            </div>
            <div className="leading-normal text-foreground/70">
              {formatCurrency(completedSalesRevenue, primaryCurrency)} from{" "}
              {formatNumber(completedSalesCount)} completed transactions in the
              selected range
            </div>
          </CardFooter>
        </Card>

        <Card className="rounded-sm w-full h-[480px] flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row w-full items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-noto text-lg font-[550] text-foreground/90">
                <TbChartDonutFilled className="size-6 text-[#87d932]" />
                Lesson Completion
              </CardTitle>
              <CardDescription className="mt-1.5 text-foreground/60">
                Overall completion and engagement metrics
              </CardDescription>
            </div>
            {(isEngagementLoading || isEngagementFetching) && (
              <Loader2 className="size-5 animate-spin text-foreground/60" />
            )}
          </CardHeader>
          <CardContent className="space-y-1 pt-0 flex-1">
            <div className="flex justify-center">
              <div
                className="relative mx-auto  flex aspect-square w-full max-w-[200px] items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#73aa44f4 ${lessonCompletionValue}%, rgba(148, 163, 184, 0.18) 0)`,
                }}
              >
                <div className="absolute inset-[14px] rounded-full border border-border/40 bg-background" />
                <div className="relative flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-foreground/80">
                    {isOverviewLoading
                      ? "—"
                      : formatPercent(lessonCompletionValue)}
                  </span>
                  <span className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Complete
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-4">
              <div className="flex items-center justify-between rounded-sm border border-dashed border-muted/70 px-3 py-1.5">
                <span className="text-sm text-foreground/80">
                  Lessons Completed (7d)
                </span>
                <span className="text-base font-noto font-semibold">
                  {formatNumber(engagement?.lessonsCompleted7d ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-dashed border-muted/70 px-3 py-1.5">
                <span className="text-sm text-foreground/80">
                  Active Courses
                </span>
                <span className="text-base font-noto font-semibold">
                  {formatNumber(overview?.activeCourses ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-sm border border-dashed border-muted/70 px-3 py-1.5">
                <span className="text-sm text-foreground/80">
                  Completion Rate
                </span>
                <span className="text-base font-noto font-semibold text-lime-700">
                  {formatPercent(
                    engagement?.averageProgress ??
                      overview?.averageProgress ??
                      0
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Course Leaderboard & Recent Transactions */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-sm h-[450px] flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 font-noto text-lg font-[550] text-foreground/90">
                <PiLadderSimpleBold className="size-6 text-cyan-600" />
                Course Leaderboard
              </CardTitle>
              <CardDescription className="mt-1.5 text-foreground/60">
                Top performing courses by enrollments and revenue
              </CardDescription>
            </div>
            {(isStudentsLoading || isStudentsFetching) && (
              <span className="flex items-center gap-2 text-sm font-normal text-foreground/70 shrink-0">
                <Loader2 className="size-4 animate-spin" />
                Updating
              </span>
            )}
          </CardHeader>
          <CardContent className="px-4 pt-3 pb-3 flex-1 min-h-0">
            {isCoursesLoading ? (
              <div className="h-full rounded-sm overflow-hidden border border-neutral-200 flex flex-col">
                <div className="px-4 py-3 border-b bg-muted/40 grid grid-cols-[1.7fr_0.7fr_0.8fr_0.6fr] gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-3 bg-muted rounded animate-pulse"
                    />
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-course pb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="px-4 py-3 border-b border-neutral-100 grid grid-cols-[1.7fr_0.7fr_0.8fr_0.6fr] gap-3 animate-pulse"
                    >
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : leaderboardRows.length === 0 ? (
              <div className="h-full rounded-sm md:overflow-hidden border border-neutral-200 flex flex-col">
                <Table className="md:table-fixed">
                  <TableHeader>
                    <TableRow className="border-b border-neutral-200 bg-muted/35">
                      <TableHead className="px-4 text-foreground/80">
                        Course Name
                      </TableHead>
                      <TableHead className="px-4 text-foreground/80">
                        Students
                      </TableHead>
                      <TableHead className="px-4 text-foreground/80">
                        Amount
                      </TableHead>
                      <TableHead className="px-4 text-right text-foreground/80">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-[280px] w-full mx-auto px-4 text-center whitespace-normal break-words"
                      >
                        <div className="flex flex-col items-center justify-center w-full mx-auto gap-2.5">
                          <Image
                            src="/images/icons/create-course.svg"
                            alt="Create course"
                            width={80}
                            height={80}
                            className="size-22 opacity-90"
                          />
                          <p className="text-base font-semibold text-foreground">
                            No courses available yet
                          </p>
                          <p className="max-w-[18rem] mx-auto text-center -mt-1 text-xs text-foreground/70 whitespace-normal break-words">
                            Create your first course to start populating
                            leaderboard insights.
                          </p>
                          <Button
                            asChild
                            className="gap-1.5 mt-2 rounded-sm py-3 px-4 bg-sidebar/90"
                          >
                            <Link href={`/p/${projectId}/courses`}>
                              <Plus className="h-3.5 w-3.5" />
                              Create Course
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-full rounded-sm overflow-hidden border border-neutral-200 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-course">
                  <Table className="table-fixed">
                    <colgroup>
                      <col className="md:w-[40%]" />
                      <col className="md:w-[20%]" />
                      <col className="md:w-[20%]" />
                      <col className="md:w-[20%]" />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-10 bg-muted/35">
                      <TableRow className="border-b border-neutral-200 bg-muted/35">
                        <TableHead className="px-4 py-3 text-left text-foreground/80">
                          Course Name
                        </TableHead>
                        <TableHead className="px-8 py-3 text-right text-foreground/80">
                          Students
                        </TableHead>
                        <TableHead className="px-8 py-3 text-right text-foreground/80">
                          Amount
                        </TableHead>
                        <TableHead className="px-4 py-3 text-right text-foreground/80">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboardRows.map((course, index) => (
                        <TableRow
                          key={course.courseId}
                          className="border-b border-neutral-100 font-medium"
                        >
                          <TableCell className="px-4 py-3 align-middle">
                            <span
                              className={cn(
                                "block truncate",
                                index < 3 && "text-cyan-700"
                              )}
                            >
                              {course.title}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center align-middle">
                            {formatNumber(course.enrollments)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center align-middle">
                            {formatCurrency(course.amount, course.currency)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right align-middle">
                            <div className="flex justify-end">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 hover:text-lime-800 rounded-sm"
                              >
                                <Link
                                  href={`/p/${projectId}/courses/${course.courseId}`}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sm h-[450px] flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 font-noto text-lg font-[550] text-foreground/90">
                <AiOutlineTransaction className="size-6.5 text-[#fe91c6]" />
                Recent Transactions
              </CardTitle>
              <CardDescription className="mt-1.5 text-foreground/60">
                Latest learner purchases
              </CardDescription>
            </div>
            {(isSalesLoading || isSalesFetching) && (
              <span className="flex items-center gap-2 text-sm text-foreground/70 shrink-0">
                <Loader2 className="size-4 animate-spin" />
                Syncing
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-2 pt-2 pb-4 flex-1">
            {recentTransactions.length === 0 ? (
              <div className="h-full rounded-sm border border-dashed border-neutral-300 flex items-center justify-center text-center px-4">
                <div className="flex flex-col items-center gap-2">
                  <AiOutlineTransaction className="size-9 text-muted-foreground" />
                  <p className="text-base font-semibold text-foreground">
                    No transactions yet
                  </p>
                  <p className="text-xs text-foreground/70 max-w-[220px]">
                    Purchases from learners will appear here once payments start
                    coming in.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto scrollbar-thin space-y-3.5 pr-1">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-sm border border-neutral-300/80 bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full bg-pink-300/80 animate-pulse" />
                          <p className="min-w-0 text-sm font-semibold truncate">
                            {tx.student?.name ??
                              tx.student?.externalId ??
                              tx.student?.email ??
                              "Unknown student"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-foreground/60 truncate">
                          {tx.course?.title ?? "Unknown course"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm text-lime-800 font-semibold">
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>
                        <p className="mt-0.5 text-xs text-foreground/60">
                          {formatShortDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color = "violet",
}: {
  title: string;
  value: string;
  icon: LucideIcon | IconType;
  color?: "emerald" | "violet" | "blue" | "amber";
}) {
  const colorClasses = {
    emerald: "bg-[#87d932]/25 text-[#87d932]",
    violet: "bg-[#ad90fe]/25 text-[#ad90fe]",
    blue: "bg-[#0bdbf0]/20 text-[#0bdbf0]",
    amber: "bg-[#fe91c6]/25 text-[#fe91c6]",
  };

  return (
    <Card className="h-full min-h-[80px] rounded-sm border border-muted-foreground/35 shadow-md shadow-muted-foreground/15 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex h-full">
          {/* Icon Box */}
          <div
            className={cn(
              "flex items-center justify-center p-3",
              colorClasses[color]
            )}
          >
            <Icon className="size-6" />
          </div>
          {/* Content */}
          <div className="flex-1 p-3 flex flex-col justify-between">
            <div>
              <p className="text-[13px] font-[500] text-foreground/80 tracking-wide">
                {title}
              </p>
            </div>
            <div className="flex items-end h-full mt-4">
              <p className="text-2xl md:text-3xl font-semibold text-foreground/90 font-noto leading-none">
                {value}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SalesOverviewChart({
  points,
  currency,
  isLoading,
}: {
  points: SalesTrendPoint[];
  currency: string;
  isLoading: boolean;
}) {
  const hasData = points.length > 0;

  const displayPoints = useMemo<SalesTrendPoint[]>(() => {
    if (hasData) {
      return points;
    }

    const now = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const dateKey = toDateKey(date);
      return {
        dateKey,
        label: formatChartDate(dateKey),
        amount: 0,
      };
    });
  }, [hasData, points]);

  const chartData = useMemo(
    () =>
      displayPoints.map((point) => ({
        date: point.label,
        revenue: Number(point.amount.toFixed(2)),
      })),
    [displayPoints]
  );

  if (isLoading) {
    return (
      <div className="h-full rounded-sm border border-dashed border-neutral-200 flex items-center justify-center">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading sales trend
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ChartContainer
        config={salesChartConfig}
        className="h-full w-full aspect-auto rounded-sm border border-border/60 bg-background p-2.5"
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 6,
            right: 10,
            top: 20,
            bottom: 4,
          }}
        >
          <CartesianGrid stroke="#eceef2" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
            tickMargin={8}
            tick={{
              fill: "hsl(var(--foreground))",
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "hsl(var(--foreground))",
              fontSize: 11,
              fontWeight: 600,
            }}
            tickFormatter={(value: number) => formatCompactNumber(value)}
            width={44}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value) => formatCurrency(Number(value), currency)}
              />
            }
          />
          <Line
            dataKey="revenue"
            type="natural"
            stroke="var(--color-revenue)"
            strokeWidth={2.5}
            dot={{
              fill: "var(--color-revenue)",
              r: hasData ? 4 : 3,
            }}
            activeDot={{
              r: 6,
            }}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden rounded-sm border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-xl">
        <div className="absolute left-[-20%] top-[-30%] h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute right-[-18%] top-[-10%] h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/3 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-3 w-32 bg-white/10 rounded" />
              <div className="h-5 w-40 bg-white/15 rounded" />
              <div className="flex items-center gap-3">
                <div className="h-8 w-48 bg-white/20 rounded" />
                <div className="h-6 w-24 bg-white/10 rounded-full" />
              </div>
              <div className="h-4 w-28 bg-white/10 rounded" />
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <div className="h-7 w-24 bg-white/10 rounded-full" />
                <div className="h-9 w-32 bg-white/15 rounded" />
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="h-7 w-64 bg-white/5 rounded" />
                <div className="h-7 w-72 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Grid Skeleton */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-full rounded-sm border border-muted-foreground/30 shadow-md shadow-muted-foreground/20 overflow-hidden"
          >
            <div className="flex h-full">
              <div className="flex items-center justify-center p-4 bg-muted/30">
                <div className="size-7 bg-muted rounded" />
              </div>
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted/60 rounded" />
                </div>
                <div className="flex items-end justify-between mt-3">
                  <div className="h-8 w-24 bg-muted rounded" />
                  <div className="h-5 w-12 bg-muted/60 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Course Leaderboard & Average Progress Skeleton */}
      <section className="grid gap-4 xl:grid-cols-3">
        {/* Leaderboard Card */}
        <div className="xl:col-span-2 rounded-sm border bg-card">
          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-6 bg-muted rounded" />
              <div className="h-5 w-40 bg-muted rounded" />
            </div>
            <div className="h-4 w-64 bg-muted/60 rounded" />
          </div>
          <div className="divide-y divide-muted/40">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted/60 rounded w-1/4" />
                  </div>
                  <div className="h-5 bg-muted rounded w-20" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 bg-muted rounded-full" />
                  <div className="h-3 bg-muted rounded w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Average Progress Card */}
        <div className="rounded-sm border bg-card w-full">
          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-6 bg-muted rounded" />
              <div className="h-5 w-36 bg-muted rounded" />
            </div>
            <div className="h-4 w-56 bg-muted/60 rounded" />
          </div>
          <div className="px-6 pb-6 space-y-3">
            <div className="flex justify-center py-2">
              <div className="relative size-38">
                <div className="size-full rounded-full border-8 border-muted/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-12 bg-muted rounded" />
                </div>
              </div>
            </div>
            <div className="space-y-0.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-sm border border-dashed border-muted/70 px-3 py-2"
                >
                  <div className="h-4 w-36 bg-muted/60 rounded" />
                  <div className="h-4 w-10 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Transactions & Students Skeleton */}
      <section className="grid gap-4 xl:grid-cols-3">
        {/* Transactions Card */}
        <div className="xl:col-span-2 rounded-sm border bg-card">
          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-6 bg-muted rounded" />
              <div className="h-5 w-44 bg-muted rounded" />
            </div>
            <div className="h-4 w-72 bg-muted/60 rounded" />
          </div>
          <div className="px-3 pb-6">
            <div className="rounded-sm overflow-hidden border border-muted/40">
              <div className="bg-muted/30 px-4 py-3 flex gap-4">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded ml-auto" />
              </div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="px-4 py-3 border-t border-muted/30 flex items-center gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted/50 rounded w-20" />
                  </div>
                  <div className="h-4 bg-muted rounded w-36" />
                  <div className="h-5 bg-muted rounded-full w-20" />
                  <div className="h-4 bg-muted rounded w-14 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Students Card */}
        <div className="rounded-sm border bg-card">
          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-5.5 bg-muted rounded" />
              <div className="h-5 w-40 bg-muted rounded" />
            </div>
            <div className="h-4 w-52 bg-muted/60 rounded" />
          </div>
          <div className="px-6 pb-6 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-sm border border-dashed border-muted/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted/50 rounded w-1/2" />
                  </div>
                  <div className="h-5 bg-muted rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
