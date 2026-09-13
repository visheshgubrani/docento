import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { IssueCertificateButton } from '@/components/player/issue-certificate-button'
import {
  apiClient,
  isNotFound,
  redirectIfSignedOut,
  resolveAcademy,
} from '@/lib/academy'

export const metadata: Metadata = { title: 'Certificate' }

/**
 * A certificate, and the button that asks for one.
 *
 * ## Why issuance is a button rather than a page render
 *
 * The page this replaces issued the certificate during a `GET`, which is a
 * durable business effect performed while rendering — and a page can render more
 * than once, through a prefetch, an RSC re-render or a retry. Issuing twice is
 * idempotent in the API, so the damage was limited, but a write on a read is a
 * thing that eventually does something surprising.
 *
 * ## The link is the certificate
 *
 * A certificate's value is that somebody else can check it, so the verification
 * URL is shown prominently rather than hidden behind a download. A learner who
 * cannot find that link cannot use the certificate.
 */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  await redirectIfSignedOut(`/learn/courses/${courseId}/certificate`)

  const academy = await resolveAcademy()
  const api = await apiClient()

  let course

  try {
    course = await api.getLearnerCourse(courseId)
  } catch (error) {
    if (isNotFound(error)) notFound()

    throw error
  }

  const { certificates } = await api.listLearnerCertificates()
  const certificate = certificates.find((entry) => entry.courseId === courseId)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <nav className="text-muted-foreground text-sm">
        <Link
          href={`/learn/courses/${courseId}`}
          className="hover:text-primary"
        >
          ← Back to the course
        </Link>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">
          {course.course.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {course.course.percent}% complete
        </p>
      </header>

      {certificate ? (
        <section className="border-border flex flex-col gap-4 rounded-lg border p-6">
          <div className="flex flex-col gap-1">
            <p className="font-display text-xl tracking-tight">
              {certificate.title}
            </p>
            <p className="text-muted-foreground text-sm">
              Issued to {certificate.recipientName} on{' '}
              {new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
                certificate.issuedAt,
              )}
            </p>
          </div>

          {certificate.revokedAt ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              This certificate has been revoked.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Share this link with an employer — it verifies the certificate
                without them needing an account here.
              </p>

              <Link
                href={`/verify/${certificate.verificationId}`}
                className="text-primary text-sm font-medium break-all underline"
              >
                /verify/{certificate.verificationId}
              </Link>
            </>
          )}
        </section>
      ) : course.course.isComplete ? (
        <IssueCertificateButton courseId={courseId} />
      ) : (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          Finish every required lesson and your certificate can be issued.
        </p>
      )}

      {academy ? (
        <p className="text-muted-foreground text-center text-xs">
          {academy.branding?.displayName ?? academy.name}
        </p>
      ) : null}
    </main>
  )
}
