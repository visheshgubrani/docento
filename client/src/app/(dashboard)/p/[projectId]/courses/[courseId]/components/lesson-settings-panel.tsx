import { VideoLessonSettings } from './video-lesson-settings'
import { QuizLessonSettings } from './quiz-lesson-settings'
import { DefaultLessonSettings } from './default-lesson-settings'
import type { CourseModule, CourseModuleLesson } from '@/lib/api'

type LessonSettingsPanelProps = {
  lesson: CourseModuleLesson
  module?: CourseModule
  projectId: string
  courseId: string
}

export function LessonSettingsPanel({
  lesson,
  module,
  projectId,
  courseId,
}: LessonSettingsPanelProps) {
  const moduleId = module?.id ?? ''

  if (lesson.contentType === 'QUIZ' || lesson.contentType === 'MOCK_TEST') {
    return (
      <QuizLessonSettings
        lesson={lesson}
        projectId={projectId}
        courseId={courseId}
        moduleId={moduleId}
      />
    )
  }

  if (lesson.contentType === 'VIDEO') {
    return (
      <VideoLessonSettings
        lesson={lesson}
        projectId={projectId}
        courseId={courseId}
        moduleId={moduleId}
      />
    )
  }

  return (
    <DefaultLessonSettings
      lesson={lesson}
      projectId={projectId}
      courseId={courseId}
      moduleId={moduleId}
    />
  )
}
