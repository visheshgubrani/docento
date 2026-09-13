'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  EllipsisVertical,
  Loader2,
  Plus,
  Search,
  BookOpen,
  LayoutGrid,
  List,
} from 'lucide-react'
import { IoSearch } from 'react-icons/io5'
import { FaFilter } from 'react-icons/fa'
import { BsImageAlt } from 'react-icons/bs'
import { CreateCourseModal } from '@/components/courses/create-course-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ImBooks } from 'react-icons/im'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { CourseSummary } from '@/lib/api'
import {
  useProjectCourses,
  useDeleteCourse,
  useToggleCoursePublishAction,
} from '@/lib/hooks/use-courses'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { useProject } from '@/lib/hooks/use-projects'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatPrice(value: number) {
  if (!value) {
    return 'Free'
  }
  return currencyFormatter.format(value)
}

function formatDate(date: string) {
  try {
    return dateFormatter.format(new Date(date))
  } catch {
    return 'N/A'
  }
}

type StatusFilter = 'all' | 'published' | 'draft'
type ViewMode = 'list' | 'grid'

export default function ProjectCoursesPage() {
  const projectId = useProjectRouteId()
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const deferredSearch = useDeferredValue(searchTerm)

  const { data: project, isLoading: isProjectLoading } = useProject(projectId)
  const {
    data: coursesData,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
    error: coursesError,
  } = useProjectCourses(projectId)

  const courses = coursesData ?? []

  // Compute counts for filters
  const filterCounts = useMemo(() => {
    return {
      all: courses.length,
      published: courses.filter((c) => c.isPublished).length,
      draft: courses.filter((c) => !c.isPublished).length,
    }
  }, [courses])

  // Client-side filtering (search + status)
  const filteredCourses = useMemo(() => {
    let filtered = courses

    // Apply status filter
    if (statusFilter === 'published') {
      filtered = filtered.filter((c) => c.isPublished)
    } else if (statusFilter === 'draft') {
      filtered = filtered.filter((c) => !c.isPublished)
    }

    // Apply search filter
    if (deferredSearch.trim()) {
      const search = deferredSearch.toLowerCase()
      filtered = filtered.filter((course) =>
        course.title.toLowerCase().includes(search),
      )
    }

    return filtered
  }, [courses, deferredSearch, statusFilter])

  const isFiltering = searchTerm !== deferredSearch

  if (!projectId) {
    return <div>Invalid project.</div>
  }

  return (
    <div className="space-y-10 bg-dashboard-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-6 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div>
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Courses
          </h2>
          <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
            Create and manage courses for your learners.
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex rounded-sm bg-accent hover:bg-accent/80 cursor-pointer items-center gap-2"
          disabled={!projectId}
        >
          <Plus className="size-5" />
          Create New Course
        </Button>
      </div>

      {/* Search Bar, Filter Tabs & View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {/* Search Bar - shorter */}
          <div className="w-full lg:w-80 xl:[28rem] 2xl:w-[32rem] rounded-md bg-white border border-sidebar/30">
            <div className="relative">
              <IoSearch className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-foreground/60" />
              <Input
                placeholder="Search courses..."
                className="pl-10 text-base rounded-md border-0 shadow-none placeholder:text-foreground/60 py-5.5"
                aria-label="Search courses"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              {isFiltering && (
                <Loader2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs & View Toggle Container - aligned to the right */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-5">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-muted-foreground/15 border border-sidebar/30 rounded-sm overflow-hidden">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
                statusFilter === 'all'
                  ? 'bg-white font-semibold text-foreground'
                  : 'text-foreground/80 hover:bg-muted/50',
              )}
            >
              All ({filterCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-l border-sidebar/30',
                statusFilter === 'published'
                  ? 'bg-white font-semibold text-foreground'
                  : 'text-foreground/80 hover:bg-muted/50',
              )}
            >
              Published ({filterCounts.published})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-l border-sidebar/30',
                statusFilter === 'draft'
                  ? 'bg-white font-semibold text-foreground'
                  : 'text-foreground/80 hover:bg-muted/50',
              )}
            >
              Draft ({filterCounts.draft})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-foreground/15 border border-sidebar/30 rounded-sm overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-[9px] transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-white font-semibold text-foreground'
                  : 'text-foreground/80 hover:bg-muted/50',
              )}
              aria-label="List view"
            >
              <List className="size-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-[9px] transition-colors cursor-pointer border-l border-sidebar/30',
                viewMode === 'grid'
                  ? 'bg-white font-semibold text-foreground'
                  : 'text-foreground/80 hover:bg-muted/50',
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="mt-8">
        {isCoursesError ? (
          <CourseErrorCard
            message={coursesError?.message ?? 'Unexpected error'}
          />
        ) : isCoursesLoading ? (
          <CourseTableSkeleton />
        ) : filteredCourses.length === 0 ? (
          courses.length === 0 ? (
            <CourseEmptyState
              projectName={project?.name}
              onCreateCourse={() => setCreateModalOpen(true)}
            />
          ) : (
            <NoSearchResults searchTerm={searchTerm} />
          )
        ) : viewMode === 'list' ? (
          <CourseTable courses={filteredCourses} projectId={projectId} />
        ) : (
          <CourseGrid courses={filteredCourses} projectId={projectId} />
        )}
      </div>

      <CreateCourseModal
        projectId={projectId}
        open={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  )
}

function CourseErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="py-6">
        <p className="font-semibold text-foreground">Unable to load courses</p>
        <p className="text-sm text-destructive">{message}</p>
      </CardContent>
    </Card>
  )
}

function CourseTable({
  courses,
  projectId,
}: {
  courses: CourseSummary[]
  projectId: string
}) {
  return (
    <div className="rounded-sm border border-muted-foreground/30 overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-[120px_minmax(240px,1fr)_120px_100px_90px_150px_100px_80px] gap-4 px-4 py-4 bg-white text-xs font-semibold uppercase tracking-wide text-foreground/80">
        <div>Thumbnail</div>
        <div>Name</div>
        <div className=" text-center">Created</div>
        <div className=" text-center">Lessons</div>
        <div className=" text-center">Price</div>
        <div className=" text-center">Enrollments</div>
        <div className=" text-center">Status</div>
        <div className=" text-center">Actions</div>
      </div>
      <Separator />

      {/* Table Body */}
      <div className="divide-y divide-muted-foreground/30">
        {courses.map((course) => (
          <CourseRow key={course.id} course={course} projectId={projectId} />
        ))}
      </div>
    </div>
  )
}

function CourseThumbnail({
  thumbnail,
  title,
  className,
}: {
  thumbnail: string | null | undefined
  title: string
  className?: string
}) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  if (!thumbnail || hasError) {
    return (
      <div
        className={cn(
          'w-24 aspect-video rounded-xs bg-muted/50 flex items-center justify-center overflow-hidden',
          className,
        )}
      >
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-100/80 to-accent-200/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/icons/image.svg"
            alt="Video course"
            className="aspect-video size-12 opacity-65"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-24 aspect-video rounded-xs bg-muted/50 flex items-center justify-center overflow-hidden relative',
        className,
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-sidebar/70 border border-muted-foreground rounded-xs z-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnail}
        alt={title}
        className="object-cover w-full h-full"
        onError={() => setHasError(true)}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}

function CourseRow({
  course,
  projectId,
}: {
  course: CourseSummary
  projectId: string
}) {
  const enrollments = course._count?.enrollments ?? 0
  const lessonsCount = course._count?.lessons ?? 0
  const createdAt = formatDate(course.createdAt)
  const builderHref = `/p/${projectId}/courses/${course.id}/information`

  return (
    <div className="group">
      {/* Desktop Row */}
      <div className="hidden md:grid md:grid-cols-[120px_minmax(240px,1fr)_120px_100px_90px_150px_100px_80px] gap-4 px-4 py-3 items-center hover:bg-muted bg-neutral-50 transition-colors">
        {/* Thumbnail */}
        <CourseThumbnail thumbnail={course.thumbnail} title={course.title} />

        {/* Name */}
        <div className="min-w-0">
          <Link
            href={builderHref}
            className="font-medium tracking-wide text-base underline text-foreground hover:text-accent hover:underline truncate block"
          >
            {course.title}
          </Link>
          {course.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {course.description}
            </p>
          )}
        </div>

        {/* Created Date */}
        <div className="text-sm text-foreground/75 text-center">
          {createdAt}
        </div>

        {/* Lessons Count */}
        <div className="text-sm text-center font-medium ">{lessonsCount}</div>

        {/* Price */}
        <div className="text-sm font-medium text-center">
          {formatPrice(course.price)}
        </div>

        {/* Enrollments */}
        <div className="text-sm text-center font-medium">{enrollments}</div>

        {/* Status */}
        <div className="text-center">
          <Badge
            variant={course.isPublished ? 'default' : 'secondary'}
            className={cn(
              course.isPublished
                ? 'bg-accent-foreground/40 text-foreground/80'
                : 'bg-muted-foreground text-white',
            )}
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>

        {/* Actions */}
        <div className="text-center">
          <CourseActions course={course} projectId={projectId} />
        </div>
      </div>

      {/* Mobile Card */}
      <div className="md:hidden p-4 bg-neutral-50 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CourseThumbnail
            thumbnail={course.thumbnail}
            title={course.title}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <Link
              href={builderHref}
              className="font-medium text-lg text-foreground hover:text-primary whitespace-nowrap underline"
            >
              {course.title}
            </Link>
            <p className="text-xs text-foreground/50 whitespace-nowrap">
              {createdAt}
            </p>
          </div>
          <div className="shrink-0 self-start">
            <CourseActions course={course} projectId={projectId} />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">
            {formatPrice(course.price)} · {enrollments} enrolled
          </span>
          <Badge
            variant={course.isPublished ? 'default' : 'secondary'}
            className={cn(
              course.isPublished
                ? 'bg-accent-foreground/40 text-foreground/80'
                : 'bg-muted-foreground text-white',
            )}
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function CourseGrid({
  courses,
  projectId,
}: {
  courses: CourseSummary[]
  projectId: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} projectId={projectId} />
      ))}
    </div>
  )
}

