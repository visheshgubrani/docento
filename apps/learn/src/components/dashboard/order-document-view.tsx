"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { useState } from "react";
import { HiPrinter } from "react-icons/hi2";
import type { OrderDocumentResponse } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";

type OrderDocumentViewProps = {
  data: OrderDocumentResponse;
  variant: "invoice" | "receipt";
};

function formatAmount(amount: number, currency: string) {
  const major = amount / 100;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(major);
  } catch {
    return `₹${major.toLocaleString("en-IN")}`;
  }
}

function formatPdfAmount(amount: number, currency: string) {
  const major = amount / 100;
  const normalizedCurrency = (currency || "INR").toUpperCase();
  const amountText = major.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (normalizedCurrency === "INR") {
    return `Rs. ${amountText}`;
  }

  return `${normalizedCurrency} ${amountText}`;
}

function formatLongDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function makeSafeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 11,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 10,
    marginTop: 6,
  },
  rightAligned: {
    alignItems: "flex-end",
  },
  tenantName: {
    color: "#2563eb",
    fontSize: 18,
    fontWeight: 700,
  },
  detailsGrid: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    gap: 16,
    paddingBottom: 20,
    paddingTop: 20,
  },
  detailCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 96,
    padding: 14,
  },
  detailTitle: {
    color: "#4b5563",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  bodyText: {
    color: "#374151",
    fontSize: 10.5,
    lineHeight: 1.45,
    marginBottom: 4,
  },
  bodyStrong: {
    color: "#111827",
    fontWeight: 600,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    borderBottomColor: "#e5e7eb",
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableRow: {
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  tableCellGrow: {
    flex: 1,
  },
  tableCellRight: {
    minWidth: 100,
    textAlign: "right",
  },
  labelText: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: 600,
  },
  valueText: {
    color: "#111827",
    fontSize: 10.5,
    fontWeight: 600,
  },
  smallMuted: {
    color: "#6b7280",
    fontSize: 9,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  summaryLabel: {
    color: "#374151",
    fontSize: 10.5,
    fontWeight: 600,
    minWidth: 120,
    paddingRight: 16,
    textAlign: "right",
  },
  summaryValue: {
    color: "#111827",
    fontSize: 10.5,
    fontWeight: 600,
    minWidth: 100,
    textAlign: "right",
  },
  totalValue: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: 700,
  },
  paidValue: {
    color: "#059669",
    fontSize: 10.5,
    fontWeight: 700,
  },
  footer: {
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1,
    color: "#6b7280",
    fontSize: 10,
    marginTop: 28,
    paddingTop: 18,
    textAlign: "center",
  },
});

