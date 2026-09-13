import Link from 'next/link'
import type { Metadata } from 'next'
import { getProfile } from '@/actions/auth'
import { CourseCertificatePreviewPage } from '@/components/common/course-certificate-dialog'
import { siteConfig } from '@/config/site'
import { APIError, fetchAPI } from '@/lib/fetch-api'
import type {
  StorefrontCourseDetail,
  StorefrontCourseViewer,
} from '@/lib/lms-api-client'

type StorefrontCourseResponse = {
  data?: {
    course?: StorefrontCourseDetail
    viewer?: StorefrontCourseViewer
  }
}

type CertificateResponse = {
  data?: {
    certificate?: {
      id: string
      recipientName: string
      recipientEmail?: string | null
      issuedAt?: string | null
    }
  }
}

function formatLongDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatShortDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-US')
}

function formatPrice(price?: number | null) {
  if (!price || price <= 0) return 'Free'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>
}): Promise<Metadata> {
  const { courseId } = await params

  try {
    const response = await fetchAPI<StorefrontCourseResponse>(
      `/storefront/courses/${courseId}`,
      {
        requireAuth: true,
      },
    )
    const courseTitle = response?.data?.course?.title?.trim()

    if (!courseTitle) {
      return {
        title: 'Certificate Preview',
        description: `Preview your ${siteConfig.name} course certificate.`,
      }
    }

    return {
      title: `${courseTitle} Certificate`,
      description: `Preview your certificate for ${courseTitle} on ${siteConfig.name}.`,
    }
  } catch {
    return {
      title: 'Certificate Preview',
      description: `Preview your ${siteConfig.name} course certificate.`,
    }
  }
}

export default async function CourseCertificatePreview({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  try {
    const [profile, courseResponse, certificateResponse] = await Promise.all([
      getProfile(),
      fetchAPI<StorefrontCourseResponse>(`/storefront/courses/${courseId}`, {
        requireAuth: true,
      }),
      fetchAPI<CertificateResponse>(
        `/student/courses/${courseId}/certificate`,
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({}),
        },
      ),
    ])

    const course = courseResponse?.data?.course
    const viewer = courseResponse?.data?.viewer
    const certificate = certificateResponse?.data?.certificate

    if (!course || !certificate || !viewer?.isEnrolled) {
      throw new APIError('Certificate data is unavailable.', 404)
    }

    const instructorName =
      course.instructors?.[0]?.name?.trim() || 'our instructor team'
    const lessonsCount = course.modules.reduce(
      (total, module) => total + module.lessons.length,
      0,
    )
    const completionDateValue =
      certificate.issuedAt || viewer.enrollment?.completedAt || null
    const recipientEmail =
      certificate.recipientEmail || profile?.profile?.email || null

    return (
      <section className="min-h-screen bg-background py-8 sm:py-10">
        <CourseCertificatePreviewPage
          projectName={siteConfig.name}
          courseName={course.title}
          instructorName={instructorName}
          studentName={certificate.recipientName}
          studentEmail={recipientEmail}
          completionDate={formatLongDate(completionDateValue)}
          completionDateShort={formatShortDate(completionDateValue)}
          totalCourseLength={
            course.includes?.videoDurationText || 'Course completed'
          }
          referenceNumber={certificate.id}
          courseThumbnail={course.thumbnail}
          modulesCount={course.modules.length}
          lessonsCount={lessonsCount}
          priceText={formatPrice(course.price)}
        />
      </section>
    )
  } catch (error) {
    const message =
      error instanceof APIError
        ? error.status === 401
          ? 'Please log in to view your certificate.'
          : error.message
        : 'Unable to load your certificate right now.'

    return (
      <section className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-muted/20 p-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Certificate unavailable
          </h1>
          <p className="mt-3 text-sm text-foreground/70">{message}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/courses/${courseId}`}
              className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back to course
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(`/courses/${courseId}/certificate`)}`}
              className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    )
  }
}
