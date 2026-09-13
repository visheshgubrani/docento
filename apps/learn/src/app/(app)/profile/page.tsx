import type { Metadata } from 'next'
import Link from 'next/link'

import { apiClient, getLearnerSession } from '@/lib/academy'

export const metadata: Metadata = { title: 'Your profile' }

/**
 * The learner's own details and certificates.
 *
 * Read-only for now, and honestly so: there is no operation that lets a learner
 * change their own name or email, and a form that posted nowhere would be worse
 * than no form. Editing arrives with the operation.
 *
 * Certificates are listed with their verification links, because that link is
 * the entire point of a certificate — an employer uses it, and a page that showed
 * only a title would make the learner hunt for it.
 */
export default async function ProfilePage() {
  const session = await getLearnerSession()

  if (!session) return null

  const api = await apiClient()
  const { certificates } = await api.listLearnerCertificates()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">Your profile</h1>
        <p className="text-muted-foreground text-sm">
          Your account belongs to this academy. The same email address at
          another academy is a different account.
        </p>
      </header>

      <dl className="border-border flex flex-col gap-4 rounded-lg border p-6">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs tracking-wide uppercase">
            Name
          </dt>
          <dd>{session.name}</dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs tracking-wide uppercase">
            Email
          </dt>
          <dd>{session.email}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-xl tracking-tight">Certificates</h2>

        {certificates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Finish a course and your certificate appears here.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {certificates.map((certificate) => (
              <li
                key={certificate.id}
                className="border-border flex flex-col gap-2 rounded-lg border p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">{certificate.title}</p>

                  {certificate.revokedAt ? (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Revoked
                    </span>
                  ) : null}
                </div>

                <p className="text-muted-foreground text-sm">
                  Issued{' '}
                  {new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
                    certificate.issuedAt,
                  )}
                </p>

                <Link
                  href={`/verify/${certificate.verificationId}`}
                  className="text-primary text-sm font-medium underline"
                >
                  Public verification link
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
