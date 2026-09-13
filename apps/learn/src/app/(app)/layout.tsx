import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getLearnerSession } from '@/lib/academy'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your learning dashboard.',
}

/**
 * The session gate.
 *
 * ## Why this is a layout and not middleware
 *
 * The middleware this replaces validated a token by calling the legacy API from
 * the Edge runtime. That cannot work any more: the learner realm resolves
 * sessions through Prisma, and Prisma cannot run in Edge middleware. It also ran
 * a blocking HTTP request on every protected navigation, twice over, to check
 * enrollment.
 *
 * A Node-runtime layout reads the session directly. The cost is that the gate
 * runs after routing rather than before it, which is fine — it is still before
 * any page renders, and it is the same check the API makes on every request that
 * matters.
 *
 * ## The redirect carries where they were going
 *
 * A learner following a link to a lesson is sent to sign in and then back to it.
 * Dropping the destination is how a sign-in wall becomes a lost place in a
 * course.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getLearnerSession()

  if (!session) redirect('/login?next=/dashboard')

  return <div className="bg-background min-h-screen">{children}</div>
}
