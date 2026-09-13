import { useQuery } from '@tanstack/react-query'
import { fetchCourseEnrollments, CourseEnrollmentList } from '@/lib/api'

type UseCourseEnrollmentsParams = {
  page?: number
  limit?: number
  status?: 'active' | 'expired' | 'all'
  search?: string
}

export function useCourseEnrollments(
  projectId: string,
  courseId: string,
  params: UseCourseEnrollmentsParams = {},
) {
  return useQuery<CourseEnrollmentList>({
    queryKey: ['course-enrollments', projectId, courseId, params],
    queryFn: () => fetchCourseEnrollments(projectId, courseId, params),
    enabled: Boolean(projectId && courseId),
    staleTime: 1000 * 30,
  })
}
