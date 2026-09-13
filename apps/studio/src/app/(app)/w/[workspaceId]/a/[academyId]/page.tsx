import type { Metadata } from 'next'
import Link from 'next/link'

import { CreateCourseForm } from '@/components/course/create-course-form'
import { listCourses, requireAcademyAccess } from '@/lib/studio-api'

export const metadata: Metadata = { title: 'Academy' }

type PageProps = {
  params: Promise<{ workspaceId: string; academyId: string }>
}

/**
 * An academy: its courses, draft and published alike.
 *
 * This is the authoring view, so it shows drafts — which is the whole difference
 * between it and the learner-facing catalogue. Nothing here is filtered by
 * `status`, because a course nobody has published is precisely what an operator
 * opens this page to find.
 */
export default async function AcademyPage({ params }: PageProps) {
  const { workspaceId, academyId } = await params

  const { academy } = await requireAcademyAccess(
    workspaceId,
    academyId,
    `/w/${workspaceId}/a/${academyId}`,
  )

  const courses = await listCourses(workspaceId, academyId)

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link href="/workspaces" className="hover:text-foreground">
          Workspaces
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/w/${workspaceId}`} className="hover:text-foreground">
          Workspace
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{academy.name}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight">{academy.name}</h1>
        <p className="text-muted-foreground text-sm">
          Learners reach this academy at <code>{academy.slug}</code>. Courses
          stay private until you publish them.
        </p>
      </header>

      {courses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No courses yet. Create the first one below.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/w/${workspaceId}/a/${academyId}/c/${course.id}`}
                className="border-border hover:border-primary/40 flex items-center justify-between gap-4 rounded-lg border px-6 py-4 transition-colors"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{course.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {course.slug}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs tracking-wide uppercase">
                  {course.status.toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateCourseForm workspaceId={workspaceId} academyId={academyId} />
    </main>
  )
}