function OrderDocumentPdf({
  data,
  variant,
}: {
  data: OrderDocumentResponse;
  variant: "invoice" | "receipt";
}) {
  const { order, course, tenant, student } = data;
  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {variant === "invoice" ? (
          <>
            <View style={pdfStyles.headerRow}>
              <View>
                <Text style={pdfStyles.title}>INVOICE</Text>
                <Text style={pdfStyles.subtitle}>{invoiceNumber}</Text>
              </View>
              <View style={pdfStyles.rightAligned}>
                <Text style={pdfStyles.tenantName}>{tenant.name}</Text>
                <Text style={pdfStyles.subtitle}>Date Issued: {formatLongDate(order.createdAt)}</Text>
              </View>
            </View>

            <View style={pdfStyles.detailsGrid}>
              <View style={pdfStyles.detailCard}>
                <Text style={pdfStyles.detailTitle}>Bill To</Text>
                <Text style={[pdfStyles.bodyText, pdfStyles.bodyStrong]}>{student.name}</Text>
                <Text style={pdfStyles.bodyText}>{student.email}</Text>
              </View>
              <View style={pdfStyles.detailCard}>
                <Text style={pdfStyles.detailTitle}>Payment Info</Text>
                <Text style={pdfStyles.bodyText}>Transaction: {order.providerTxId || "N/A"}</Text>
                <Text style={pdfStyles.bodyText}>Method: {formatPaymentType(order.provider)}</Text>
                <Text style={pdfStyles.bodyText}>Status: {order.status}</Text>
              </View>
            </View>

            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.labelText, pdfStyles.tableCellGrow]}>Item Description</Text>
                <Text style={[pdfStyles.labelText, pdfStyles.tableCellRight]}>Price</Text>
              </View>
              <View style={pdfStyles.tableRow}>
                <View style={pdfStyles.tableCellGrow}>
                  <Text style={pdfStyles.valueText}>{course.title}</Text>
                  <Text style={pdfStyles.smallMuted}>Digital Course Enrollment</Text>
                </View>
                <Text style={[pdfStyles.valueText, pdfStyles.tableCellRight]}>
                  {formatPdfAmount(order.amount, order.currency)}
                </Text>
              </View>
            </View>

            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Subtotal</Text>
              <Text style={pdfStyles.summaryValue}>
                {formatPdfAmount(order.amount, order.currency)}
              </Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total</Text>
              <Text style={[pdfStyles.summaryValue, pdfStyles.totalValue]}>
                {formatPdfAmount(order.amount, order.currency)}
              </Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Amount Paid</Text>
              <Text style={[pdfStyles.summaryValue, pdfStyles.paidValue]}>
                -{formatPdfAmount(order.amount, order.currency)}
              </Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Balance Due</Text>
              <Text style={pdfStyles.summaryValue}>{formatPdfAmount(0, order.currency)}</Text>
            </View>

            <Text style={pdfStyles.footer}>Thank you for your business!</Text>
          </>
        ) : (
          <>
            <View style={pdfStyles.headerRow}>
              <View>
                <Text style={pdfStyles.title}>Receipt</Text>
                <Text style={pdfStyles.subtitle}>Receipt for your recent purchase</Text>
              </View>
              <View style={pdfStyles.rightAligned}>
                <Text style={pdfStyles.tenantName}>{tenant.name}</Text>
                <Text style={pdfStyles.subtitle}>Order ref: {order.providerTxId || order.id}</Text>
                <Text style={pdfStyles.subtitle}>Date: {formatLongDate(order.createdAt)}</Text>
              </View>
            </View>

            <View style={pdfStyles.detailsGrid}>
              <View style={pdfStyles.detailCard}>
                <Text style={pdfStyles.detailTitle}>Billed To</Text>
                <Text style={[pdfStyles.bodyText, pdfStyles.bodyStrong]}>{student.name}</Text>
                <Text style={pdfStyles.bodyText}>{student.email}</Text>
              </View>
              <View style={pdfStyles.detailCard}>
                <Text style={pdfStyles.detailTitle}>Payment Details</Text>
                <Text style={pdfStyles.bodyText}>Status: {order.status}</Text>
                <Text style={pdfStyles.bodyText}>Method: {formatPaymentType(order.provider)}</Text>
              </View>
            </View>

            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.labelText, pdfStyles.tableCellGrow]}>Description</Text>
                <Text style={[pdfStyles.labelText, pdfStyles.tableCellRight]}>Amount</Text>
              </View>
              <View style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.valueText, pdfStyles.tableCellGrow]}>{course.title}</Text>
                <Text style={[pdfStyles.valueText, pdfStyles.tableCellRight]}>
                  {formatPdfAmount(order.amount, order.currency)}
                </Text>
              </View>
            </View>

            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total Paid</Text>
              <Text style={[pdfStyles.summaryValue, pdfStyles.paidValue]}>
                {formatPdfAmount(order.amount, order.currency)}
              </Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}

