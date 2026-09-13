'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Eye, Loader2, Search } from 'lucide-react'
import { MdAssignment } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  fetchCourseEnrollments,
  getAssignment,
  listAssignmentSubmissions,
  type CourseDetail,
} from '@/lib/api'
import { useCourse } from '@/lib/hooks/use-courses'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'

type AssignmentLessonContext = {
  moduleId: string
  moduleOrder: number
  moduleTitle: string
  lessonId: string
  lessonOrder: number
  lessonTitle: string
}

type AssignmentDirectoryRow = AssignmentLessonContext & {
  assignmentId: string
  assignmentTitle: string
  submissionsCount: number
  pendingReviewCount: number
}

type AssignmentDirectoryData = {
  rows: AssignmentDirectoryRow[]
  enrolledTotal: number
}

function getAssignmentLessonContexts(
  course: CourseDetail,
): AssignmentLessonContext[] {
  return course.modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((module) =>
      module.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((lesson) => lesson.contentType === 'ASSIGNMENT')
        .map((lesson) => ({
          moduleId: module.id,
          moduleOrder: module.order,
          moduleTitle: module.title,
          lessonId: lesson.id,
          lessonOrder: lesson.order,
          lessonTitle: lesson.title,
        })),
    )
}

function DirectoryTableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((item) => (
        <TableRow key={item}>
          <TableCell>
            <div className="h-3 w-52 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="mx-auto h-3 w-16 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="mx-auto h-7 w-14 rounded-full bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-center">
            <div className="mx-auto h-8 w-20 rounded bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function getModuleLabel(moduleOrder: number, moduleTitle: string) {
  if (moduleTitle?.trim()) {
    return moduleTitle
  }
  return `Module ${moduleOrder + 1}`
}

function truncateWords(value: string, maxWords: number) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return ''

  const words = normalized.split(' ')
  if (words.length <= maxWords) return normalized
  return `${words.slice(0, maxWords).join(' ')}...`
}

function getAssignmentTitleLabel(title: string) {
  const withoutSuffix = title.trim().replace(/\s+assignment$/i, '')
  return truncateWords(withoutSuffix || title, 3)
}

