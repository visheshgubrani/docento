'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import {
  ChevronDown,
  Copy,
  EllipsisVertical,
  Loader2,
  Search,
} from 'lucide-react'

import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import type { EndUser, EndUserStatus } from '@/lib/api'
import { downloadExcelFile } from '@/lib/excel-export'
import {
  useProjectEndUsers,
  useCreateEndUser,
  useUpdateEndUserStatus,
} from '@/lib/hooks/use-end-users'
import { downloadPdfReport } from '@/lib/pdf-export'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { useProject } from '@/lib/hooks/use-projects'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { FaUserGraduate } from 'react-icons/fa6'
import { TiUserAdd } from 'react-icons/ti'
import { IoMdDownload } from 'react-icons/io'
import * as z from 'zod'

const lastActiveFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatStatusLabel(status: EndUserStatus) {
  return status === 'BANNED' ? 'Banned' : 'Active'
}

function formatLastActive(timestamp?: string | null) {
  if (!timestamp) return 'Not tracked'
  try {
    return lastActiveFormatter.format(new Date(timestamp))
  } catch {
    return 'Not tracked'
  }
}

function getDisplayName(student: EndUser) {
  return (
    student.managedUser?.name?.trim() ||
    student.email ||
    student.externalId ||
    'Unnamed user'
  )
}

