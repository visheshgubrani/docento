"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiMail, FiMapPin, FiPhone, FiUser } from "react-icons/fi";
import { HiArrowLeft, HiArrowPath } from "react-icons/hi2";
import { SiRazorpay } from "react-icons/si";

import { noisePattern } from "@/components/noise-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CheckoutCourse = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  thumbnail: string | null;
  modules?: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
    }>;
  }>;
};

type CommerceApiResponse<T = Record<string, unknown>> = {
  status?: number;
  message?: string;
  data?: T;
};

type CheckoutOrder = {
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  courseName?: string;
  description?: string;
  pricing?: {
    courseAmount?: number;
    discountAmount?: number;
    totalAmount?: number;
    couponCode?: string | null;
  };
};

type CouponValidationData = {
  valid?: boolean;
  coupon?: {
    id?: string;
    code?: string;
    discountType?: "PERCENTAGE" | "FLAT";
    discountValue?: number;
  };
  pricing?: {
    courseAmount?: number;
    discountAmount?: number;
    totalAmount?: number;
  };
};

type AppliedCoupon = {
  code: string;
  discountAmount: number;
  totalAmount: number;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
};

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
};

type RazorpayCheckout = {
  on: (
    event: "payment.failed",
    handler: (response: { error?: { description?: string } }) => void
  ) => void;
  open: () => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckout;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const loadRazorpayScript = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay is only available in browser environments."));
      return;
    }

    if (window.Razorpay) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay checkout SDK.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout SDK."));
    document.body.appendChild(script);
  });

