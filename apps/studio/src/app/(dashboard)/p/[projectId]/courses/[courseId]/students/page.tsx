'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import {
  ChevronDown,
  Copy,
  EllipsisVertical,
  Loader2,
  Search,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import type { CourseEnrollment } from '@/lib/api'
import { downloadCsv, type CsvColumn } from '@/lib/csv-export'
import { useCourseEnrollments } from '@/lib/hooks/use-course-enrollments'
import { downloadPdfReport } from '@/lib/pdf-export'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { FaUserGraduate } from 'react-icons/fa6'
import { IoMdDownload } from 'react-icons/io'
import { useParams } from 'next/navigation'

const lastActiveFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatLastActive(timestamp?: string | null) {
  if (!timestamp) return 'Not tracked'
  try {
    return lastActiveFormatter.format(new Date(timestamp))
  } catch {
    return 'Not tracked'
  }
}

function getDisplayName(enrollment: CourseEnrollment) {
  return (
    enrollment.endUser?.managedUser?.name?.trim() ||
    enrollment.endUser?.email ||
    enrollment.endUser?.externalId ||
    'Unnamed user'
  )
}

function getContact(enrollment: CourseEnrollment) {
  return (
    enrollment.endUser?.email ||
    enrollment.endUser?.externalId ||
    'Not provided'
  )
}

function getInitials(text: string) {
  const [first, second] = text.trim().split(' ')
  return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase() || 'ST'
}

function truncateId(id: string) {
  return id.length > 10 ? `${id.slice(0, 7)}...` : id
}

function StudentTableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((item) => (
        <TableRow key={item}>
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-right">
            <div className="ml-auto h-8 w-16 rounded bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function CourseStudentsPage() {
  const projectId = useProjectRouteId()
  const params = useParams()
  const courseId = params.courseId as string
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [downloadingFormat, setDownloadingFormat] = useState<
    'pdf' | 'csv' | null
  >(null)
  const deferredSearch = useDeferredValue(searchTerm)

  const {
    data: enrollmentsData,
    isLoading: isEnrollmentsLoading,
    isFetching: isEnrollmentsFetching,
    isError: isEnrollmentsError,
    error: enrollmentsError,
    refetch,
  } = useCourseEnrollments(projectId, courseId, {
    page: 1,
    limit: 50,
    status: 'active',
  })

  const enrollments = useMemo(
    () => enrollmentsData?.enrollments ?? [],
    [enrollmentsData?.enrollments],
  )
  const enrollmentCount =
    enrollmentsData?.pagination?.total ?? enrollments.length

  // Filter enrollments by search term on client-side
  const filteredEnrollments = useMemo(() => {
    if (!deferredSearch.trim()) return enrollments
    const searchLower = deferredSearch.toLowerCase()
    return enrollments.filter((enrollment) => {
      const name = enrollment.endUser?.managedUser?.name?.toLowerCase() || ''
      const email = enrollment.endUser?.email?.toLowerCase() || ''
      const externalId = enrollment.endUser?.externalId?.toLowerCase() || ''
      return (
        name.includes(searchLower) ||
        email.includes(searchLower) ||
        externalId.includes(searchLower)
      )
    })
  }, [enrollments, deferredSearch])

  const displayCount = deferredSearch.trim()
    ? filteredEnrollments.length
    : enrollmentCount
  const exportRows = filteredEnrollments.map((enrollment) => {
    const lastActive =
      enrollment.endUser?.delegatedUser?.lastSeenAt ?? enrollment.enrolledAt

    return {
      name: getDisplayName(enrollment),
      contact: getContact(enrollment),
      userId: enrollment.endUser.id,
      progress: `${enrollment.progress}%`,
      enrolledAt: formatLastActive(enrollment.enrolledAt),
      lastActive: formatLastActive(lastActive),
    }
  })

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast({
        title: 'ID copied',
        description: 'User ID copied to clipboard.',
      })
    } catch {
      toast({
        title: 'Unable to copy ID',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = async (format: 'pdf' | 'csv') => {
    if (filteredEnrollments.length === 0) {
      toast({
        title: 'No students to export',
        description: 'Enroll students or adjust your search first.',
        variant: 'destructive',
      })
      return
    }

    setDownloadingFormat(format)

    try {
      if (format === 'pdf') {
        await downloadPdfReport({
          title: 'Course Students',
          subtitle: `${filteredEnrollments.length} student${
            filteredEnrollments.length === 1 ? '' : 's'
          } exported`,
          filename: `course-${courseId}-students.pdf`,
          columns: [
            { key: 'name', label: 'Student', weight: 1.4 },
            { key: 'contact', label: 'Contact', weight: 1.5 },
            { key: 'userId', label: 'User ID', weight: 1.2 },
            {
              key: 'progress',
              label: 'Progress',
              weight: 0.8,
              align: 'center',
            },
            {
              key: 'enrolledAt',
              label: 'Enrolled',
              weight: 1.2,
              align: 'right',
            },
            {
              key: 'lastActive',
              label: 'Last Active',
              weight: 1.2,
              align: 'right',
            },
          ],
          rows: exportRows,
        })

        toast({
          title: 'Students downloaded',
          description: 'Your PDF export is ready.',
        })
        return
      }

      downloadCsv(`${courseId}-students.csv`, exportRows, [
        { label: 'Student', value: (row) => row.name },
        { label: 'Contact', value: (row) => row.contact },
        { label: 'User ID', value: (row) => row.userId },
        { label: 'Progress', value: (row) => row.progress },
        { label: 'Enrolled', value: (row) => row.enrolledAt },
        { label: 'Last Active', value: (row) => row.lastActive },
      ])

      toast({
        title: 'Students downloaded',
        description: 'Your CSV export is ready.',
      })
    } catch (error) {
      toast({
        title: 'Unable to download students',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingFormat(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <h2 className="text-3xl font-semibold font-literata tracking-wide">
          Students
        </h2>
        <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
          View and manage students enrolled in this course.
        </p>
      </div>

      {/* Search Bar and Download Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students by email, name or external ID..."
            className="pl-11 h-12 text-base bg-background border-neutral-300 rounded-xs shadow-none"
            aria-label="Filter students"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {isEnrollmentsFetching && !isEnrollmentsLoading ? (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 h-12 px-5 rounded-xs font-medium shrink-0 hover:text-foreground cursor-pointer"
              disabled={downloadingFormat !== null}
            >
              {downloadingFormat ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <IoMdDownload className="size-5" />
              )}
              {downloadingFormat
                ? `Downloading ${
                    downloadingFormat === 'pdf' ? 'PDF' : 'CSV'
                  }...`
                : 'Download'}
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={downloadingFormat !== null}
              onClick={() => handleDownload('pdf')}
            >
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={downloadingFormat !== null}
              onClick={() => handleDownload('csv')}
            >
              Download CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Student Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground/80">
          {isEnrollmentsLoading
            ? 'Loading students...'
            : displayCount === 1
              ? 'Showing 1 student'
              : `Showing ${displayCount} students`}
        </p>
        {isEnrollmentsFetching && !isEnrollmentsLoading && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing
          </span>
        )}
      </div>

      {/* Students Table */}
      {isEnrollmentsLoading ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-neutral-200">
                <TableHead className="text-foreground/90 font-medium pl-4">
                  Student
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  User ID
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Last Active
                </TableHead>
                <TableHead className="text-right text-foreground/90 font-medium pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <StudentTableSkeleton />
            </TableBody>
          </Table>
        </div>
      ) : isEnrollmentsError ? (
        <div className="rounded-lg border border-neutral-200 bg-background p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                Unable to load students
              </p>
              <p className="text-sm text-muted-foreground">
                {enrollmentsError?.message ?? 'Please try again in a moment.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="w-full bg-background rounded-sm border border-neutral-200 py-16 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted-foreground/20 p-5 mb-5">
              <FaUserGraduate className="h-12 w-12 text-foreground/60" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No enrolled students yet
            </h3>
            <p className="text-lg text-foreground/70 max-w-sm">
              {searchTerm
                ? `No students match "${searchTerm}". Try a different search term.`
                : 'Students will appear here once they enroll in this course.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-neutral-200">
                <TableHead className="text-foreground/90 font-medium pl-4">
                  Student
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  User ID
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Last Active
                </TableHead>
                <TableHead className="text-right text-foreground/90 font-medium pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments.map((enrollment) => {
                const displayName = getDisplayName(enrollment)
                const contact = getContact(enrollment)
                const lastActive =
                  enrollment.endUser?.delegatedUser?.lastSeenAt ??
                  enrollment.enrolledAt

                return (
                  <TableRow
                    key={enrollment.id}
                    className="border-b border-neutral-100 hover:bg-muted/70"
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-muted text-foreground/70">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {displayName}
                          </span>
                          <span className="text-sm text-foreground/60">
                            {contact}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground/80">
                          {truncateId(enrollment.endUser.id)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => copyId(enrollment.endUser.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground/60">
                      {formatLastActive(lastActive)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <EllipsisVertical className="size-5" />
                            <span className="sr-only">Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyId(enrollment.endUser.id)}
                            className="hover:bg-muted"
                          >
                            Copy ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
