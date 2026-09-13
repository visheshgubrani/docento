'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateCourse } from '@/lib/hooks/use-courses'
import type { CourseSummary } from '@/lib/api'
import { captureClientException, captureEvent } from '@/lib/posthog'

const createCourseSchema = z.object({
  title: z
    .string()
    .min(1, 'Course title is required')
    .max(160, 'Course title must be under 160 characters'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional(),
})

type CreateCourseFormData = z.infer<typeof createCourseSchema>

type CreateCourseModalProps = {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseCreated?: (course: CourseSummary) => void
}

export function CreateCourseModal({
  projectId,
  open,
  onOpenChange,
  onCourseCreated,
}: CreateCourseModalProps) {
  const { toast } = useToast()
  const {
    mutateAsync: createCourseMutation,
    isPending,
  } = useCreateCourse(projectId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (values: CreateCourseFormData) => {
    try {
      const course = await createCourseMutation({
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
      })

      captureEvent('course_created', {
        course_id: course.id,
        has_description: Boolean(values.description?.trim()),
        project_id: projectId,
      })

      toast({
        title: 'Course created',
        description: `"${course.title}" is now ready for configuration.`,
      })

      reset()
      onCourseCreated?.(course)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Unable to create course',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
      captureClientException(error, {
        context: 'create_course',
        project_id: projectId,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-noto font-semibold">Create course</DialogTitle>
          <DialogDescription className="text-foreground/70">
            Give the course a name and short description. You can add modules,
            lessons, and pricing later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="course-title" className="font-medium">
                Course title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="course-title"
                placeholder="Example: Product Strategy Foundations"
                {...register('title')}
                className={`rounded-xs mt-1 shadow-none border border-muted-foreground/60 h-11 ${errors.title ? 'border-destructive' : ''}`}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="course-description" className="font-medium">Description</Label>
              <Textarea
                id="course-description"
                rows={4}
                placeholder="Describe the learning outcomes, audience, or scope."
                {...register('description')}
                className={`rounded-xs mt-1 shadow-none border border-muted-foreground/60 resize-none ${errors.description ? 'border-destructive' : ''}`}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-xs cursor-pointer hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !projectId}
              className="rounded-xs bg-accent/90 cursor-pointer hover:bg-accent/80"
            >
              {isPending ? 'Creating…' : 'Create course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
