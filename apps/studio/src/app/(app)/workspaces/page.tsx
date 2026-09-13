import type { Metadata } from 'next'
import Link from 'next/link'

import { CreateWorkspaceForm } from '@/components/workspace/create-workspace-form'
import { requireStaffSession } from '@/lib/studio-api'

export const metadata: Metadata = { title: 'Workspaces' }

/**
 * The workspace chooser.
 *
 * ## Why this page exists rather than a redirect
 *
 * A workspace is the tenant and the isolation boundary, and a staff identity
 * spans workspaces because consultants and agencies work across clients. So
 * "which workspace" is a real question with more than one answer, and a page
 * that silently picked the first would hide a workspace somebody belongs to.
 *
 * ## The list comes from the session, not from `workspace.list`
 *
 * They answer different questions. `workspace.list` is scoped to a workspace
 * already chosen and refuses a caller who has not chosen one; this page is what
 * runs *before* that choice exists. `staff.session` is the operation written for
 * that state, and it already carries the names and roles this page draws.
 *
 * An empty list is the normal state for a new account, so it is rendered as the
 * next step rather than as an absence.
 */
export default async function WorkspacesPage() {
  const session = await requireStaffSession('/workspaces')

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">
          Your workspaces
        </h1>
        <p className="text-muted-foreground text-sm">
          A workspace holds your academies, your team, and your provider
          connections. A workspace can run several academies — that is how one
          business runs more than one brand without duplicating learners.
        </p>
      </header>

      {session.workspaces.length === 0 ? (
        <CreateWorkspaceForm />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {session.workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href={`/w/${workspace.id}`}
                  className="border-border hover:border-primary/40 flex items-center justify-between gap-4 rounded-lg border px-6 py-4 transition-colors"
                >
                  <span className="font-medium">{workspace.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {workspace.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <details className="text-sm">
            <summary className="cursor-pointer">
              Create another workspace
            </summary>
            <div className="pt-4">
              <CreateWorkspaceForm />
            </div>
          </details>
        </>
      )}
    </main>
  )
}
