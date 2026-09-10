import { useState } from 'react'
import { PlayCircle, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CreateLessonModal } from '@/components/lessons/create-lesson-modal'
import type { CourseModule } from '@/lib/api'
import { cn } from '@/lib/utils'

type StructurePanelProps = {
  modules: CourseModule[]
  isLoading: boolean
  projectId: string
  courseId: string
  onAddModule: () => void
  selectedLessonId: string | null
  onEditLesson: (moduleId: string, lessonId: string) => void
}

export function StructurePanel({
  modules,
  isLoading,
  projectId,
  courseId,
  onAddModule,
  selectedLessonId,
  onEditLesson,
}: StructurePanelProps) {
  return (
    <Card className='border border-slate-200/80 shadow-sm dark:border-slate-800'>
      <CardHeader className='flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle className='text-xl font-semibold'>Structure</CardTitle>
          <CardDescription>
            Build modules and lessons students will take sequentially.
          </CardDescription>
        </div>
        <Button
          size='sm'
          className='gap-2'
          disabled={isLoading}
          onClick={onAddModule}
        >
          <Plus className='h-4 w-4' />
          Add module
        </Button>
      </CardHeader>
      <CardContent className='space-y-4 pt-4'>
        {isLoading ? (
          <StructureSkeleton />
        ) : modules.length === 0 ? (
          <StructureEmptyState />
        ) : (
          modules.map((module) => (
            <ModuleItem
              key={module.id}
              module={module}
              projectId={projectId}
              courseId={courseId}
              selectedLessonId={selectedLessonId}
              onEditLesson={onEditLesson}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ModuleItem({
  module,
  projectId,
  courseId,
  selectedLessonId,
  onEditLesson,
}: {
  module: CourseModule
  projectId: string
  courseId: string
  selectedLessonId: string | null
  onEditLesson: (moduleId: string, lessonId: string) => void
}) {
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const lessonCount = module.lessons?.length ?? module._count?.lessons ?? 0

  return (
    <div className='rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
      <div className='flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800'>
        <div>
          <p className='text-sm font-semibold text-slate-900 dark:text-white'>
            {module.title}
          </p>
          <p className='text-xs text-muted-foreground'>
            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
          </p>
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='gap-1'
          onClick={() => setIsLessonModalOpen(true)}
        >
          <Plus className='h-4 w-4' />
          Add lesson
        </Button>
      </div>
      <div className='space-y-2 px-4 py-3'>
        {lessonCount === 0 ? (
          <p className='rounded-md border border-dashed border-slate-200 p-3 text-xs text-muted-foreground dark:border-slate-800'>
            No lessons yet. Add your first lesson to this module.
          </p>
        ) : (
          module.lessons?.map((lesson, lessonIndex) => (
            <LessonRow
              key={lesson.id}
              title={lesson.title}
              duration={lesson.duration}
              isFree={lesson.isFree}
              displayNumber={lessonIndex + 1}
              isActive={lesson.id === selectedLessonId}
              onEdit={() => onEditLesson(module.id, lesson.id)}
            />
          ))
        )}
      </div>
      <CreateLessonModal
        projectId={projectId}
        courseId={courseId}
        moduleId={module.id}
        open={isLessonModalOpen}
        onOpenChange={setIsLessonModalOpen}
      />
    </div>
  )
}

function LessonRow({
  title,
  duration,
  isFree,
  displayNumber,
  isActive,
  onEdit,
}: {
  title: string
  duration?: number | null
  isFree: boolean
  displayNumber: number
  isActive: boolean
  onEdit: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/30',
        isActive && 'border-primary bg-primary/5 dark:border-primary/60'
      )}
    >
      <div className='flex items-center gap-2'>
        <PlayCircle className='h-4 w-4 text-muted-foreground' />
        <div>
          <p className='font-medium text-slate-900 dark:text-white'>
            {displayNumber}. {title}
          </p>
          <p className='text-xs text-muted-foreground'>
            {duration ? `${duration} min` : 'Duration TBD'}
            {isFree ? ' • Free preview' : ''}
          </p>
        </div>
      </div>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size='sm'
        className='px-2 text-xs'
        onClick={onEdit}
      >
        {isActive ? 'Editing' : 'Edit'}
      </Button>
    </div>
  )
}

function StructureSkeleton() {
  return (
    <div className='space-y-3'>
      {[0, 1].map((row) => (
        <div
          key={row}
          className='h-32 rounded-lg border border-slate-200 bg-slate-50 animate-pulse dark:border-slate-800 dark:bg-slate-900/40'
        />
      ))}
    </div>
  )
}

function StructureEmptyState() {
  return (
    <div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900/30'>
      Use modules to break your course into sections. Each module can contain
      multiple lessons, quizzes, and downloadable resources.
    </div>
  )
}
