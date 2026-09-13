import type { CourseModule, CourseModuleLesson } from '@/lib/api'
import { GenericLessonEditor } from './generic-lesson-editor'
import { QuizLessonEditor } from './quiz-lesson-editor'
import { VideoLessonEditor } from './video-lesson-editor'
import { AssignmentLessonEditor } from './assignment-lesson-editor'

type LessonEditorPanelProps = {
  lesson: CourseModuleLesson
  module?: CourseModule
  projectId: string
  courseId: string
}

export function LessonEditorPanel({
  lesson,
  module,
  projectId,
  courseId,
}: LessonEditorPanelProps) {
  if (lesson.contentType === 'QUIZ' || lesson.contentType === 'MOCK_TEST') {
    return <QuizLessonEditor lesson={lesson} module={module} />
  }

  if (lesson.contentType === 'VIDEO') {
    return (
      <VideoLessonEditor
        lesson={lesson}
        module={module}
        projectId={projectId}
        courseId={courseId}
      />
    )
  }

  if (lesson.contentType === 'ASSIGNMENT') {
    return (
      <AssignmentLessonEditor
        lesson={lesson}
        module={module}
        projectId={projectId}
        courseId={courseId}
      />
    )
  }

  if (lesson.contentType === 'YOUTUBE') {
    return <GenericLessonEditor lesson={lesson} module={module} />
  }

  return <GenericLessonEditor lesson={lesson} module={module} />
}
