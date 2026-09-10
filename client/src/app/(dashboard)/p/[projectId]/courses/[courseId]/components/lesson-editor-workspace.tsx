import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { CourseModule, CourseModuleLesson } from '@/lib/api'
import { LessonEditorPanel } from './lesson-editor-panel'
import { LessonSettingsPanel } from './lesson-settings-panel'

type LessonEditorWorkspaceProps = {
  lesson: CourseModuleLesson
  module?: CourseModule
  projectId: string
  courseId: string
  onBack: () => void
}

export function LessonEditorWorkspace({
  lesson,
  module,
  projectId,
  courseId,
  onBack,
}: LessonEditorWorkspaceProps) {
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/30'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Lesson editor
          </p>
          <p className='text-base font-medium text-slate-900 dark:text-white'>
            Editing: {lesson.title}
          </p>
        </div>
        <Button variant='ghost' size='sm' className='gap-2' onClick={onBack}>
          <ArrowLeft className='h-4 w-4' />
          Back to course settings
        </Button>
      </div>
      <div className='grid gap-4 xl:grid-cols-[1.4fr_minmax(280px,1fr)]'>
        <LessonEditorPanel
          lesson={lesson}
          module={module}
          projectId={projectId}
          courseId={courseId}
        />
        <LessonSettingsPanel
          lesson={lesson}
          module={module}
          projectId={projectId}
          courseId={courseId}
        />
      </div>
    </div>
  )
}
