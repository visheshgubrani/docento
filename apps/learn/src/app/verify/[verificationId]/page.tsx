import type { Metadata } from 'next'

import { apiClient } from '@/lib/academy'

export const metadata: Metadata = {
  title: 'Certificate verification',
  /**
   * Never indexed.
   *
   * A verification link is for an employer the learner sends it to, not for a
   * search engine to crawl — and an indexed page would let anybody enumerate
   * who studied what by searching for the academy's name.
   */
  robots: { index: false, follow: false },
}

/**
 * Public certificate verification.
 *
 * ## No account, by design
 *
 * This is the second of the two operations an unauthenticated visitor may
 * perform. The whole point of a certificate is that somebody else can check it,
 * so requiring an account here would make it useless to the person who needs it.
 *
 * ## What it shows, and what it cannot
 *
 * The API returns a closed shape: the recipient's name, the course title, the
 * issuing academy and the dates. No email, no learner id, no academy id. "Anyone
 * may verify" is not "anyone may enumerate", and the contract's shape is what
 * enforces that rather than a caller remembering to omit a field.
 *
 * ## A revoked certificate says so
 *
 * Rather than disappearing. Somebody holding a printed copy needs to learn that
 * it was revoked; a 404 would leave them holding a document that looks valid and
 * cannot be checked.
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ verificationId: string }>
}) {
  const { verificationId } = await params

  const api = await apiClient()

  const certificate = await api
    .verifyCertificate(verificationId)
    .then(({ certificate: found }) => found)
    .catch(() => null)

  if (!certificate) {
    return (
      <Status
        tone="neutral"
        heading="Not found"
        body="No certificate matches this link. Check that the whole address was copied — the identifier is long and easy to truncate."
      />
    )
  }

  if (certificate.status === 'REVOKED') {
    return (
      <Status
        tone="revoked"
        heading="This certificate was revoked"
        body={`${certificate.academy.name} revoked this certificate${
          certificate.revocationReason
            ? `: ${certificate.revocationReason}`
            : '.'
        }`}
      />
    )
  }

  const issued = new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
    new Date(certificate.issuedAt),
  )

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="border-border flex flex-col gap-6 rounded-lg border p-8">
        <p className="text-primary text-xs font-semibold tracking-wider uppercase">
          Verified
        </p>

        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl tracking-tight">
            {certificate.recipientName}
          </h1>
          <p className="text-muted-foreground text-sm">
            completed{' '}
            <span className="text-foreground">{certificate.title}</span>
          </p>
        </div>

        <dl className="border-border grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">
              Issued by
            </dt>
            <dd>{certificate.academy.name}</dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">
              Issued on
            </dt>
            <dd>{issued}</dd>
          </div>
        </dl>

        <p className="text-muted-foreground text-xs">
          Reference {certificate.verificationId}
        </p>
      </div>
    </main>
  )
}

/**
 * A verification outcome other than "valid".
 *
 * One component for both, because the difference is a heading, a sentence and a
 * colour — and two components would drift into saying different things about the
 * same absence.
 */
function Status({
  tone,
  heading,
  body,
}: {
  tone: 'neutral' | 'revoked'
  heading: string
  body: string
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <div
        className={
          tone === 'revoked'
            ? 'flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-8'
            : 'border-border flex flex-col gap-3 rounded-lg border p-8'
        }
      >
        <h1 className="font-display text-2xl tracking-tight">{heading}</h1>
        <p className="text-sm text-foreground/80">{body}</p>
      </div>
    </main>
  )
}
