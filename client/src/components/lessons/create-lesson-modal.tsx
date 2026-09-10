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
import type { CourseModuleLesson } from '@/lib/api'
import { useCreateLesson } from '@/lib/hooks/use-lessons'
import { captureClientException, captureEvent } from '@/lib/posthog'

const contentTypes = ['VIDEO', 'TEXT', 'QUIZ', 'MOCK_TEST', 'ASSIGNMENT', 'YOUTUBE'] as const

const formatContentTypeLabel = (type: string) =>
  type
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const createLessonSchema = z.object({
  title: z
    .string()
    .min(1, 'Lesson title is required')
    .max(160, 'Lesson title must be under 160 characters'),
  description: z
    .string()
    .max(2000, 'Description must be under 2000 characters')
    .optional(),
  contentType: z.enum(contentTypes),
  textContent: z.string().optional(),
  videoUrl: z
    .string()
    .url('Provide a valid URL')
    .optional()
    .or(z.literal('')),
  duration: z
    .string()
    .optional()
    .refine(
      (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      'Duration must be a positive number'
    ),
  isFree: z.boolean().optional(),
})

type CreateLessonFormData = z.infer<typeof createLessonSchema>

type CreateLessonModalProps = {
  projectId: string
  courseId: string
  moduleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLessonCreated?: (lesson: CourseModuleLesson) => void
}

export function CreateLessonModal({
  projectId,
  courseId,
  moduleId,
  open,
  onOpenChange,
  onLessonCreated,
}: CreateLessonModalProps) {
  const { toast } = useToast()
  const {
    mutateAsync: createLessonMutation,
    isPending,
  } = useCreateLesson(projectId, courseId, moduleId)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLessonFormData>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: {
      title: '',
      description: '',
      contentType: 'VIDEO',
      textContent: '',
      videoUrl: '',
      duration: '',
      isFree: false,
    },
  })

  const selectedContentType = watch('contentType')

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (values: CreateLessonFormData) => {
    const normalizedDuration =
      values.duration && values.duration.trim() !== ''
        ? Math.round(Number(values.duration))
        : undefined

    try {
      const lesson = await createLessonMutation({
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        contentType: values.contentType,
        isFree: values.isFree ?? false,
        duration: normalizedDuration,
        textContent:
          values.contentType === 'TEXT'
            ? values.textContent?.trim() || undefined
            : undefined,
        videoUrl:
          values.contentType === 'VIDEO' || values.contentType === 'YOUTUBE'
            ? values.videoUrl?.trim() || undefined
            : undefined,
      })

      captureEvent('lesson_created', {
        content_type: values.contentType,
        course_id: courseId,
        has_description: Boolean(values.description?.trim()),
        is_free: values.isFree ?? false,
        lesson_id: lesson.id,
        module_id: moduleId,
        project_id: projectId,
      })

      toast({
        title: 'Lesson created',
        description: `"${lesson.title}" was added to this module.`,
      })

      reset()
      onLessonCreated?.(lesson)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Unable to create lesson',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
      captureClientException(error, {
        context: 'create_lesson',
        content_type: values.contentType,
        course_id: courseId,
        module_id: moduleId,
        project_id: projectId,
      })
    }
  }

  const renderContentFields = () => {
    if (selectedContentType === 'TEXT') {
      return (
        <div className="grid gap-2">
          <Label htmlFor="lesson-text-content">Text content</Label>
          <Textarea
            id="lesson-text-content"
            rows={4}
            placeholder="Write or paste the lesson content."
            {...register('textContent')}
          />
        </div>
      )
    }

    if (selectedContentType === 'VIDEO') {
      return (
        <div className="grid gap-2">
          <Label htmlFor="lesson-video-url">Video URL (optional)</Label>
          <Input
            id="lesson-video-url"
            type="url"
            placeholder="https://"
            {...register('videoUrl')}
            className={errors.videoUrl ? 'border-destructive' : undefined}
          />
          {errors.videoUrl ? (
            <p className="text-sm text-destructive">{errors.videoUrl.message}</p>
          ) : null}
        </div>
      )
    }

    if (selectedContentType === 'YOUTUBE') {
      return (
        <div className="grid gap-2">
          <Label htmlFor="lesson-video-url">Video URL</Label>
          <Input
            id="lesson-video-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            {...register('videoUrl')}
            className={errors.videoUrl ? 'border-destructive' : undefined}
          />
          {errors.videoUrl ? (
            <p className="text-sm text-destructive">{errors.videoUrl.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Embed a public or unlisted video
            </p>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create lesson</DialogTitle>
          <DialogDescription>
            Provide the lesson basics. You can enrich the content later if
            needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lesson-title">
                Lesson title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lesson-title"
                placeholder="Example: Welcome & Orientation"
                {...register('title')}
                className={errors.title ? 'border-destructive' : undefined}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lesson-description">Description</Label>
              <Textarea
                id="lesson-description"
                rows={3}
                placeholder="Briefly describe what students will learn."
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

            <div className="grid gap-2">
              <Label htmlFor="lesson-content-type">
                Content type <span className="text-destructive">*</span>
              </Label>
              <select
                id="lesson-content-type"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('contentType')}
              >
                {contentTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatContentTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            {renderContentFields()}

            <div className="grid gap-2">
              <Label htmlFor="lesson-duration">Duration (minutes)</Label>
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                placeholder="Optional"
                {...register('duration')}
                className={errors.duration ? 'border-destructive' : undefined}
              />
              {errors.duration ? (
                <p className="text-sm text-destructive">
                  {errors.duration.message}
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                {...register('isFree')}
              />
              <span className="text-sm">Mark as free preview</span>
            </label>
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
              disabled={isPending || !projectId || !courseId || !moduleId}
            >
              {isPending ? 'Creating…' : 'Create lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
