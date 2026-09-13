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

type QuizLessonSettingsProps = {
  lesson: CourseModuleLesson
  projectId: string
  courseId: string
  moduleId: string
}

export function QuizLessonSettings({
  lesson,
  projectId,
  courseId,
  moduleId,
}: QuizLessonSettingsProps) {
  const lessonLabel = lesson.contentType === 'MOCK_TEST' ? 'Mock test' : 'Quiz'
  const { toast } = useToast()
  const [title, setTitle] = useState(lesson.title)
  const [description, setDescription] = useState(lesson.description ?? '')
  const [timeLimit, setTimeLimit] = useState('')
  const [passingScore, setPassingScore] = useState('')
  const [maxAttempts, setMaxAttempts] = useState('')

  useEffect(() => {
    setTitle(lesson.title)
    setDescription(lesson.description ?? '')
    setTimeLimit('')
    setPassingScore('')
    setMaxAttempts('')
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
        title: `Cannot save ${lessonLabel.toLowerCase()}`,
        description: 'Project, course, or module context is missing.',
        variant: 'destructive',
      })
      return
    }

    const normalizedTime =
      timeLimit.trim() === '' ? null : Number(timeLimit.trim())

    if (
      normalizedTime !== null &&
      (Number.isNaN(normalizedTime) || normalizedTime < 0)
    ) {
      toast({
        title: 'Invalid time limit',
        description: `Enter ${lessonLabel.toLowerCase()} time in minutes or leave it blank.`,
        variant: 'destructive',
      })
      return
    }

    try {
      await updateLessonMutation({
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        duration: normalizedTime === null ? null : Math.round(normalizedTime),
      })

      toast({
        title: `${lessonLabel} updated`,
        description: `${lessonLabel} lesson settings were saved.`,
      })
    } catch (error) {
      toast({
        title: `Unable to save ${lessonLabel.toLowerCase()}`,
        description:
          error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
      <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <CardTitle className="text-xl font-semibold">
          {lessonLabel} settings
        </CardTitle>
        <CardDescription>
          Control timing, scoring, and attempt limits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor={`quiz-title-${lesson.id}`}>Title</Label>
          <Input
            id={`quiz-title-${lesson.id}`}
            value={title}
            placeholder="Final exam"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`quiz-description-${lesson.id}`}>Description</Label>
          <Textarea
            id={`quiz-description-${lesson.id}`}
            value={description}
            placeholder="Passing score is 70%"
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`quiz-time-${lesson.id}`}>
              Time limit (minutes)
            </Label>
            <Input
              id={`quiz-time-${lesson.id}`}
              type="number"
              min={0}
              placeholder="30"
              value={timeLimit}
              onChange={(event) => setTimeLimit(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`quiz-score-${lesson.id}`}>Passing score (%)</Label>
            <Input
              id={`quiz-score-${lesson.id}`}
              type="number"
              min={0}
              max={100}
              placeholder="70"
              value={passingScore}
              onChange={(event) => setPassingScore(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`quiz-attempts-${lesson.id}`}>Max attempts</Label>
          <Input
            id={`quiz-attempts-${lesson.id}`}
            type="number"
            min={1}
            placeholder="3"
            value={maxAttempts}
            onChange={(event) => setMaxAttempts(event.target.value)}
          />
        </div>
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isPending || !moduleId}
        >
          {isPending
            ? 'Saving...'
            : `Save ${lessonLabel.toLowerCase()} settings`}
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
