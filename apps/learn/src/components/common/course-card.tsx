'use client'

import Link from 'next/link'
import { HiArrowRight, HiEye, HiPlayCircle } from 'react-icons/hi2'
import { FaBookOpen, FaUserTie } from 'react-icons/fa6'

import { noisePattern } from '@/components/noise-pattern'
import { type StorefrontCourse } from '@/lib/lms-api-client'
import { cn } from '@/lib/utils'

type CourseCardProps = {
  course: StorefrontCourse
  index?: number
  className?: string
  ctaLabel?: string
  isEnrolled?: boolean
  href?: string
  resumeHref?: string
  viewHref?: string
  progressPercent?: number | null
  metaLabel?: string | null
}

export function CourseCard({
  course,
  index = 0,
  className,
  ctaLabel = 'View Course',
  isEnrolled = false,
  href,
  resumeHref,
  viewHref,
  progressPercent = null,
  metaLabel = null,
}: CourseCardProps) {
  const isEven = index % 2 === 0
  const description =
    course.description?.trim() ||
    'Course details coming soon. A complete overview will be available shortly.'
  const categories = (course.category ?? [])
    .map((category) => category.trim())
    .filter(Boolean)
    .slice(0, 4)
  const primaryInstructor = course.instructors?.find(
    (instructor) => instructor?.name?.trim() || instructor?.avatar?.trim(),
  )
  const instructorName = primaryInstructor?.name?.trim() ?? ''
  const instructorAvatar = primaryInstructor?.avatar?.trim() ?? ''
  const shouldShowInstructor = Boolean(instructorName) || Boolean(metaLabel)
  const normalizedProgress =
    typeof progressPercent === 'number'
      ? Math.max(0, Math.min(100, Math.round(progressPercent)))
      : null
  const finalResumeHref =
    resumeHref ?? href ?? `/dashboard/courses/${course.id}`
  const finalViewHref = viewHref ?? `/courses/${course.id}`
  const cardClassName = cn(
    'group h-full flex flex-col justify-between rounded-lg border border-muted-foreground/20 dark:border-border/70 bg-muted-foreground/10 dark:bg-muted/60 p-2 transition-colors duration-300 hover:bg-muted',
    className,
  )
  const priceLabel = isEnrolled
    ? 'Enrolled'
    : !course.price || course.price <= 0
      ? 'Free'
      : `₹${course.price.toLocaleString()}`

  const cardContent = (
    <>
      <div
        className={cn(
          'relative overflow-hidden rounded-sm',
          isEven
            ? 'bg-gradient-to-b from-[#7b627d] to-[#8f6976] dark:from-[#412c42] dark:to-[#3c1a26]'
            : 'bg-gradient-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]',
        )}
      >
        <div
          className="absolute inset-0 opacity-45 mix-blend-overlay"
          style={{ backgroundImage: noisePattern }}
        />
        <div className="relative px-[min(10%,1rem)] pt-[min(10%,1rem)]">
          <div className="relative aspect-video rounded-t-sm overflow-hidden ring-1 ring-black/10 bg-black/5">
            {categories.length > 0 ? (
              <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2.5">
                {categories.slice(0, 2).map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-lime-50 px-2 py-0.5 text-xs font-display font-semibold tracking-wide text-foreground dark:text-primary-foreground shadow-md shadow-lime-500/30"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}

            {course.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnail}
                alt={course.title}
                className="h-full w-full object-cover opacity-95 transition-transform duration-300 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground/45">
                <FaBookOpen className="size-7" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between px-3.5 py-3.5">
        <div>
          <h3 className="text-xl font-semibold text-foreground transition-colors">
            {course.title}
          </h3>
          <p className="mt-2 min-h-[2.5rem] line-clamp-2 font-d text-sm/6 text-foreground/80">
            {description}
          </p>
        </div>

        {normalizedProgress !== null ? (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-medium text-foreground/75">
              <span>Progress</span>
              <span>{normalizedProgress}%</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted-foreground/20">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${normalizedProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-4.5 mt-7 text-xs text-foreground/80">
          <div className="flex items-center justify-between gap-3">
            <div className="h-9 min-w-0 flex items-center">
              {shouldShowInstructor ? (
                <div className="inline-flex max-w-full items-center gap-2">
                  {instructorAvatar && instructorName ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={instructorAvatar}
                      alt={instructorName}
                      className="size-9 rounded-full object-cover border border-border/60 shrink-0"
                    />
                  ) : (
                    <div className="size-9 rounded-full border border-border/60 bg-background flex items-center justify-center shrink-0">
                      <FaUserTie className="size-4 text-foreground/75" />
                    </div>
                  )}
                  <span className="truncate text-sm font-medium text-foreground">
                    By {instructorName || 'Instructor'}
                  </span>
                </div>
              ) : null}
            </div>
            <span className="text-[1.2rem] font-semibold text-foreground shrink-0">
              {priceLabel}
            </span>
          </div>

          {/* {metaLabel ? <p className="text-xs text-foreground/65">{metaLabel}</p> : null} */}

          {isEnrolled ? (
            <div className="mt-1 flex items-center gap-2">
              <Link
                href={finalResumeHref}
                className="inline-flex w-full whitespace-nowrap items-center justify-center gap-2 rounded-sm bg-primary/85 px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <HiPlayCircle className="size-5" />
                Resume Learning
              </Link>
              <Link
                href={finalViewHref}
                className="inline-flex w-full items-center whitespace-nowrap justify-center gap-2 rounded-sm border border-border bg-background px-2 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {/* <HiEye className="size-4.5" /> */}
                View Course
              </Link>
            </div>
          ) : (
            <span className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary/85 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
              {ctaLabel}
              <HiArrowRight className="size-4" />
            </span>
          )}

          {/* <div className="flex flex-wrap text-foreground/70 justify-between items-center gap-3">
            <div className="inline-flex items-center gap-1.5">
              <HiUsers className="size-4.5 " />
              <span>{formatCount(studentsEnrolled, "student enrolled", "students enrolled")}</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <IoBookmark className="size-4 " />
              <span>{formatCount(lessonsCount, "lesson", "lessons")}</span>
            </div>
          </div> */}
        </div>
      </div>
    </>
  )

  return isEnrolled ? (
    <article className={cardClassName}>{cardContent}</article>
  ) : (
    <Link href={href ?? `/courses/${course.id}`} className={cardClassName}>
      {cardContent}
    </Link>
  )
}