function CourseCard({
  course,
  projectId,
}: {
  course: CourseSummary
  projectId: string
}) {
  const enrollments = course._count?.enrollments ?? 0
  const lessonsCount = course._count?.lessons ?? 0
  const builderHref = `/p/${projectId}/courses/${course.id}/information`

  return (
    <Card className="group rounded-lg overflow-hidden border border-gray-200 bg-white hover:shadow-xl hover:border-gray-300 ease-in-out transition-all duration-300">
      {/* Thumbnail with Status Badge and Actions */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <CourseCardThumbnail
          thumbnail={course.thumbnail}
          title={course.title}
        />
        {/* Status Badge - Top Left */}
        <div className="absolute group top-3 left-3">
          <Badge
            variant={course.isPublished ? 'default' : 'secondary'}
            className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-full shadow-md',
              course.isPublished
                ? 'bg-accent-600 group-hover:bg-accent-700 text-white border-0'
                : 'bg-gray-500 hover:bg-gray-600 text-white border-0',
            )}
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
        {/* Actions - Top Right */}
        <div className="absolute top-3 right-3">
          <div className="rounded-full bg-white/90 backdrop-blur-sm shadow-md">
            <CourseActions course={course} projectId={projectId} />
          </div>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Course Title */}
        <Link
          href={builderHref}
          className="font-semibold text-lg text-gray-900 hover:text-violet-600 transition-colors line-clamp-2 block mb-2"
        >
          {course.title}
        </Link>

        {/* Course Description */}
        {course.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {course.description}
          </p>
        )}

        {/* Course Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="font-bold text-lg text-gray-900">
            {formatPrice(course.price)}
          </span>
          <span className="text-sm text-gray-500">
            {lessonsCount} {lessonsCount === 1 ? 'lesson' : 'lessons'}
          </span>
          <span className="text-sm text-gray-500 flex items-center gap-1.5">
            <BookOpen className="size-4" />
            {enrollments} enrolled
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function CourseCardThumbnail({
  thumbnail,
  title,
}: {
  thumbnail: string | null | undefined
  title: string
}) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  if (!thumbnail || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-50 to-accent-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/icons/image.svg"
          alt="Video course"
          className="aspect-video opacity-60"
        />
      </div>
    )
  }
  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnail}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={() => setHasError(true)}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}

function CourseActions({
  course,
  projectId,
}: {
  course: CourseSummary
  projectId: string
}) {
  const { toast } = useToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { mutateAsync: deleteCourse, isPending: isDeleting } =
    useDeleteCourse(projectId)
  const { mutateAsync: togglePublish, isPending: isToggling } =
    useToggleCoursePublishAction(projectId)

  const handlePublish = async () => {
    try {
      await togglePublish(course.id)
      toast({
        title: course.isPublished ? 'Course unpublished' : 'Course published',
        description: `"${course.title}" has been ${
          course.isPublished ? 'unpublished' : 'published'
        } successfully.`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${
          course.isPublished ? 'unpublish' : 'publish'
        } course. Please try again.`,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteCourse(course.id)
      toast({
        title: 'Course deleted',
        description: `"${course.title}" has been deleted successfully.`,
      })
      setShowDeleteDialog(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete course. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted cursor-pointer place-self-end w-full"
          >
            <EllipsisVertical className="size-5.5" />
            <span className="sr-only">Open actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="rounded-sm divide-y divide-border p-1.5 mr-6"
        >
          <DropdownMenuItem asChild className="hover:bg-muted cursor-pointer">
            <Link href={`/p/${projectId}/courses/${course.id}/information`}>
              Edit Course
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handlePublish}
            className="hover:bg-muted cursor-pointer"
            disabled={isToggling}
          >
            {isToggling
              ? 'Processing...'
              : course.isPublished
                ? 'Unpublish Course'
                : 'Publish Course'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive hover:bg-muted cursor-pointer"
          >
            Delete Course
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription className="text-foreground/60">
              Are you sure you want to delete <strong>"{course.title}"</strong>?
              This action cannot be undone. All modules, lessons, and
              enrollments associated with this course will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white cursor-pointer"
            >
              {isDeleting ? 'Deleting...' : 'Delete Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CourseTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header Skeleton */}
      <div className="hidden md:grid md:grid-cols-[100px_1fr_110px_80px_80px_110px_100px_80px] gap-4 px-4 py-3 bg-neutral-200/30">
        <div className="h-3 w-16 rounded bg-neutral-200 animate-pulse" />
        <div className="h-3 w-12 rounded bg-neutral-200 animate-pulse" />
        <div className="h-3 w-14 rounded bg-neutral-200 animate-pulse" />
        <div className="h-3 w-10 rounded bg-neutral-200 animate-pulse mx-auto" />
        <div className="h-3 w-10 rounded bg-neutral-200 animate-pulse" />
        <div className="h-3 w-16 rounded bg-neutral-200 animate-pulse mx-auto" />
        <div className="h-3 w-12 rounded bg-neutral-200 animate-pulse" />
        <div />
      </div>

      {/* Row Skeletons */}
      <div className="divide-y divide-border">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="hidden md:grid md:grid-cols-[100px_1fr_110px_80px_80px_110px_100px_80px] gap-4 px-4 py-3 items-center"
          >
            <div className="h-12 w-16 rounded-md bg-neutral-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-neutral-200 animate-pulse" />
              <div className="h-3 w-32 rounded bg-neutral-200 animate-pulse" />
            </div>
            <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
            <div className="h-3 w-8 rounded bg-neutral-200 animate-pulse mx-auto" />
            <div className="h-3 w-10 rounded bg-neutral-200 animate-pulse" />
            <div className="h-3 w-8 rounded bg-neutral-200 animate-pulse mx-auto" />
            <div className="h-5 w-16 rounded-full bg-neutral-200 animate-pulse" />
            <div className="h-8 w-8 rounded bg-neutral-200 animate-pulse" />
          </div>
        ))}

        {/* Mobile Skeletons */}
        {[0, 1, 2].map((item) => (
          <div key={`mobile-${item}`} className="md:hidden p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-12 w-16 rounded-md bg-neutral-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
                <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
              </div>
              <div className="h-8 w-8 rounded bg-neutral-200 animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-neutral-200 animate-pulse" />
              <div className="h-5 w-14 rounded-full bg-neutral-200 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CourseEmptyState({
  projectName,
  onCreateCourse,
}: {
  projectName?: string
  onCreateCourse: () => void
}) {
  return (
    <div className="flex w-full bg-white rounded-lg flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-sm bg-muted/50 flex items-center justify-center mb-4">
        <ImBooks className="size-12 text-foreground/70" />
      </div>
      <h3 className="text-2xl font-semibold text-foreground mb-1">
        No courses yet
      </h3>
      <p className="text-sm text-foreground/60 mt-1 text-center max-w-sm mb-6">
        {projectName
          ? `Start creating courses for ${projectName}. Build engaging content for your learners.`
          : 'Get started by creating your first course. Build engaging content for your learners.'}
      </p>
      <Button
        onClick={onCreateCourse}
        className="gap-2 rounded-sm bg-accent border-2 border-violet-800/50 cursor-pointer hover:bg-accent/90"
      >
        <Plus className="size-5" />
        Create Your First Course
      </Button>
    </div>
  )
}

function NoSearchResults({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="h-12 w-12 rounded-sm bg-muted/50 flex items-center justify-center mb-2">
        <IoSearch className="size-8 text-foreground/70" />
      </div>
      <h3 className="text-xl font-medium text-foreground mb-1">
        No courses found
      </h3>
      <p className="text-sm text-foreground/60 text-center">
        No courses match "{searchTerm}". Try a different search term.
      </p>
    </div>
  )
}
