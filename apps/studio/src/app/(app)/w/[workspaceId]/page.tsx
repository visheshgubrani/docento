import type { Metadata } from 'next'
import Link from 'next/link'

import { CreateAcademyForm } from '@/components/workspace/create-academy-form'
import { listAcademies, requireWorkspaceAccess } from '@/lib/studio-api'

export const metadata: Metadata = { title: 'Workspace' }

type PageProps = { params: Promise<{ workspaceId: string }> }

/**
 * A workspace: the academies inside it.
 *
 * ## Why the workspace is in the URL and in a header
 *
 * The path says which workspace the operator is looking at, and `requireWorkspaceAccess`
 * confirms the session may enter it — from the memberships the API returned, so
 * the check is the API's and not a second one written here. Every write below
 * then carries the same id in `x-workspace-id`, which the API re-checks against
 * the membership table. A path segment the operator edits therefore produces a
 * refusal rather than a write in somebody else's workspace.
 */
export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = await params

  const { workspace } = await requireWorkspaceAccess(
    workspaceId,
    `/w/${workspaceId}`,
  )

  const academies = await listAcademies(workspaceId)

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link href="/workspaces" className="hover:text-foreground">
          Workspaces
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{workspace.name}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">
          {workspace.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          An academy is a brand learners sign in to. One workspace can run
          several — each with its own catalogue, learners and domain.
        </p>
      </header>

      {academies.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No academies yet. Create the first one below.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {academies.map((academy) => (
            <li key={academy.id}>
              <Link
                href={`/w/${workspaceId}/a/${academy.id}`}
                className="border-border hover:border-primary/40 flex items-center justify-between gap-4 rounded-lg border px-6 py-4 transition-colors"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{academy.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {academy.slug}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs tracking-wide uppercase">
                  {academy.authMode.toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateAcademyForm workspaceId={workspaceId} />
    </main>
  )
}
