'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  type CourseModuleLesson,
  type CreateLessonInput,
  type UpdateLessonInput,
  type LessonOrderItem,
} from '@/lib/api'

export function useCreateLesson(
  projectId: string,
  courseId: string,
  moduleId: string
) {
  const queryClient = useQueryClient()

  return useMutation<CourseModuleLesson, Error, CreateLessonInput>({
    mutationFn: (input) => createLesson(projectId, courseId, moduleId, input),
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

export function useUpdateLesson(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
) {
  const queryClient = useQueryClient()

  return useMutation<CourseModuleLesson, Error, UpdateLessonInput>({
    mutationFn: (input) =>
      updateLesson(projectId, courseId, moduleId, lessonId, input),
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

export function useDeleteLesson(
  projectId: string,
  courseId: string,
  moduleId: string
) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (lessonId) =>
      deleteLesson(projectId, courseId, moduleId, lessonId),
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

export function useReorderLessons(
  projectId: string,
  courseId: string,
  moduleId: string
) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, LessonOrderItem[]>({
    mutationFn: (lessonOrders) =>
      reorderLessons(projectId, courseId, moduleId, lessonOrders),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
    },
  })
}
