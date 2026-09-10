import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiArrowRight, HiShoppingBag } from "react-icons/hi2";
import { getPurchaseHistoryData } from "@/actions/dashboard";

export const metadata: Metadata = {
  title: "Purchase History",
  description: "Review your course purchases and order details.",
};

function formatPaidAmount(amount: number, currency: string) {
  const majorAmount = amount / 100;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      currencyDisplay: "symbol",
    }).format(majorAmount);
  } catch {
    return `₹${majorAmount.toLocaleString("en-IN")}`;
  }
}

function formatOrderDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPaymentType(provider: string) {
  if (!provider) {
    return "Unknown";
  }

  return provider
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function PurchaseHistoryPage() {
  const result = await getPurchaseHistoryData();

  if (!result.success) {
    redirect("/login");
  }

  const { orders } = result.data;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
      <div className="mb-10 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Purchase History
        </h1>
        <p className="text-base text-foreground/80">
          Track your enrollments and purchase details in one place.
        </p>
      </div>

      {orders.length === 0 ? (
        <section className="flex flex-col items-center bg-muted dark:bg-muted/60 justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-background">
            <HiShoppingBag className="size-7 text-primary" />
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">No purchases yet</h2>
          <p className="mt-3 max-w-sm text-base text-foreground/80">
            Once you purchase a course, your payment records and order details will appear here.
          </p>

          <Link
            href="/courses"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Browse Courses
            <HiArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section>
          <div className="mb-5 flex justify-end">
            <span className="inline-flex items-center rounded-full bg-muted-foreground/15 px-4 py-1 text-sm font-medium text-foreground/75">
              {orders.length} {orders.length === 1 ? "purchase" : "purchases"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="overflow-x-auto">
              <table className="hidden w-full min-w-[980px] table-fixed md:table">
                <thead className="border-b border-border bg-muted/45">
                  <tr className="text-left text-sm font-semibold text-foreground/80">
                    <th className="w-[34%] px-6 py-3">Course Title</th>
                    <th className="w-[14%] px-4 py-3">Date</th>
                    <th className="w-[14%] px-4 py-3">Total Price</th>
                    <th className="w-[16%] px-4 py-3">Payment Type</th>
                    <th className="w-[11%] px-4 py-3 text-center">Receipt</th>
                    <th className="w-[11%] px-6 py-3 text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => {
                    const normalizedStatus = order.status.toUpperCase();
                    const statusClassName =
                      normalizedStatus === "COMPLETED"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : normalizedStatus === "PENDING"
                          ? "text-amber-700 bg-amber-50 border-amber-200"
                          : "text-red-700 bg-red-50 border-red-200";

                    const courseHref = `/courses/${order.course.id}`;

                    return (
                      <tr key={order.id} className="align-top text-sm text-foreground/85">
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                              <HiShoppingBag className="size-4 text-foreground/70" />
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={courseHref}
                                className="line-clamp-2 text-base font-semibold text-primary transition-opacity hover:opacity-80"
                              >
                                {order.course.title}
                              </Link>
                              <p className="mt-1 text-xs text-foreground/60 line-clamp-1">
                                {order.isFreeEnrollment ? "Enrollment ref" : "Order ref"}:{" "}
                                {order.providerTxId || order.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5 text-foreground/75">
                          {formatOrderDate(order.createdAt)}
                        </td>

                        <td className="px-4 py-5">
                          <span className="font-semibold text-center text-lime-800 dark:text-lime-600/80">
                            {formatPaidAmount(order.amount, order.currency)}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <p>{formatPaymentType(order.provider)}</p>
                          <span
                            className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClassName}`}
                          >
                            {normalizedStatus}
                          </span>
                        </td>

                        <td className="px-4 py-5 text-right">
                          <Link
                            href={`/dashboard/purchases/${order.id}/receipt`}
                            className="inline-flex h-9 min-w-24 items-center justify-center rounded-md border border-primary/60 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                          >
                            Receipt
                          </Link>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/dashboard/purchases/${order.id}/invoice`}
                            className="inline-flex h-9 min-w-24 items-center justify-center rounded-md border border-primary/60 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                          >
                            Invoice
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <ul className="divide-y divide-border md:hidden">
                {orders.map((order) => {
                  const normalizedStatus = order.status.toUpperCase();
                  const statusClassName =
                    normalizedStatus === "COMPLETED"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : normalizedStatus === "PENDING"
                        ? "text-amber-700 bg-amber-50 border-amber-200"
                        : "text-red-700 bg-red-50 border-red-200";

                  const courseHref = `/courses/${order.course.id}`;

                  return (
                    <li key={order.id} className="space-y-4 px-4 py-5">
                      <div className="grid gap-4">
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                              <HiShoppingBag className="size-4 text-foreground/70" />
                            </span>

                            <div className="min-w-0">
                              <Link
                                href={courseHref}
                                className="line-clamp-2 text-base font-medium text-primary transition-opacity hover:opacity-80"
                              >
                                {order.course.title}
                              </Link>
                              <p className="mt-1 text-xs text-foreground/60 line-clamp-1">
                                {order.isFreeEnrollment ? "Enrollment ref" : "Order ref"}:{" "}
                                {order.providerTxId || order.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-foreground/80">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/55">
                            Date
                          </p>
                          {formatOrderDate(order.createdAt)}
                        </div>

                        <div className="text-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/55">
                            Total Price
                          </p>
                          <span className="font-semibold text-emerald-700">
                            {formatPaidAmount(order.amount, order.currency)}
                          </span>
                        </div>

                        <div className="text-sm text-foreground/85">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/55">
                            Payment Type
                          </p>
                          <p>{formatPaymentType(order.provider)}</p>
                          <span
                            className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClassName}`}
                          >
                            {normalizedStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/purchases/${order.id}/receipt`}
                            className="inline-flex h-9 min-w-28 items-center justify-center rounded-md border border-primary/60 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                          >
                            Receipt
                          </Link>
                          <Link
                            href={`/dashboard/purchases/${order.id}/invoice`}
                            className="inline-flex h-9 min-w-28 items-center justify-center rounded-md border border-primary/60 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                          >
                            Invoice
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
