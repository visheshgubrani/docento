"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { TbRosetteDiscountFilled } from "react-icons/tb";
import { BsStars } from "react-icons/bs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { IoIosSearch } from "react-icons/io";
import { useProjectRouteId } from "@/lib/hooks/use-project-route-id";
import { useProject } from "@/lib/hooks/use-projects";
import { useProjectCourses } from "@/lib/hooks/use-courses";
import {
  useCreateProjectCoupon,
  useProjectCoupons,
  useUpdateProjectCouponStatus,
} from "@/lib/hooks/use-coupons";
import type { ProjectCoupon, ProjectCouponStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

function generateRandomCode() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () =>
    charset.charAt(Math.floor(Math.random() * charset.length))
  ).join("");
}

function formatExpiryDate(value: string | null) {
  if (!value) return "No expiry";
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return "No expiry";
  }
}

function formatUsage(usageCount: number, usageLimit: number | null) {
  return `${usageCount}/${usageLimit ? usageLimit : "∞"}`;
}

function CouponsTableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((row) => (
        <TableRow key={row}>
          <TableCell className="pl-4">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-3 w-28 rounded bg-muted animate-pulse" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-6 w-28 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-3 w-14 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="pr-4">
            <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function CouponsFetchingRows({ rows = 2 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <TableRow key={`fetching-row-${row}`}>
          <TableCell className="pl-4">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
          </TableCell>
          <TableCell className="text-center">
            <div className="mx-auto h-6 w-24 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-center">
            <div className="mx-auto h-3 w-12 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-center">
            <div className="mx-auto h-3 w-20 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="pr-4">
            <div className="mx-auto h-8 w-28 rounded-full bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function CouponsMobileSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={`mobile-skeleton-${row}`}
          className="rounded-lg border border-neutral-200 bg-background p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-24 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CouponStatusToggle({
  coupon,
  isUpdating,
  onToggle,
}: {
  coupon: ProjectCoupon;
  isUpdating: boolean;
  onToggle: (coupon: ProjectCoupon) => void;
}) {
  const isActive = coupon.status === "ACTIVE";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1",
        isActive
          ? "border-lime-400 bg-lime-50/70"
          : "border-amber-400 bg-amber-50/70"
      )}
    >
      <span
        className={cn(
          "text-xs font-semibold",
          isActive ? "text-lime-800" : "text-amber-700"
        )}
      >
        {isActive ? "Active" : "Paused"}
      </span>
      {isUpdating ? (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          checked={isActive}
          onCheckedChange={() => onToggle(coupon)}
          className="cursor-pointer data-[state=checked]:bg-lime-600 data-[state=unchecked]:bg-amber-500 dark:data-[state=checked]:bg-lime-500 dark:data-[state=unchecked]:bg-amber-500"
          aria-label={`Toggle status for ${coupon.code}`}
        />
      )}
    </div>
  );
}

