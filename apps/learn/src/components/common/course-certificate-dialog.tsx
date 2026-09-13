"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { HiArrowDownTray, HiFolder, HiPlayCircle, HiShoppingCart } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { noisePattern } from "@/components/noise-pattern";
import { siteConfig } from "@/config/site";
import {
  fontSans,
  fontDisplay,
  fontBrand,
  fontCinzel,
  fontScript,
  fontBaskerville,
} from "@/lib/fonts";

type CourseCertificatePreviewPageProps = {
  projectName: string;
  courseName: string;
  instructorName?: string | null;
  studentName: string;
  studentEmail?: string | null;
  completionDate: string;
  completionDateShort: string;
  totalCourseLength: string;
  referenceNumber: string;
  courseThumbnail?: string | null;
  modulesCount: number;
  lessonsCount: number;
  priceText: string;
};

function formatCertificateHours(value: string) {
  return value
    .replace(/\bon-?demand video\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function toPascalCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function CourseCertificatePreviewPage({
  projectName,
  courseName,
  instructorName,
  studentName,
  studentEmail,
  completionDate,
  completionDateShort,
  totalCourseLength,
  referenceNumber,
  courseThumbnail,
  modulesCount,
  lessonsCount,
  priceText,
}: CourseCertificatePreviewPageProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const safeFileName = useMemo(
    () =>
      `${courseName || "course"}-certificate`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    [courseName]
  );

  const printBodyClass = useMemo(
    () =>
      [
        fontSans.variable,
        fontDisplay.variable,
        fontBrand.variable,
        fontCinzel.variable,
        fontScript.variable,
        fontBaskerville.variable,
      ].join(" "),
    []
  );

  const handleDownloadPdf = useReactToPrint({
    contentRef: certificateRef,
    bodyClass: printBodyClass,
    documentTitle: safeFileName || "certificate",
    pageStyle: `
      @page { size: A4 landscape; margin: 8mm; }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
    `,
  });

  const teacherName = instructorName?.trim() || "Acme Learning team";
  const certificateHours = formatCertificateHours(totalCourseLength);
  const studentDisplayName = toPascalCase(studentName);
  const courseDisplayName = toPascalCase(courseName);

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
          Certificate Preview
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium text-foreground sm:text-5xl">
          Course Certificate
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70 sm:text-base">
          Review the certificate, then download a PDF copy for your records.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.95fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <div ref={certificateRef} className="border border-black bg-white p-3 text-black">
            <div className="border-[3px] border-black p-2.5">
              <div className="flex min-h-[25.75rem] select-none bg-neutral-100/50 flex-col justify-between border border-black/20 px-7 py-6">
                <div className="mx-auto flex max-w-fit items-center justify-center gap-2 text-center">
                  <Image src={siteConfig.logo} alt={siteConfig.name} width={30} height={30} />
                  <span className="font-brand font-extrabold lowercase text-black text-2xl">
                    {projectName}
                  </span>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="w-full max-w-lg">
                    <div className="mt-5 space-y-1">
                      <div className="h-px bg-black/25" />
                      <div className="h-px bg-black/25" />
                    </div>
                    <div className="py-1.5">
                      <p className=" mt-0.5 font-cinzel font-semibold text-[1.4rem] uppercase tracking-[0.22em] text-black">
                        Certificate of Completion
                      </p>
                    </div>
                    <div className="space-y-1 mt-0.5">
                      <div className="h-px bg-black/25" />
                      <div className="h-px bg-black/25" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-medium uppercase tracking-[0.30em] text-black/45">
                      Awarded To
                    </p>
                  </div>

                  <div className="mt-6 w-full">
                    <p className="font-tangerine text-[4.8rem] leading-none text-black">
                      {studentDisplayName}
                    </p>
                    <div className="mx-auto -mt-2 h-px max-w-lg bg-black/40" />
                  </div>

                  <div className="mt-7 max-w-3xl">
                    <p className="text-[0.95rem] tracking-wide text-black/50">
                      For successfully completing the course
                    </p>
                    <h2 className="font-baskerville mx-auto mt-6 max-w-4xl text-[2.15rem] font-medium tracking-[0.02em] text-black">
                      {courseDisplayName}
                    </h2>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3 border-t border-black/15 pt-5 text-center">
                  <div className="break-words">
                    <p className="text-[0.68rem] font-semibold text-black/55">Date</p>
                    <p className="mt-1.5 text-sm font-semibold text-black/85">{completionDate}</p>
                  </div>
                  <div className="break-words">
                    <p className="text-[0.68rem] font-semibold text-black/55">Instructor</p>
                    <p className="mt-1.5 text-sm font-semibold text-black/85">
                      {instructorName?.trim() || "Acme Learning Team"}
                    </p>
                  </div>
                  <div className="break-words">
                    <p className="text-[0.68rem] font-semibold text-black/55">Total Hours</p>
                    <p className="mt-1.5 text-sm font-semibold text-black/85">{certificateHours}</p>
                  </div>
                </div>

                <div className="mt-5 -mb-1 text-center">
                  <p className="font-mono text-[0.72rem] font-medium whitespace-nowrap text-black/45">
                    {referenceNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/25 px-5 py-4 text-sm leading-7 text-foreground/75 sm:px-6">
            <p>
              This certificate above verifies that{" "}
              <span className="font-semibold">{studentDisplayName}</span> successfully completed the
              course <span className="font-semibold">{courseName}</span> on{" "}
              <span className="font-semibold">{completionDateShort}</span> as taught by{" "}
              <span className="font-semibold">{teacherName}</span> on{" "}
              <span className="font-semibold">{projectName}</span>. The certificate indicates the
              entire course was completed as validated by the student. The course length represents
              the total hours of the videos and article lectures of the course at the time of most
              recent completion.
            </p>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-border/80 bg-muted p-5 shadow-sm">
            <p className="text-xs font-semibold  tracking-[0.24em] text-foreground/75">
              Certificate Recipient
            </p>
            <div className="mt-4 min-w-0">
              <p className="text-lg font-semibold text-foreground">{studentDisplayName}</p>
              <p className="truncate text-sm text-foreground/60">{studentEmail || "Learner"}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-muted p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.24em] text-foreground/75">
              About the Course
            </p>

            <div className="mt-4">
              <div className="relative overflow-hidden rounded-sm bg-gradient-to-b from-[#9ca88f] to-[#596352]">
                <div
                  className="absolute inset-0 opacity-45 mix-blend-overlay"
                  style={{ backgroundImage: noisePattern }}
                />
                <div className="relative px-[min(10%,1rem)] py-[min(10%,1rem)]">
                  <div className="relative aspect-video overflow-hidden rounded-t-sm ring-1 ring-black/10 bg-muted">
                    {courseThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={courseThumbnail}
                        alt={courseName}
                        className="aspect-video h-full w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-video h-full w-full bg-gradient-to-b from-[#9ca88f] to-[#596352]" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {courseName}
                </h3>
                <p className="mt-2 text-sm text-foreground/65">{teacherName}</p>
              </div>

              <div className="flex flex-col gap-2.5 text-sm text-foreground/75">
                <div className="inline-flex items-center gap-2">
                  <HiFolder className="size-4.5 text-primary" />
                  <span>
                    {modulesCount} modules • {lessonsCount} lessons
                  </span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <HiPlayCircle className="size-4.5 text-primary" />
                  <span>{totalCourseLength}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <HiShoppingCart className="size-4.5 text-primary" />
                  <span>{priceText}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full cursor-pointer hover:bg-primary/80 gap-1.5 py-5 rounded-full"
              >
                <HiArrowDownTray className="size-4.5" strokeWidth={1} />
                Download
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
