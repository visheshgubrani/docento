import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import type { CourseModuleLesson } from '@/lib/api'
import { useUpdateLesson } from '@/lib/hooks/use-lessons'

type VideoLessonSettingsProps = {
  lesson: CourseModuleLesson
  projectId: string
  courseId: string
  moduleId: string
}

export function VideoLessonSettings({
  lesson,
  projectId,
  courseId,
  moduleId,
}: VideoLessonSettingsProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState(lesson.title)
  const [description, setDescription] = useState(lesson.description ?? '')
  const [duration, setDuration] = useState(
    lesson.duration !== undefined && lesson.duration !== null
      ? String(lesson.duration)
      : ''
  )
  const [isFree, setIsFree] = useState(Boolean(lesson.isFree))

  useEffect(() => {
    setTitle(lesson.title)
    setDescription(lesson.description ?? '')
    setDuration(
      lesson.duration !== undefined && lesson.duration !== null
        ? String(lesson.duration)
        : ''
    )
    setIsFree(Boolean(lesson.isFree))
  }, [lesson])

  const { mutateAsync: updateLessonMutation, isPending } = useUpdateLesson(
    projectId,
    courseId,
    moduleId,
    lesson.id
  )

  const handleSave = async () => {
    if (!projectId || !courseId || !moduleId) {
      toast({
        title: 'Cannot save lesson',
        description: 'Project, course, or module context is missing.',
        variant: 'destructive',
      })
      return
    }

    const normalizedDuration =
      duration.trim() === '' ? null : Number(duration.trim())

    if (
      normalizedDuration !== null &&
      (Number.isNaN(normalizedDuration) || normalizedDuration < 0)
    ) {
      toast({
        title: 'Invalid duration',
        description: 'Duration must be a number of minutes greater than zero.',
        variant: 'destructive',
      })
      return
    }

    try {
      await updateLessonMutation({
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        duration:
          normalizedDuration === null
            ? null
            : Math.round(normalizedDuration),
        isFree,
      })

      toast({
        title: 'Lesson updated',
        description: 'Lesson settings were saved.',
      })
    } catch (error) {
      toast({
        title: 'Unable to save lesson',
        description:
          error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className='border border-slate-200/80 shadow-sm dark:border-slate-800'>
      <CardHeader className='border-b border-slate-100 pb-4 dark:border-slate-800'>
        <CardTitle className='text-xl font-semibold'>Video settings</CardTitle>
        <CardDescription>
          Fine-tune how students experience this video.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4 pt-4'>
        <div className='space-y-2'>
          <Label htmlFor={`lesson-title-${lesson.id}`}>Title</Label>
          <Input
            id={`lesson-title-${lesson.id}`}
            value={title}
            placeholder='Lesson title'
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor={`lesson-description-${lesson.id}`}>Description</Label>
          <Textarea
            id={`lesson-description-${lesson.id}`}
            value={description}
            placeholder='Describe what students will learn'
            rows={4}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor={`lesson-duration-${lesson.id}`}>
            Video duration (minutes)
          </Label>
          <Input
            id={`lesson-duration-${lesson.id}`}
            type='number'
            min={0}
            placeholder='12'
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
        <label className='flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800'>
          <input
            type='checkbox'
            className='mt-1 h-4 w-4'
            checked={isFree}
            onChange={(event) => setIsFree(event.target.checked)}
          />
          <div>
            <p className='font-medium text-slate-900 dark:text-white'>
              Free preview
            </p>
            <p className='text-xs text-muted-foreground'>
              Allow non-enrolled students to watch this lesson.
            </p>
          </div>
        </label>
        <Button
          className='w-full'
          onClick={handleSave}
          disabled={isPending || !moduleId}
        >
          {isPending ? 'Saving...' : 'Save lesson settings'}
        </Button>
        {!moduleId ? (
          <p className='text-xs text-muted-foreground'>
            Select a module to enable saving changes.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
