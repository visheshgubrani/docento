import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { CourseModule, CourseModuleLesson } from '@/lib/api'

type GenericLessonEditorProps = {
  lesson: CourseModuleLesson
  module?: CourseModule
}

export function GenericLessonEditor({
  lesson,
  module,
}: GenericLessonEditorProps) {
  return (
    <Card className="border border-slate-200/80 shadow-sm dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Editing {lesson.title}
        </CardTitle>
        <CardDescription>
          {module ? `${module.title} • ` : ''}
          {lesson.contentType ?? 'Custom'} lesson
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          This lesson type does not yet have a dedicated builder. Use the
          settings panel to update its content and metadata.
        </p>
        <p>
          Need a unique workflow? Extend this component with a custom editor for{' '}
          {lesson.contentType?.toLowerCase() ?? 'your'} lessons.
        </p>
      </CardContent>
    </Card>
  )
}