export function OrderDocumentView({ data, variant }: OrderDocumentViewProps) {
  const { order, course, tenant, student } = data;
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const documentFileName =
    makeSafeFileName(`${tenant.name}-${course.title}-${order.id.slice(0, 8)}`) || "document";

  async function handleDownloadPdf() {
    try {
      setIsDownloading(true);

      const blob = await pdf(<OrderDocumentPdf data={data} variant={variant} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${documentFileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="bg-background p-10 shadow-sm print:shadow-none sm:rounded-xl sm:border sm:border-border">
          {variant === "invoice" ? (
            <>
              <div className="flex flex-col justify-between border-b border-border pb-8 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground">INVOICE</h1>
                  <p className="mt-2 text-sm font-medium text-foreground/60">{invoiceNumber}</p>
                </div>
                <div className="mt-6 text-left sm:mt-0 sm:text-right">
                  <p className="text-xl font-bold text-primary">{tenant.name}</p>
                  <p className="mt-1 text-sm text-foreground/60">
                    Date Issued: {formatLongDate(order.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-8 border-b border-border pb-8 sm:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/40 p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/70">
                    Bill To
                  </h3>
                  <p className="font-medium text-foreground">{student.name}</p>
                  <p className="mt-1 text-sm text-foreground/80">{student.email}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/40 p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/70">
                    Payment Info
                  </h3>
                  <p className="mb-1 text-sm text-foreground/80">
                    <span className="font-medium">Transaction:</span>{" "}
                    {order.providerTxId || "N/A"}
                  </p>
                  <p className="text-sm text-foreground/80">
                    <span className="font-medium">Method:</span>{" "}
                    {formatPaymentType(order.provider)}
                  </p>
                  <p className="mt-1 text-sm text-foreground/80">
                    <span className="font-medium">Status:</span>{" "}
                    <span className="font-semibold uppercase text-emerald-600">
                      {order.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <table className="w-full text-left">
                  <thead className="border-y border-border bg-muted/50">
                    <tr className="text-sm font-semibold text-foreground/70">
                      <th className="w-full px-4 py-3">Item Description</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="border-b border-border text-sm text-foreground/80">
                    <tr>
                      <td className="px-4 py-5 font-medium text-foreground">
                        {course.title}
                        <br />
                        <span className="text-xs font-normal text-foreground/60">
                          Digital Course Enrollment
                        </span>
                      </td>
                      <td className="px-4 py-5 text-right font-medium">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="px-4 pt-6 text-right font-semibold text-foreground/70">
                        Subtotal
                      </td>
                      <td className="px-4 pt-6 text-right font-semibold">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 pt-3 text-right font-semibold text-foreground">
                        Total
                      </td>
                      <td className="px-4 pt-3 text-right text-xl font-bold text-primary">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 pt-2 text-right font-semibold text-emerald-600">
                        Amount Paid
                      </td>
                      <td className="px-4 pt-2 text-right font-bold text-emerald-600">
                        -{formatAmount(order.amount, order.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 pt-4 text-right font-bold uppercase tracking-wide text-foreground">
                        Balance Due
                      </td>
                      <td className="px-4 pt-4 text-right text-lg font-bold text-foreground">
                        {formatAmount(0, order.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-12 border-t border-border pt-8 text-center text-sm text-foreground/60">
                <p>Thank you for your business!</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col justify-between border-b border-border pb-8 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-display text-3xl font-bold text-primary">Receipt</h1>
                  <p className="mt-1 text-sm text-foreground/60">
                    Receipt for your recent purchase
                  </p>
                </div>
                <div className="mt-6 text-left sm:mt-0 sm:text-right">
                  <p className="text-lg font-semibold text-foreground">{tenant.name}</p>
                  <p className="text-sm text-foreground/60">
                    Order ref: {order.providerTxId || order.id}
                  </p>
                  <p className="text-sm text-foreground/60">Date: {formatLongDate(order.createdAt)}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-8 border-b border-border pb-8 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-foreground/60">
                    Billed To
                  </h3>
                  <p className="font-medium text-foreground">{student.name}</p>
                  <p className="text-sm text-foreground/80">{student.email}</p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-foreground/60">
                    Payment Details
                  </h3>
                  <p className="text-sm text-foreground/80">
                    Status: <span className="font-medium uppercase">{order.status}</span>
                  </p>
                  <p className="text-sm text-foreground/80">
                    Method: <span className="font-medium">{formatPaymentType(order.provider)}</span>
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-sm font-semibold text-foreground/60">
                      <th className="w-full pb-3">Description</th>
                      <th className="whitespace-nowrap pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm text-foreground/80">
                    <tr>
                      <td className="py-4 font-medium text-foreground">{course.title}</td>
                      <td className="py-4 text-right font-semibold">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="px-2 pt-6 text-right font-semibold text-foreground">
                        Total Paid
                      </td>
                      <td className="px-2 pt-6 text-right text-lg font-bold text-lime-600">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="mt-12 flex justify-end print:hidden">
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium"
          >
            <HiPrinter className="size-4" />
            {isDownloading ? "Downloading PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
