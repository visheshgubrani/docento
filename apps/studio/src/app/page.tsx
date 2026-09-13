import { redirect } from 'next/navigation'

import { getStaffSession } from '@/lib/studio-api'

/**
 * The front door.
 *
 * A staff application has no public front page: everything an operator wants is
 * behind the session, and a landing page would be a page nobody needs. Signed-in
 * staff go to their workspaces; everybody else signs in.
 */
export default async function HomePage() {
  const session = await getStaffSession()

  redirect(session ? '/workspaces' : '/login')
}