async function postCommerce<T>(
  endpoint: "checkout" | "verify" | "cancel" | "coupon/validate",
  body: Record<string, unknown>
) {
  const response = await fetch(`/api/commerce/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as CommerceApiResponse<T> | null;

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

function formatPrice(amount: number) {
  if (!amount || amount <= 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function CheckoutClient({ course }: { course: CheckoutCourse }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [stateName, setStateName] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const courseAmount = useMemo(
    () => (course.price && course.price > 0 ? course.price : 0),
    [course.price]
  );
  const isFreeCourse = courseAmount <= 0;
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const taxAmount = 0;
  const totalAmount = Math.max(courseAmount - discountAmount + taxAmount, 0);

  const learningPoints = useMemo(() => {
    const fromLessons = (course.modules ?? [])
      .flatMap((module) => module.lessons)
      .slice(0, 5)
      .map((lesson) => lesson.title.trim())
      .filter(Boolean);

    if (fromLessons.length > 0) return fromLessons;

    return [
      "Learn the core concepts with practical guidance.",
      "Follow a step-by-step structure from basics to advanced.",
      "Apply your knowledge through real project scenarios.",
      "Build confidence for production-ready implementation.",
    ];
  }, [course.modules]);

  const validateForm = () => {
    if (!name.trim() || !email.trim() || !mobile.trim() || !stateName.trim()) {
      setFormError("Please complete all payment details fields.");
      return false;
    }

    if (!email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return false;
    }

    if (mobile.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid mobile number.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleApplyCoupon = async () => {
    if (isFreeCourse) return;
    if (isApplyingCoupon || isProcessing) return;

    const normalizedCoupon = coupon.trim().toUpperCase();
    if (!normalizedCoupon) {
      setCouponError("Enter a coupon code first.");
      setCouponSuccess(null);
      setAppliedCoupon(null);
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const validateResponse = await postCommerce<CouponValidationData>(
        "coupon/validate",
        {
          courseId: course.id,
          couponCode: normalizedCoupon,
        }
      );

      const payload = validateResponse?.data;
      if (!payload?.valid || !payload?.coupon?.code) {
        throw new Error(validateResponse?.message || "Invalid coupon code.");
      }

      const nextDiscountAmount = payload.pricing?.discountAmount ?? 0;
      const nextTotalAmount =
        payload.pricing?.totalAmount ?? Math.max(courseAmount - nextDiscountAmount, 0);
      const nextDiscountType = payload.coupon.discountType ?? "FLAT";
      const nextDiscountValue = payload.coupon.discountValue ?? 0;

      setCoupon(payload.coupon.code);
      setAppliedCoupon({
        code: payload.coupon.code,
        discountAmount: nextDiscountAmount,
        totalAmount: nextTotalAmount,
        discountType: nextDiscountType,
        discountValue: nextDiscountValue,
      });
      setCouponSuccess("Coupon applied successfully.");
      setCouponError(null);
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error instanceof Error ? error.message : "Unable to apply coupon.");
      setCouponSuccess(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (isProcessing) return;
    if (!validateForm()) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const checkoutResponse = await postCommerce<CheckoutOrder>("checkout", {
        courseId: course.id,
        customer: {
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          state: stateName.trim(),
        },
        ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
      });

      const order = checkoutResponse?.data;

      if (!order?.orderId || !order?.keyId || !order?.amount) {
        setSuccessMessage(
          checkoutResponse?.message || "Enrollment completed. Redirecting to your dashboard..."
        );
        setIsProcessing(false);
        setTimeout(() => {
          router.push("/dashboard");
        }, 900);
        return;
      }

      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Razorpay is unavailable right now. Please retry.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: process.env.NEXT_PUBLIC_APP_NAME || "LMS",
        description: order.description || `Enrollment for ${course.title}`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const verifyResponse = await postCommerce("verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccessMessage(
              verifyResponse?.message || "Payment verified successfully. Redirecting..."
            );
            setTimeout(() => {
              router.push("/dashboard");
            }, 900);
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "Payment verification failed."
            );
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            postCommerce("cancel", { orderId: order.orderId }).catch(() => null);
            setIsProcessing(false);
          },
        },
        theme: {
          color: "#111111",
        },
      });

      checkout.on("payment.failed", (response) => {
        setErrorMessage(
          response?.error?.description ||
            "Payment failed. Please try again with a different method."
        );
        postCommerce("cancel", { orderId: order.orderId }).catch(() => null);
        setIsProcessing(false);
      });

      checkout.open();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start checkout right now."
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative flex lg:flex-row flex-col min-h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative border-r border-border bg-linear-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]">
        <div
          className="absolute inset-0 opacity-35 mix-blend-overlay"
          style={{
            backgroundPosition: "center",
            backgroundImage: noisePattern,
          }}
        />

        <Link
          href={`/courses/${course.id}`}
          className="absolute  hidden underline xl:px-14 left-10 top-8 z-10 lg:inline-flex items-center gap-2 text-sm font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <HiArrowLeft className="h-4 w-4" />
          Back to course
        </Link>

        <div className="relative flex w-full items-center justify-center px-10 py-12 xl:px-14">
          <div className="lg:mt-8 w-full max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Checkout</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-foreground">{course.title}</h1>

            <div className="mt-6 overflow-hidden rounded-lg border-2 border-white/30 shadow-md bg-background/75">
              <div className="relative aspect-video">
                {course.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-foreground/55">
                    Course preview
                  </div>
                )}
              </div>
            </div>

            <p className="mt-8 text-4xl font-extrabold text-foreground">
              {formatPrice(courseAmount)}
            </p>

            <div className="mt-7">
              <h2 className="text-lg font-semibold text-foreground">What You&apos;ll Learn</h2>
              <ul className="mt-3 space-y-2 text-sm text-foreground/85 font-medium">
                {learningPoints.map((point, index) => (
                  <li key={`${point}-${index}`} className="flex items-start gap-2">
                    <span className="mt-0.5 text-primary">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1  bg-background">
        <div className="mx-auto w-full max-w-xl px-6 py-10 lg:px-10 lg:py-6">
          <Link
            href={`/courses/${course.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline lg:hidden"
          >
            <HiArrowLeft className="h-4 w-4" />
            Back to course
          </Link>

          <h2 className="mt-5 font-display text-3xl font-semibold tracking-wide text-foreground">
            Payment Details
          </h2>
          <p className="mt-2.5 text-sm text-foreground">
            Complete your enrolment for {""}
            <span className="font-semibold text-primary">{course.title}</span>
          </p>

          <div className="mt-7 rounded-xl border border-border bg-muted dark:bg-card p-5">
            <div className="space-y-4">
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name"
                  className="h-11 border-muted-foreground/50 placeholder:text-foreground/60 dark:border-border bg-white dark:bg-muted/60 pl-10"
                />
              </div>

              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="h-11 border-muted-foreground/50 placeholder:text-foreground/60 dark:border-border bg-white dark:bg-muted/60 pl-10"
                />
              </div>

              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                <Input
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  placeholder="Mobile number"
                  className="h-11 border-muted-foreground/50 placeholder:text-foreground/60 dark:border-border bg-white dark:bg-muted/60 pl-10"
                />
              </div>

              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                <Input
                  value={stateName}
                  onChange={(event) => setStateName(event.target.value)}
                  placeholder="State"
                  className="h-11 border-muted-foreground/50 placeholder:text-foreground/60 dark:border-border bg-white dark:bg-muted/60 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-muted dark:bg-card p-5">
            <h3 className="font-display text-xl font-semibold text-foreground">Order Summary</h3>

            {!isFreeCourse ? (
              <>
                <div className="mt-4 flex items-center gap-2">
                  <Input
                    value={coupon}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setCoupon(nextValue);
                      setCouponError(null);
                      setCouponSuccess(null);

                      const normalizedNext = nextValue.trim().toUpperCase();
                      if (appliedCoupon && normalizedNext !== appliedCoupon.code) {
                        setAppliedCoupon(null);
                      }
                    }}
                    placeholder="Apply Coupon"
                    className="h-10 border-muted-foreground/50 placeholder:text-foreground/60 dark:border-border rounded-lg bg-white dark:bg-muted/60 "
                  />
                  <Button
                    type="button"
                    variant="default"
                    className="h-10 shrink-0 bg-primary/85 font-semibold rounded-lg px-4"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || isProcessing}
                  >
                    {isApplyingCoupon ? "Applying..." : "Apply"}
                  </Button>
                </div>
                {couponError ? (
                  <p className="mt-2 text-sm text-red-700">{couponError}</p>
                ) : null}
                {couponSuccess ? (
                  <p className="mt-2 text-sm text-emerald-700">
                    {couponSuccess}
                    {appliedCoupon ? (
                      <span className="ml-1 font-medium">
                        ({appliedCoupon.discountType === "PERCENTAGE"
                          ? `${appliedCoupon.discountValue}%`
                          : formatPrice(appliedCoupon.discountValue)}
                        {" "}off)
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </>
            ) : null}

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between text-foreground/95">
                <span>Course amount</span>
                <span>{formatPrice(courseAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-foreground/95">
                <span>Discount</span>
                <span className="">{formatPrice(discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-foreground/95">
                <span>Tax</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
              <div className="h-px my-3 w-full bg-muted-foreground/20" />
              <div className="flex items-center justify-between text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>

            {formError ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <Button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="mt-6 h-11 w-full cursor-pointer font-semibold tracking-wide rounded-full"
            >
              {isProcessing ? (
                <span className="inline-flex items-center gap-2">
                  <HiArrowPath className="h-4 w-4 animate-spin" />
                  {isFreeCourse ? "Enrolling..." : "Processing..."}
                </span>
              ) : (
                isFreeCourse ? "Enroll for free" : `Pay ${formatPrice(totalAmount)}`
              )}
            </Button>

            {!isFreeCourse ? (
              <p className="mt-6 inline-flex w-full font-medium items-center justify-center gap-1.5 text-xs text-foreground/80">
                <span>Powered by</span>
                <SiRazorpay className="size-3.5 -mr-0.5" /> Razorpay
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-foreground/80">
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </Link>
            <Link
              href="/refund-policy"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