export default function CourseAssignmentsDirectoryPage() {
  const params = useParams()
  const projectId = useProjectRouteId()
  const [searchQuery, setSearchQuery] = useState('')
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
  const { data: course, isLoading: isCourseLoading } = useCourse(
    projectId,
    courseId,
  )

  const {
    data: directoryData,
    isLoading: isDirectoryLoading,
    isFetching: isDirectoryFetching,
    isError: isDirectoryError,
    error: directoryError,
    refetch,
  } = useQuery<AssignmentDirectoryData, Error>({
    queryKey: [
      'course-assignments-directory',
      projectId,
      courseId,
      course?.updatedAt,
    ],
    enabled: Boolean(projectId && courseId && course),
    queryFn: async () => {
      if (!course) {
        return { rows: [], enrolledTotal: 0 }
      }

      const contexts = getAssignmentLessonContexts(course)
      if (contexts.length === 0) {
        return { rows: [], enrolledTotal: 0 }
      }

      const enrollmentList = await fetchCourseEnrollments(projectId, courseId, {
        page: 1,
        limit: 1,
        status: 'active',
      })
      const enrolledTotal =
        enrollmentList.pagination?.total ?? enrollmentList.enrollments.length

      const rows = (
        await Promise.all(
          contexts.map(async (context) => {
            const assignment = await getAssignment(
              projectId,
              courseId,
              context.moduleId,
              context.lessonId,
            )

            if (!assignment) {
              return null
            }

            const submissionsCount = assignment._count?.submissions ?? 0
            let pendingReviewCount = 0

            if (submissionsCount > 0) {
              const ungraded = await listAssignmentSubmissions(
                projectId,
                courseId,
                context.moduleId,
                context.lessonId,
                'ungraded',
              )
              pendingReviewCount = ungraded.total
            }

            return {
              ...context,
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              submissionsCount,
              pendingReviewCount,
            } satisfies AssignmentDirectoryRow
          }),
        )
      )
        .filter((row): row is AssignmentDirectoryRow => Boolean(row))
        .sort((a, b) => {
          if (a.moduleOrder !== b.moduleOrder) {
            return a.moduleOrder - b.moduleOrder
          }
          return a.lessonOrder - b.lessonOrder
        })

      return {
        rows,
        enrolledTotal,
      }
    },
  })

  const rows = useMemo(() => directoryData?.rows ?? [], [directoryData?.rows])
  const enrolledTotal = directoryData?.enrolledTotal ?? 0
  const isLoading = isCourseLoading || isDirectoryLoading
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredRows = useMemo(() => {
    if (!normalizedSearch) {
      return rows
    }

    return rows.filter((row) => {
      const moduleLabel = getModuleLabel(row.moduleOrder, row.moduleTitle)
      return [row.assignmentTitle, row.lessonTitle, moduleLabel].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      )
    })
  }, [rows, normalizedSearch])
  const hasNoData = rows.length === 0
  const hasNoMatches =
    !isLoading && rows.length > 0 && filteredRows.length === 0

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <h2 className="text-3xl font-semibold font-literata tracking-wide">
          Assignments
        </h2>
        <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
          Track submission health for every assignment in this course.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 items-start justify-end place-self-end">
          <p className="text-sm font-medium place-self-end text-foreground/80">
            {isLoading
              ? 'Loading assignments...'
              : normalizedSearch
                ? `Showing ${filteredRows.length} of ${rows.length} assignments`
                : rows.length === 1
                  ? 'Showing 1 assignment'
                  : `Showing ${rows.length} assignments`}
          </p>
          {isDirectoryFetching && !isLoading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4.5 mt-0.5 animate-spin" />
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72 md:w-80 lg:w-90 xl:w-100">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search assignments"
              className="h-10 rounded-sm shadow-none border border-muted-foreground/50 bg-white pl-9"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-neutral-200 bg-background p-4 space-y-3"
              >
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-16 rounded bg-muted animate-pulse" />
                  <div className="h-16 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-9 w-20 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 bg-background md:block">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="bg-muted/80 border-b border-neutral-200">
                  <TableHead className="text-foreground/90 font-semibold pl-4">
                    Assignment Title
                  </TableHead>
                  <TableHead className="text-foreground/90 font-semibold">
                    Lesson
                  </TableHead>
                  <TableHead className="text-foreground/90 font-semibold">
                    Module
                  </TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold">
                    Submissions
                  </TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold">
                    Pending Review
                  </TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold pr-4">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <DirectoryTableSkeleton />
              </TableBody>
            </Table>
          </div>
        </div>
      ) : isDirectoryError ? (
        <div className="rounded-lg border border-neutral-200 bg-background p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                Unable to load assignments
              </p>
              <p className="text-sm text-muted-foreground">
                {directoryError?.message ?? 'Please try again in a moment.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : hasNoData ? (
        <div className="w-full bg-background rounded-sm border border-neutral-200 py-16 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted-foreground/20 p-5 mb-5">
              <MdAssignment className="h-12 w-12 text-foreground/70" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No assignments created yet
            </h3>
            <p className="text-lg text-foreground/70 max-w-md">
              Create assignment lessons in the curriculum to start tracking
              submissions and reviews.
            </p>
          </div>
        </div>
      ) : hasNoMatches ? (
        <div className="w-full bg-background rounded-sm border border-neutral-200 py-12 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No matching assignments
            </h3>
            <p className="text-base text-foreground/70 max-w-md">
              Try searching by assignment title, lesson name, or module name.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {filteredRows.map((row) => (
              <div
                key={row.assignmentId}
                className="rounded-lg border border-neutral-200 bg-background p-4 space-y-3"
              >
                <p className="font-medium text-foreground">
                  {getAssignmentTitleLabel(row.assignmentTitle)}
                </p>
                <p className="text-sm text-foreground/75">
                  Lesson: {truncateWords(row.lessonTitle, 3)}
                </p>
                <p className="text-sm text-foreground/75">
                  Module:{' '}
                  {truncateWords(
                    getModuleLabel(row.moduleOrder, row.moduleTitle),
                    3,
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-neutral-200 bg-muted/40 px-3 py-2 text-center">
                    <p className="text-xs text-foreground/70">Submissions</p>
                    <p className="text-sm font-medium text-foreground">
                      {row.submissionsCount} / {enrolledTotal}
                    </p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                    <p className="text-xs text-amber-800/80">Pending Review</p>
                    <p className="text-sm font-semibold text-amber-800">
                      {row.pendingReviewCount}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 px-3 font-medium hover:text-foreground"
                >
                  <Link
                    href={`/p/${projectId}/courses/${courseId}/assignments/${row.moduleId}/${row.lessonId}`}
                  >
                    <Eye className="size-4" />
                    View
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 bg-background md:block">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="bg-muted/80 border-b border-neutral-200">
                  <TableHead className="text-foreground/90 font-semibold pl-4">
                    Assignment Title
                  </TableHead>
                  <TableHead className="text-foreground/90 font-semibold">
                    Lesson
                  </TableHead>
                  <TableHead className="text-foreground/90 font-semibold">
                    Module
                  </TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold">
                    Submissions
                  </TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold">
                    Pending Review
                  </TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold pr-4">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.assignmentId}
                    className="border-b border-neutral-200 hover:bg-muted/70"
                  >
                    <TableCell className="pl-4">
                      <span className="font-medium text-foreground">
                        {getAssignmentTitleLabel(row.assignmentTitle)}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {truncateWords(row.lessonTitle, 3)}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {truncateWords(
                        getModuleLabel(row.moduleOrder, row.moduleTitle),
                        3,
                      )}
                    </TableCell>
                    <TableCell className="text-center text-foreground/90">
                      {row.submissionsCount} / {enrolledTotal}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        {row.pendingReviewCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1.5 px-3 hover:text-foreground"
                      >
                        <Link
                          href={`/p/${projectId}/courses/${courseId}/assignments/${row.moduleId}/${row.lessonId}`}
                        >
                          <Eye className="size-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
