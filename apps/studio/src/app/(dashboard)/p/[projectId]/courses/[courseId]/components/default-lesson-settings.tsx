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

type DefaultLessonSettingsProps = {
  lesson: CourseModuleLesson
  projectId: string
  courseId: string
  moduleId: string
}

export function DefaultLessonSettings({
  lesson,
  projectId,
  courseId,
  moduleId,
}: DefaultLessonSettingsProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState(lesson.title)
  const [description, setDescription] = useState(lesson.description ?? '')

  useEffect(() => {
    setTitle(lesson.title)
    setDescription(lesson.description ?? '')
  }, [lesson])

  const { mutateAsync: updateLessonMutation, isPending } = useUpdateLesson(
    projectId,
    courseId,
    moduleId,
    lesson.id,
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

    try {
      await updateLessonMutation({
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
      })

      toast({
        title: 'Lesson updated',
        description: 'Lesson details were saved.',
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
    <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
      <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <CardTitle className="text-xl font-semibold">Lesson settings</CardTitle>
        <CardDescription>
          Update metadata for this{' '}
          {lesson.contentType?.toLowerCase() ?? 'custom'} lesson.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor={`generic-title-${lesson.id}`}>Title</Label>
          <Input
            id={`generic-title-${lesson.id}`}
            value={title}
            placeholder="Lesson title"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`generic-description-${lesson.id}`}>
            Description
          </Label>
          <Textarea
            id={`generic-description-${lesson.id}`}
            value={description}
            placeholder="Describe the key takeaways"
            rows={4}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isPending || !moduleId}
        >
          {isPending ? 'Saving...' : 'Save lesson'}
        </Button>
        {!moduleId ? (
          <p className="text-xs text-muted-foreground">
            Select a module to enable saving changes.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