function getContact(student: EndUser) {
  return student.email || student.externalId || 'Not provided'
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
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded-full bg-muted animate-pulse' />
              <div className='space-y-2'>
                <div className='h-3 w-32 rounded bg-muted animate-pulse' />
                <div className='h-3 w-20 rounded bg-muted animate-pulse' />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className='h-3 w-24 rounded bg-muted animate-pulse' />
          </TableCell>
          <TableCell>
            <div className='h-5 w-16 rounded-full bg-muted animate-pulse' />
          </TableCell>
          <TableCell className='text-center'>
            <div className='mx-auto h-3 w-10 rounded bg-muted animate-pulse' />
          </TableCell>
          <TableCell>
            <div className='h-3 w-28 rounded bg-muted animate-pulse' />
          </TableCell>
          <TableCell className='text-right'>
            <div className='ml-auto h-8 w-16 rounded bg-muted animate-pulse' />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

type AddStudentModalProps = {
  projectId: string
  authMode: 'MANAGED' | 'DELEGATED'
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusSchema = z.enum(['ACTIVE', 'BANNED']).default('ACTIVE')
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().email('Enter a valid email').optional()
)

const managedSchema = z.object({
  name: optionalString,
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  status: statusSchema,
})

const delegatedSchema = z.object({
  name: optionalString,
  email: optionalEmailSchema,
  externalId: z.string().trim().min(1, 'External ID is required'),
  metadata: optionalString,
  status: statusSchema,
})

type ManagedStudentForm = z.infer<typeof managedSchema>
type DelegatedStudentForm = z.infer<typeof delegatedSchema>
type AddStudentForm = Partial<ManagedStudentForm & DelegatedStudentForm>

function AddStudentModal({
  projectId,
  authMode,
  open,
  onOpenChange,
}: AddStudentModalProps) {
  const isManaged = authMode === 'MANAGED'
  const { toast } = useToast()
  const schema = useMemo(() => (isManaged ? managedSchema : delegatedSchema), [isManaged])
  const resolver = zodResolver(schema) as Resolver<AddStudentForm>
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddStudentForm>({
    resolver,
    defaultValues: {
      status: 'ACTIVE',
    },
  })

  const { mutateAsync: createEndUserMutation, isPending } =
    useCreateEndUser(projectId)

  const closeAndReset = () => {
    reset({
      name: '',
      email: '',
      password: '',
      externalId: '',
      metadata: '',
      status: 'ACTIVE',
    })
    onOpenChange(false)
  }

  const onSubmit = async (values: AddStudentForm) => {
    if (!projectId) return

    try {
      let payload: Record<string, unknown> = {
        status: values.status ?? 'ACTIVE',
      }

      if (isManaged) {
        payload = {
          ...payload,
          email: values.email,
          password: values.password,
          ...(values.name ? { name: values.name } : {}),
        }
      } else {
        let parsedMetadata: Record<string, unknown> | undefined

        if (values.metadata) {
          try {
            const candidate = JSON.parse(values.metadata)
            if (candidate && (typeof candidate !== 'object' || Array.isArray(candidate))) {
              throw new Error('Metadata must be a JSON object')
            }
            parsedMetadata = candidate ?? undefined
          } catch (error) {
            setError('metadata', {
              type: 'manual',
              message:
                error instanceof Error ? error.message : 'Metadata must be valid JSON',
            })
            return
          }
        }

        payload = {
          ...payload,
          externalId: values.externalId,
          ...(values.email ? { email: values.email } : {}),
          ...(values.name ? { name: values.name } : {}),
          ...(parsedMetadata ? { metadata: parsedMetadata } : {}),
        }
      }

      await createEndUserMutation(payload)
      toast({
        title: 'Student added',
        description: 'The student was created successfully.',
      })
      closeAndReset()
    } catch (error) {
      toast({
        title: 'Unable to add student',
        description:
          error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add student</DialogTitle>
          <DialogDescription>
            {isManaged
              ? 'Create a managed account with email and password.'
              : 'Create a delegated user with an external ID and optional metadata.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='grid gap-4'>
            {isManaged ? (
              <>
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='learner@example.com'
                    {...register('email')}
                  />
                  {errors.email?.message ? (
                    <p className='text-sm text-destructive'>{errors.email.message}</p>
                  ) : null}
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='password'>Password</Label>
                  <Input
                    id='password'
                    type='password'
                    placeholder='Minimum 8 characters'
                    {...register('password')}
                  />
                  {errors.password?.message ? (
                    <p className='text-sm text-destructive'>{errors.password.message}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className='grid gap-2'>
                  <Label htmlFor='externalId'>External ID</Label>
                  <Input
                    id='externalId'
                    placeholder='ext_123'
                    {...register('externalId')}
                  />
                  {errors.externalId?.message ? (
                    <p className='text-sm text-destructive'>{errors.externalId.message}</p>
                  ) : null}
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email (optional)</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='learner@example.com'
                    {...register('email')}
                  />
                  {errors.email?.message ? (
                    <p className='text-sm text-destructive'>{errors.email.message}</p>
                  ) : null}
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='metadata'>Metadata (JSON optional)</Label>
                  <Textarea
                    id='metadata'
                    placeholder='{"plan":"pro","region":"us"}'
                    {...register('metadata')}
                  />
                  {errors.metadata?.message ? (
                    <p className='text-sm text-destructive'>{errors.metadata.message}</p>
                  ) : null}
                </div>
              </>
            )}

            <div className='grid gap-2'>
              <Label htmlFor='name'>Name (optional)</Label>
              <Input id='name' placeholder='Student name' {...register('name')} />
              {errors.name?.message ? (
                <p className='text-sm text-destructive'>{errors.name.message}</p>
              ) : null}
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='status'>Status</Label>
              <select
                id='status'
                className='flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                {...register('status')}
              >
                <option value='ACTIVE'>Active</option>
                <option value='BANNED'>Banned</option>
              </select>
              {errors.status?.message ? (
                <p className='text-sm text-destructive'>{errors.status.message}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button type='button' variant='outline' onClick={closeAndReset}>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={!projectId || isPending || isSubmitting}
              className='gap-2'
            >
              {(isPending || isSubmitting) && <Loader2 className='h-4 w-4 animate-spin' />}
              Add student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectStudentsPage() {
  const projectId = useProjectRouteId()
  const { data: project } = useProject(projectId)
  const { toast } = useToast()
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'excel' | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearch = useDeferredValue(searchTerm)

  const {
    data: studentsData,
    isLoading: isStudentsLoading,
    isFetching: isStudentsFetching,
    isError: isStudentsError,
    error: studentsError,
    refetch,
  } = useProjectEndUsers(projectId, {
    search: deferredSearch.trim() || undefined,
    page: 1,
    limit: 50,
  })

  const { mutateAsync: updateStatusMutation } =
    useUpdateEndUserStatus(projectId)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const students = studentsData?.endUsers ?? []
  const studentCount = studentsData?.pagination?.total ?? students.length

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast({
        title: 'ID copied',
        description: 'Student ID copied to clipboard.',
      })
    } catch {
      toast({
        title: 'Unable to copy ID',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleStatus = async (student: EndUser) => {
    if (!projectId) return
    const nextStatus: EndUserStatus =
      student.status === 'BANNED' ? 'ACTIVE' : 'BANNED'
    setUpdatingUserId(student.id)

    try {
      await updateStatusMutation({
        endUserId: student.id,
        status: nextStatus,
      })
      toast({
        title: nextStatus === 'BANNED' ? 'User banned' : 'User unbanned',
        description:
          nextStatus === 'BANNED'
            ? 'The user can no longer sign in to this project.'
            : 'The user can access the project again.',
      })
    } catch (error) {
      toast({
        title: 'Unable to update status',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const displayStudents = students
  const displayCount = studentCount
  const exportRows = displayStudents.map((student) => ({
    name: getDisplayName(student),
    contact: getContact(student),
    userId: student.id,
    status: formatStatusLabel(student.status),
    enrollments: student._count?.enrollments ?? 0,
    lastActive: formatLastActive(
      student.delegatedUser?.lastSeenAt ?? student.createdAt
    ),
  }))

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (displayStudents.length === 0) {
      toast({
        title: 'No students to export',
        description: 'Add students or adjust your search first.',
        variant: 'destructive',
      })
      return
    }

    setDownloadingFormat(format)

    try {
      if (format === 'pdf') {
        await downloadPdfReport({
          title: `${project?.name ?? 'Project'} Students`,
          subtitle: `${displayStudents.length} student${displayStudents.length === 1 ? '' : 's'} exported`,
          filename: `${project?.slug ?? 'project'}-students.pdf`,
          columns: [
            { key: 'name', label: 'Student', weight: 1.4 },
            { key: 'contact', label: 'Contact', weight: 1.6 },
            { key: 'userId', label: 'User ID', weight: 1.2 },
            { key: 'status', label: 'Status', weight: 0.8, align: 'center' },
            { key: 'enrollments', label: 'Enrollments', weight: 0.8, align: 'center' },
            { key: 'lastActive', label: 'Last Active', weight: 1.2, align: 'right' },
          ],
          rows: exportRows,
        })
      } else {
        await downloadExcelFile({
          filename: `${project?.slug ?? 'project'}-students.xlsx`,
          sheetName: 'Students',
          rows: exportRows.map((row) => ({
            Student: row.name,
            Contact: row.contact,
            'User ID': row.userId,
            Status: row.status,
            Enrollments: row.enrollments,
            'Last Active': row.lastActive,
          })),
        })
      }

      toast({
        title: 'Students downloaded',
        description:
          format === 'pdf'
            ? 'Your PDF export is ready.'
            : 'Your Excel export is ready.',
      })
    } catch (error) {
      toast({
        title: 'Unable to download students',
        description:
          error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingFormat(null)
    }
  }

  return (
    <div className='space-y-8'>
      {/* Page Header */}
      <div className='sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4'>
        <div className='space-y-3'>
          <h2 className='text-3xl font-semibold font-literata tracking-wide'>Students</h2>
          <p className='text-lg font-stix text-foreground/80 max-w-2xl tracking-wide'>
            These are all the students that registered for {project?.name ?? 'this project'}.
            <br />
            View their enrollment status, activity, and manage their access.
          </p>
        </div>
        <Button
          className='gap-2 bg-accent hover:bg-accent/80 h-10 px-5 rounded-sm font-medium shrink-0 cursor-pointer'
          disabled={!projectId}
          onClick={() => setCreateModalOpen(true)}
        >
          <TiUserAdd className='size-5' />
          Add Student
        </Button>
      </div>

      {/* Search Bar and Download Button */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
        <div className='relative flex-1'>
          <Search className='absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search students by email, name or external ID...'
            className='pl-11 h-12 text-base bg-background border-neutral-300 rounded-xs shadow-none'
            aria-label='Filter students'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {isStudentsFetching && !isStudentsLoading ? (
            <Loader2 className='absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground' />
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              className='gap-2 h-12 px-5 rounded-xs font-medium shrink-0 hover:text-foreground cursor-pointer'
              disabled={downloadingFormat !== null}
            >
              {downloadingFormat ? (
                <Loader2 className='size-5 animate-spin' />
              ) : (
                <IoMdDownload className='size-5' />
              )}
              {downloadingFormat
                ? `Downloading ${downloadingFormat === 'pdf' ? 'PDF' : 'Excel'}...`
                : 'Download'}
              <ChevronDown className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              disabled={downloadingFormat !== null}
              onClick={() => handleDownload('pdf')}
            >
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={downloadingFormat !== null}
              onClick={() => handleDownload('excel')}
            >
              Download Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Student Count */}
      <div className='flex items-center justify-between'>
        <p className='text-sm font-semibold text-foreground/80'>
          {isStudentsLoading
            ? 'Loading students...'
            : displayCount === 1
              ? 'Showing 1 student'
              : `Showing ${displayCount} students`}
        </p>
        {(isStudentsFetching && !isStudentsLoading) && (
          <span className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Refreshing
          </span>
        )}
      </div>

      {/* Students Table */}
      {isStudentsLoading ? (
        <div className='overflow-x-auto rounded-lg border border-neutral-200 bg-background'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50 border-b border-neutral-200'>
                <TableHead className='text-foreground/90 font-medium pl-4'>Student</TableHead>
                <TableHead className='text-foreground/90 font-medium'>User ID</TableHead>
                <TableHead className='text-foreground/90 font-medium'>Status</TableHead>
                <TableHead className='text-center text-foreground/90 font-medium'>Enrollments</TableHead>
                <TableHead className='text-foreground/90 font-medium'>Last Active</TableHead>
                <TableHead className='text-right text-foreground/90 font-medium pr-4'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <StudentTableSkeleton />
            </TableBody>
          </Table>
        </div>
      ) : isStudentsError ? (
        <div className='rounded-lg border border-neutral-200 bg-background p-8'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='font-medium text-foreground'>Unable to load students</p>
              <p className='text-sm text-muted-foreground'>
                {studentsError?.message ?? 'Please try again in a moment.'}
              </p>
            </div>
            <Button variant='outline' onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : displayStudents.length === 0 ? (
        <div className='w-full bg-background rounded-sm border border-neutral-200 py-16 px-6'>
          <div className='flex flex-col items-center justify-center text-center'>
            <div className='rounded-full bg-muted p-5 mb-5'>
              <FaUserGraduate className='h-12 w-12 text-muted-foreground' />
            </div>
            <h3 className='text-2xl font-semibold text-foreground mb-2'>No students yet</h3>
            <p className='text-base text-foreground/60 max-w-md mb-6'>
              {searchTerm
                ? `No students match "${searchTerm}". Try a different search term.`
                : 'Students will appear here once they sign up or are added to your project. Get started by adding your first student!'}
            </p>
            <Button onClick={() => setCreateModalOpen(true)} className='gap-2 rounded-sm'>
              <TiUserAdd className='size-5.5' />
              Add Your First Student
            </Button>
          </div>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-neutral-200 bg-background'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50 border-b border-neutral-200'>
                <TableHead className='text-foreground/90 font-medium pl-4'>Student</TableHead>
                <TableHead className='text-foreground/90 font-medium'>User ID</TableHead>
                <TableHead className='text-foreground/90 font-medium'>Status</TableHead>
                <TableHead className='text-center text-foreground/90 font-medium'>Enrollments</TableHead>
                <TableHead className='text-foreground/90 font-medium'>Last Active</TableHead>
                <TableHead className='text-right text-foreground/90 font-medium pr-4'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody >
              {displayStudents.map((student) => {
                const displayName = getDisplayName(student)
                const contact = getContact(student)
                const statusLabel = formatStatusLabel(student.status)
                const lastActive =
                  student.delegatedUser?.lastSeenAt ?? student.createdAt

                const isUpdatingThisUser = updatingUserId === student.id
                const nextStatusLabel =
                  student.status === 'BANNED' ? 'Unban user' : 'Ban user'

                return (
                  <TableRow key={student.id} className='border-b border-neutral-100 hover:bg-muted/70'>
                    <TableCell className='pl-4'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-10 w-10'>
                          <AvatarFallback className='bg-muted text-foreground/70'>
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex flex-col'>
                          <span className='font-medium text-foreground'>
                            {displayName}
                          </span>
                          <span className='text-sm text-foreground/60'>
                            {contact}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono text-sm text-foreground/80'>
                          {truncateId(student.id)}
                        </span>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 px-2 text-xs'
                          onClick={() => copyId(student.id)}
                        >
                          <Copy className='h-3 w-3' />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          student.status === 'BANNED'
                            ? 'destructive'
                            : 'default'
                        }
                        className='text-xs'
                      >
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-center font-medium text-foreground/80'>
                      {student._count?.enrollments ?? 0}
                    </TableCell>
                    <TableCell className='text-foreground/60'>
                      {formatLastActive(lastActive)}
                    </TableCell>
                    <TableCell className='text-right pr-4'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='h-8 w-8'>
                            <EllipsisVertical className='size-5' />
                            <span className='sr-only'>Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => copyId(student.id)}
                            className='hover:bg-muted'
                          >
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={
                              student.status === 'BANNED'
                                ? undefined
                                : 'text-destructive hover:bg-muted'

                            }
                            disabled={isUpdatingThisUser}
                            onClick={() => handleToggleStatus(student)}
                          >
                            {isUpdatingThisUser ? (
                              <span className='flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                Updating...
                              </span>
                            ) : (
                              nextStatusLabel
                            )}
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

      <AddStudentModal
        projectId={projectId}
        authMode={project?.authMode ?? 'MANAGED'}
        open={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  )
}
