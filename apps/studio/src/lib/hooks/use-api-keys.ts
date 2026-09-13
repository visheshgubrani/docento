'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createProjectApiKey,
  deleteProjectApiKey,
  fetchProjectApiKeys,
  updateProjectApiKeyName,
  type ApiKey,
  type ApiKeyList,
} from '@/lib/api'

export function useProjectApiKeys(projectId: string) {
  return useQuery<ApiKeyList, Error>({
    queryKey: ['project-api-keys', projectId],
    queryFn: () => fetchProjectApiKeys(projectId),
    enabled: !!projectId,
  })
}

export function useCreateProjectApiKey(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<{ apiKey: string; key: ApiKey }, Error, { name: string }>({
    mutationFn: ({ name }) => createProjectApiKey(projectId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-api-keys', projectId],
      })
    },
  })
}

export function useDeleteProjectApiKey(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { keyId: string }>({
    mutationFn: ({ keyId }) => deleteProjectApiKey(projectId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-api-keys', projectId],
      })
    },
  })
}

export function useUpdateProjectApiKeyName(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ApiKey, Error, { keyId: string; name: string }>({
    mutationFn: ({ keyId, name }) =>
      updateProjectApiKeyName(projectId, keyId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-api-keys', projectId],
      })
    },
  })
}
