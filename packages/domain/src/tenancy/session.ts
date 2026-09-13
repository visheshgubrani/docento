/**
 * The staff session, and the workspaces it may act in.
 *
 * ## Why this is an operation rather than a cookie read
 *
 * A frontend could read the staff cookie and draw a header from it. It would
 * then be a second implementation of session validation, and the two would
 * disagree the first time a session was revoked, expired, or a membership was
 * removed — with the disagreement landing on the permissive side, because the
 * cookie is a value the browser still holds.
 *
 * ## Why it is separate from `workspace.list`
 *
 * A staff identity spans workspaces, and this answers "who am I and where may I
 * go", which is what the application's shell needs before a workspace has been
 * chosen. `workspace.list` remains the authoritative list for a caller that has
 * already picked one, and carries the fields that page needs.
 */

import { prisma } from '../db'
import type { Principal, StaffRole } from '../authorization/principal'
import { listWorkspacesForPrincipal } from './service-keys'
import { ForbiddenError, assertFound } from '../shared/errors'

export type StaffSessionWorkspace = {
  id: string
  name: string
  slug: string
  role: StaffRole
}

export type StaffIdentity = {
  userId: string
  name: string
  email: string
  /**
   * Every workspace this identity may act in.
   *
   * The roles that are not `owner` or `admin` are filtered out rather than
   * listed and then refused: `can()` recognises only those two, so a
   * membership in any other role grants nothing. Offering it in a chooser would
   * be offering a door that does not open.
   */
  workspaces: StaffSessionWorkspace[]
}

/** Roles `can()` recognises, as a value rather than a comment. */
const ACTING_ROLES: readonly string[] = ['owner', 'admin']

/**
 * Who the caller is, and where they may act.
 *
 * Deliberately readable without a workspace: a session that has not chosen one
 * is exactly the state this operation exists to resolve. That is why it is
 * written against the principal's user id rather than through `assertCan` — the
 * only thing there is to authorize is "you may read your own identity", which is
 * true by construction and cannot be forgotten because there is no second
 * question to ask.
 */
export async function getStaffIdentity(
  principal: Principal,
): Promise<StaffIdentity> {
  if (principal.kind !== 'staff') {
    throw new ForbiddenError(
      'workspace:read',
      'Reading the staff session requires a staff session.',
    )
  }

  const user = await prisma.staffUser.findUnique({
    where: { id: principal.userId },
    select: { id: true, name: true, email: true },
  })

  assertFound('staff user', user, principal.userId)

  const memberships = await listWorkspacesForPrincipal(principal)

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    workspaces: memberships
      .filter((membership) => ACTING_ROLES.includes(membership.role))
      .map((membership) => ({
        id: membership.id,
        name: membership.name,
        slug: membership.slug,
        role: membership.role as StaffRole,
      })),
  }
}
