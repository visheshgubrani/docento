import type { Metadata } from 'next'
import Link from 'next/link'

import { ModuleList } from '@/components/course/module-list'
import { PublishCourseButton } from '@/components/course/publish-course-button'
import { requireCourseAccess } from '@/lib/studio-api'

export const metadata: Metadata = { title: 'Course' }

type PageProps = {
  params: Promise<{ workspaceId: string; academyId: string; courseId: string }>
}

/**
 * A course's draft, and the button that turns it into a release.
 *
 * ## The draft and the release are shown as two different things
 *
 * What is edited here is the draft. Publishing copies it into an immutable
 * release, and a learner sees the newest release rather than this — so the page
 * says which version is live and does not imply that an edit has reached anyone
 * yet. Conflating the two is how an operator comes to believe a typo was fixed
 * for learners when it was only fixed for them.
 */
export default async function CoursePage({ params }: PageProps) {
  const { workspaceId, academyId, courseId } = await params

  const { course, modules, release } = await requireCourseAccess(
    workspaceId,
    academyId,
    courseId,
    `/w/${workspaceId}/a/${academyId}/c/${courseId}`,
  )

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
        <Link
          href={`/w/${workspaceId}/a/${academyId}`}
          className="hover:text-foreground"
        >
          Academy
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{course.title}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl tracking-tight">
            {course.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {release
              ? `Version ${release.version} is live — published ${release.publishedAt.toLocaleDateString()}.`
              : 'Not published yet. Nothing here is visible to learners.'}
          </p>
        </div>

        <PublishCourseButton
          workspaceId={workspaceId}
          academyId={academyId}
          courseId={courseId}
        />
      </header>

      <ModuleList
        workspaceId={workspaceId}
        academyId={academyId}
        courseId={courseId}
        modules={modules}
      />
    </main>
  )
}
