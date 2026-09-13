import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ projectId: string; courseId: string }>
}

export default async function CourseRootPage({ params }: Props) {
  const { projectId, courseId } = await params

  redirect(`/p/${projectId}/courses/${courseId}/information`)
}
