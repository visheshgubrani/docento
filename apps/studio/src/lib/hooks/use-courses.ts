'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCourse,
  deleteCourse,
  fetchCourse,
  fetchProjectCourses,
  type CourseDetail,
  type CourseSummary,
  type CreateCourseInput,
  type UpdateCourseInput,
  updateCourse,
  toggleCoursePublish,
} from '@/lib/api'

type UseProjectCoursesOptions = {
  isPublished?: boolean
}

export function useProjectCourses(
  projectId: string,
  options: UseProjectCoursesOptions = {},
) {
  return useQuery<CourseSummary[], Error>({
    queryKey: ['project-courses', projectId, options.isPublished ?? 'all'],
    queryFn: () => fetchProjectCourses(projectId, options),
    enabled: !!projectId,
  })
}

export function useCourse(projectId: string, courseId: string) {
  return useQuery<CourseDetail, Error>({
    queryKey: ['project-course', projectId, courseId],
    queryFn: () => fetchCourse(projectId, courseId),
    enabled: Boolean(projectId && courseId),
  })
}

export function useCreateCourse(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<CourseSummary, Error, CreateCourseInput>({
    mutationFn: (input) => createCourse(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-courses', projectId],
      })
    },
  })
}

export function useUpdateCourse(projectId: string, courseId: string) {
  const queryClient = useQueryClient()

  return useMutation<CourseSummary, Error, UpdateCourseInput>({
    mutationFn: (input) => updateCourse(projectId, courseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-courses'],
      })
    },
  })
}

export function useToggleCoursePublish(projectId: string, courseId: string) {
  const queryClient = useQueryClient()

  return useMutation<CourseSummary, Error>({
    mutationFn: () => toggleCoursePublish(projectId, courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-courses'],
      })
    },
  })
}

export function useDeleteCourse(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (courseId) => deleteCourse(projectId, courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-courses', projectId],
      })
    },
  })
}

export function useToggleCoursePublishAction(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<CourseSummary, Error, string>({
    mutationFn: (courseId) => toggleCoursePublish(projectId, courseId),
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-courses'],
      })
    },
  })
}
