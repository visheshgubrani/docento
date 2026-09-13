'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import type { CourseModule } from '@/lib/api'
import { useCreateModule } from '@/lib/hooks/use-modules'
import { captureClientException, captureEvent } from '@/lib/posthog'

const createModuleSchema = z.object({
  title: z
    .string()
    .min(1, 'Module title is required')
    .max(160, 'Module title must be under 160 characters'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional(),
})

type CreateModuleFormData = z.infer<typeof createModuleSchema>

type CreateModuleModalProps = {
  projectId: string
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onModuleCreated?: (module: CourseModule) => void
}

export function CreateModuleModal({
  projectId,
  courseId,
  open,
  onOpenChange,
  onModuleCreated,
}: CreateModuleModalProps) {
  const { toast } = useToast()
  const { mutateAsync: createModuleMutation, isPending } = useCreateModule(
    projectId,
    courseId,
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateModuleFormData>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (values: CreateModuleFormData) => {
    try {
      const module = await createModuleMutation({
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
      })

      captureEvent('module_created', {
        course_id: courseId,
        has_description: Boolean(values.description?.trim()),
        module_id: module.id,
        project_id: projectId,
      })

      toast({
        title: 'Module created',
        description: `"${module.title}" was added to this course.`,
      })

      reset()
      onModuleCreated?.(module)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Unable to create module',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
      captureClientException(error, {
        context: 'create_module',
        course_id: courseId,
        project_id: projectId,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create module</DialogTitle>
          <DialogDescription>
            Give the module a title and optional description. You can add
            lessons after it is created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="module-title">
                Module title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="module-title"
                placeholder="Example: Week 1 – Foundations"
                {...register('title')}
                className={errors.title ? 'border-destructive' : undefined}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="module-description">Description</Label>
              <Textarea
                id="module-description"
                rows={3}
                placeholder="Summarize what students will learn in this module."
                {...register('description')}
                className={
                  errors.description ? 'border-destructive' : undefined
                }
              />
              {errors.description ? (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !projectId || !courseId}
            >
              {isPending ? 'Creating…' : 'Create module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
