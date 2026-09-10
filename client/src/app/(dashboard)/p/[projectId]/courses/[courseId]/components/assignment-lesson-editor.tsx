'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getAssignment, type Assignment } from '@/lib/api'
import type { CourseModule, CourseModuleLesson } from '@/lib/api'

type AssignmentLessonEditorProps = {
  lesson: CourseModuleLesson
  module?: CourseModule
  projectId: string
  courseId: string
}

export function AssignmentLessonEditor({
  lesson,
  module,
  projectId,
  courseId,
}: AssignmentLessonEditorProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAssignment = async () => {
      if (!projectId || !courseId || !module?.id || !lesson.id) {
        setAssignment(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const fetched = await getAssignment(projectId, courseId, module.id, lesson.id)
        setAssignment(fetched)
      } catch (error) {
        console.error('Failed to load assignment:', error)
        setAssignment(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadAssignment()
  }, [projectId, courseId, module?.id, lesson.id])

  const assignmentUrl = `/p/${projectId}/courses/${courseId}/curriculum/${lesson.id}/assignment`
  const dueDateLabel = assignment?.dueDate
    ? new Date(assignment.dueDate).toLocaleString()
    : 'No due date'

  return (
    <Card className='border border-slate-200/80 shadow-sm dark:border-slate-800'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-semibold'>
          <ClipboardList className='h-5 w-5 text-muted-foreground' />
          Assignment builder
        </CardTitle>
        <CardDescription>
          {module ? `${module.title} • ` : ''}
          {lesson.title}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {isLoading ? (
          <p className='text-sm text-muted-foreground'>Loading assignment...</p>
        ) : assignment ? (
          <div className='rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/50'>
            <p className='font-semibold'>{assignment.title}</p>
            <p className='mt-1 text-muted-foreground'>{dueDateLabel}</p>
            <p className='text-muted-foreground'>
              Total points: {assignment.totalPoints}
            </p>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>
            No assignment details created yet.
          </p>
        )}
        <Button asChild className='w-full'>
          <Link href={assignmentUrl}>
            {assignment ? 'Manage assignment' : 'Create assignment'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
