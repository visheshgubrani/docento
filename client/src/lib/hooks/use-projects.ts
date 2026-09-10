'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
  updateProject,
  type CreateProjectInput,
  type UpdateProjectInput,
  type Project,
} from '@/lib/api'

export const PROJECTS_QUERY_KEY = ['projects'] as const

export function useProjects() {
  return useQuery<Project[], Error>({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: () => fetchProjects(),
  })
}

export function useProject(projectId: string) {
  return useQuery<Project, Error>({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation<Project, Error, CreateProjectInput>({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation<Project, Error, { projectId: string; input: UpdateProjectInput }>({
    mutationFn: ({ projectId, input }) => updateProject(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })
}