export default function ProjectCouponsPage() {
  const projectId = useProjectRouteId();
  const { data: project } = useProject(projectId);
  const { toast } = useToast();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [updatingCouponId, setUpdatingCouponId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT">(
    "PERCENTAGE"
  );
  const [discountValue, setDiscountValue] = useState("");
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: coupons = [],
    isLoading: isCouponsLoading,
    isFetching: isCouponsFetching,
    isError: isCouponsError,
    error: couponsError,
    refetch: refetchCoupons,
  } = useProjectCoupons(projectId);

  const { mutateAsync: createCouponMutation, isPending: isCreating } =
    useCreateProjectCoupon(projectId);

  const { mutateAsync: updateCouponStatusMutation } =
    useUpdateProjectCouponStatus(projectId);

  const { data: projectCourses } = useProjectCourses(projectId);

  const availableCourses = useMemo(() => {
    if (!projectCourses || projectCourses.length === 0) {
      return [];
    }

    return projectCourses.map((course) => ({
      id: course.id,
      title: course.title || "Untitled course",
    }));
  }, [projectCourses]);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = courseSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return availableCourses;
    return availableCourses.filter((course) =>
      course.title.toLowerCase().includes(normalizedSearch)
    );
  }, [availableCourses, courseSearchTerm]);

  const resetCreateForm = () => {
    setCouponCode("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("");
    setAppliesToAll(true);
    setSelectedCourseIds([]);
    setCourseSearchTerm("");
    setUsageLimit("");
    setExpiryDate("");
    setFormError(null);
  };

  const handleCreateDrawerChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      resetCreateForm();
    }
  };

  const handleGenerateCode = () => {
    setCouponCode(generateRandomCode());
  };

  const handleToggleCourse = (courseId: string, isChecked: boolean) => {
    setSelectedCourseIds((currentIds) => {
      if (isChecked) {
        return currentIds.includes(courseId)
          ? currentIds
          : [...currentIds, courseId];
      }
      return currentIds.filter((id) => id !== courseId);
    });
  };

  const handleCreateCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const normalizedCode = couponCode.trim().toUpperCase();
    const parsedDiscountValue = Number(discountValue);
    const parsedUsageLimit =
      usageLimit.trim() === "" ? null : Number(usageLimit);

    if (!normalizedCode) {
      setFormError("Coupon code is required.");
      return;
    }

    if (!Number.isFinite(parsedDiscountValue) || parsedDiscountValue <= 0) {
      setFormError("Discount value must be greater than 0.");
      return;
    }

    if (discountType === "PERCENTAGE" && parsedDiscountValue > 100) {
      setFormError("Percentage discount cannot be greater than 100.");
      return;
    }

    if (
      parsedUsageLimit !== null &&
      (!Number.isInteger(parsedUsageLimit) || parsedUsageLimit <= 0)
    ) {
      setFormError("Usage limit must be a positive integer.");
      return;
    }

    if (!appliesToAll && selectedCourseIds.length === 0) {
      setFormError("Select at least one course or choose All Courses.");
      return;
    }

    try {
      await createCouponMutation({
        code: normalizedCode,
        discountType,
        discountValue: parsedDiscountValue,
        appliesToAll,
        courseIds: appliesToAll ? [] : selectedCourseIds,
        usageLimit: parsedUsageLimit,
        expiresAt: expiryDate || null,
      });

      setCreateOpen(false);
      resetCreateForm();

      toast({
        title: "Coupon created",
        description: `${normalizedCode} is now ready to use at checkout.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create coupon.";
      setFormError(message);
    }
  };

  const handleToggleCouponStatus = async (coupon: ProjectCoupon) => {
    const nextStatus: ProjectCouponStatus =
      coupon.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

    setUpdatingCouponId(coupon.id);
    try {
      await updateCouponStatusMutation({
        couponId: coupon.id,
        status: nextStatus,
      });

      toast({
        title: nextStatus === "ACTIVE" ? "Coupon activated" : "Coupon paused",
        description:
          nextStatus === "ACTIVE"
            ? `${coupon.code} can now be used at checkout.`
            : `${coupon.code} is paused and won't apply at checkout.`,
      });
    } catch (error) {
      toast({
        title: "Unable to update coupon",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setUpdatingCouponId(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Coupons
          </h2>
          <p className="text-lg font-stix text-foreground/80 max-w-2xl tracking-wide">
            Run limited-time promotions for {project?.name ?? "this project"}.
            <br />
            Create, pause, and monitor coupon codes used during checkout.
          </p>
        </div>
        <Button
          className="bg-accent cursor-pointer hover:bg-accent/80 h-10 px-5 rounded-sm font-medium shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-5" />
          Create Coupon
        </Button>
      </div>

      {isCouponsLoading ? (
        <>
          <div className="md:hidden">
            <CouponsMobileSkeleton />
          </div>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-neutral-200 bg-background">
            <Table>
              <TableHeader className="bg-muted/90">
                <TableRow className="bg-muted/50 border-b border-neutral-200">
                  <TableHead className="text-foreground font-semibold pl-4">
                    Code
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center">
                    Discount Type
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center">
                    Usage
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center">
                    Expiry
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center pr-4">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <CouponsTableSkeleton />
              </TableBody>
            </Table>
          </div>
        </>
      ) : isCouponsError ? (
        <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-4">
          <p className="text-sm font-medium text-destructive">
            Unable to load coupons
          </p>
          <p className="text-sm text-destructive/85 mt-1">
            {couponsError?.message ?? "Please try again in a moment."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCoupons()}
            className="mt-3 rounded-xs"
          >
            Retry
          </Button>
        </div>
      ) : coupons.length === 0 ? (
        <div className="w-full rounded-sm border border-neutral-200 bg-background py-16 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-5 mb-5">
              <TbRosetteDiscountFilled className="size-13 text-foreground/70" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No coupons yet
            </h3>
            <p className="text-lg text-foreground/80 max-w-2xl mb-6">
              No active sales. Create a coupon to boost your course enrollments!
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2 rounded-sm cursor-pointer py-5"
            >
              <Plus className="size-5" />
              Create Your First Coupon
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="rounded-lg border border-neutral-200 bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-mono text-sm font-semibold tracking-wide text-foreground">
                      {coupon.code}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {coupon.appliesToAll
                        ? "All Courses"
                        : `${coupon.courseIds.length} specific course(s)`}
                    </p>
                  </div>
                  <CouponStatusToggle
                    coupon={coupon}
                    isUpdating={updatingCouponId === coupon.id}
                    onToggle={handleToggleCouponStatus}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                      Discount
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-xs bg-muted text-foreground border border-neutral-200"
                      >
                        {coupon.discountType === "PERCENTAGE" ? "%" : "Flat"}
                      </Badge>
                      <span className="font-medium text-foreground/90">
                        {coupon.discountType === "PERCENTAGE"
                          ? `${coupon.discountValue}%`
                          : `₹${coupon.discountValue}`}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                      Usage
                    </p>
                    <p className="font-medium text-foreground/90">
                      {formatUsage(coupon.usageCount, coupon.usageLimit)}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                      Expiry
                    </p>
                    <p className="font-medium text-foreground/90">
                      {formatExpiryDate(coupon.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isCouponsFetching ? <CouponsMobileSkeleton rows={2} /> : null}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-lg border border-neutral-300 bg-background">
            <Table>
              <TableHeader className="bg-muted/90">
                <TableRow className="bg-muted/50 border-b border-neutral-200">
                  <TableHead className="text-foreground font-semibold pl-4">
                    Code
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center">
                    Discount Type
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center">
                    Usage
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center">
                    Expiry
                  </TableHead>
                  <TableHead className="text-foreground font-semibold text-center pr-4">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow
                    key={coupon.id}
                    className="border-b border-neutral-200 hover:bg-muted/70"
                  >
                    <TableCell className="pl-4">
                      <div className="space-y-1">
                        <p className="font-mono text-sm font-semibold tracking-wide text-foreground">
                          {coupon.code}
                        </p>
                        <p className="text-xs text-foreground/60">
                          {coupon.appliesToAll
                            ? "All Courses"
                            : `${coupon.courseIds.length} specific course(s)`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-x-3">
                        <Badge
                          variant="secondary"
                          className="rounded-xs bg-muted text-foreground border border-neutral-200"
                        >
                          {coupon.discountType === "PERCENTAGE" ? "%" : "Flat"}
                        </Badge>
                        <span className="text-sm text-foreground/90">
                          {coupon.discountType === "PERCENTAGE"
                            ? `${coupon.discountValue}%`
                            : `₹${coupon.discountValue}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-center text-foreground/80">
                      {formatUsage(coupon.usageCount, coupon.usageLimit)}
                    </TableCell>
                    <TableCell className="font-medium text-center text-foreground/80">
                      {formatExpiryDate(coupon.expiresAt)}
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      <CouponStatusToggle
                        coupon={coupon}
                        isUpdating={updatingCouponId === coupon.id}
                        onToggle={handleToggleCouponStatus}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {isCouponsFetching ? <CouponsFetchingRows rows={2} /> : null}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Sheet open={isCreateOpen} onOpenChange={handleCreateDrawerChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl border-l border-neutral-200 bg-dashboard-bg p-0"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="space-y-1.5 border-b border-neutral-200 p-6 text-left">
              <SheetTitle className="text-2xl font-semibold font-literata">
                Create Coupon
              </SheetTitle>
              <SheetDescription className="text-sm text-foreground/85">
                Set up a new promotion code for your checkout flow.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleCreateCoupon}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-10 overflow-y-auto scrollbar-thin p-6">
                <div className="space-y-2">
                  <Label htmlFor="coupon-code" className="font-semibold">
                    Coupon Code
                  </Label>
                  <div className="flex gap-2 mt-2.5">
                    <Input
                      id="coupon-code"
                      placeholder="EARLYBIRD"
                      value={couponCode}
                      onChange={(event) =>
                        setCouponCode(
                          event.target.value.toUpperCase().replace(/\s+/g, "")
                        )
                      }
                      className=" bg-white rounded-xs shadow-none border border-muted-foreground/85 placeholder:text-foreground/60 h-11"
                      required
                    />
                    <Button
                      type="button"
                      variant="default"
                      className="h-11 gap-1.5 cursor-pointer bg-sidebar/70 rounded-xs px-4"
                      onClick={handleGenerateCode}
                    >
                      <BsStars className="size-4.5" />
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount-value" className="font-semibold">
                    Discount Value
                  </Label>
                  <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="discount-value"
                      type="number"
                      min="1"
                      max={discountType === "PERCENTAGE" ? "100" : undefined}
                      value={discountValue}
                      onChange={(event) => setDiscountValue(event.target.value)}
                      placeholder={discountType === "PERCENTAGE" ? "10" : "500"}
                      className=" bg-white rounded-xs shadow-none border border-muted-foreground/85 placeholder:text-foreground/60 h-11"
                      required
                    />
                    <div className="inline-flex h-11 border bg-background">
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "h-11 rounded-xs px-4",
                          discountType === "PERCENTAGE"
                            ? "bg-sidebar/70 text-white"
                            : "text-foreground/50 bg-muted  border-l border-y border-foreground/40"
                        )}
                        onClick={() => setDiscountType("PERCENTAGE")}
                      >
                        % Percentage
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "h-11 rounded-xs px-4",
                          discountType === "FLAT"
                            ? "bg-sidebar/70 text-white"
                            : "text-foreground/50 bg-muted border-r border-y border-foreground/40"
                        )}
                        onClick={() => setDiscountType("FLAT")}
                      >
                        ₹ Flat
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/80">
                    This will be deducted from the course price during checkout.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Applies To</Label>
                  <div className="mt-2.5 space-y-3 rounded-sm border border-neutral-200 p-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="all-courses"
                        checked={appliesToAll}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          setAppliesToAll(isChecked);
                          if (isChecked) {
                            setSelectedCourseIds([]);
                            setCourseSearchTerm("");
                          }
                        }}
                      />
                      <Label
                        htmlFor="all-courses"
                        className="cursor-pointer text-sm font-medium text-foreground"
                      >
                        All Courses
                      </Label>
                    </div>

                    {!appliesToAll ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <IoIosSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search courses..."
                            value={courseSearchTerm}
                            onChange={(event) =>
                              setCourseSearchTerm(event.target.value)
                            }
                            className="rounded-xs shadow-none border bg-white border-muted-foreground/50 h-10 pl-9"
                          />
                        </div>
                        <div className="max-h-44 space-y-2 overflow-y-auto rounded-sm border border-neutral-200 p-3">
                          {filteredCourses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {availableCourses.length === 0
                                ? "No courses available yet."
                                : "No courses match your search."}
                            </p>
                          ) : (
                            filteredCourses.map((course) => {
                              const isChecked = selectedCourseIds.includes(
                                course.id
                              );
                              return (
                                <div
                                  key={course.id}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    id={`course-${course.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      handleToggleCourse(
                                        course.id,
                                        checked === true
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`course-${course.id}`}
                                    className="cursor-pointer text-sm text-foreground/85"
                                  >
                                    {course.title}
                                  </Label>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="usage-limit" className="font-semibold">
                      Usage Limit
                    </Label>
                    <Input
                      id="usage-limit"
                      type="number"
                      min="1"
                      step="1"
                      value={usageLimit}
                      onChange={(event) => setUsageLimit(event.target.value)}
                      placeholder="Optional"
                      className="rounded-xs mt-2.5 bg-white shadow-none border border-muted-foreground/60 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry-date" className="font-semibold">
                      Expiry Date
                    </Label>
                    <DatePickerInput
                      id="expiry-date"
                      value={expiryDate}
                      onChange={setExpiryDate}
                      placeholder="Select expiry date"
                      className="mt-2.5"
                    />
                  </div>
                </div>

                {formError ? (
                  <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </p>
                ) : null}
              </div>

              <SheetFooter className="border-t border-neutral-200 p-6">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xs cursor-pointer hover:text-foreground"
                  onClick={() => handleCreateDrawerChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 rounded-xs cursor-pointer bg-accent/90 hover:bg-accent/80"
                >
                  {isCreating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Coupon"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
