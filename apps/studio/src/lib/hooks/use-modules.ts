'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  type CourseModule,
  type CreateModuleInput,
  type UpdateModuleInput,
  type ModuleOrderItem,
  type Module,
} from '@/lib/api'

export function useCreateModule(projectId: string, courseId: string) {
  const queryClient = useQueryClient()

  return useMutation<CourseModule, Error, CreateModuleInput>({
    mutationFn: (input) => createModule(projectId, courseId, input),
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

export function useUpdateModule(
  projectId: string,
  courseId: string,
  moduleId: string
) {
  const queryClient = useQueryClient()

  return useMutation<Module, Error, UpdateModuleInput>({
    mutationFn: (input) => updateModule(projectId, courseId, moduleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
    },
  })
}

export function useDeleteModule(projectId: string, courseId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (moduleId) => deleteModule(projectId, courseId, moduleId),
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

export function useReorderModules(projectId: string, courseId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ModuleOrderItem[]>({
    mutationFn: (moduleOrders) =>
      reorderModules(projectId, courseId, moduleOrders),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
    },
  })
}
