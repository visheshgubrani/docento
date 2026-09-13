'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  addAllowedOrigin,
  deleteAllowedOrigin,
  fetchAllowedOrigins,
} from '@/lib/api'

export function useAllowedOrigins(projectId: string) {
  return useQuery<string[], Error>({
    queryKey: ['project-allowed-origins', projectId],
    queryFn: () => fetchAllowedOrigins(projectId),
    enabled: !!projectId,
  })
}

export function useAddAllowedOrigin(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<string[], Error, { origin: string }>({
    mutationFn: ({ origin }) => addAllowedOrigin(projectId, origin),
    onSuccess: (origins) => {
      queryClient.setQueryData(['project-allowed-origins', projectId], origins)
    },
  })
}

export function useDeleteAllowedOrigin(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<string[], Error, { origin: string }>({
    mutationFn: ({ origin }) => deleteAllowedOrigin(projectId, origin),
    onSuccess: (origins) => {
      queryClient.setQueryData(['project-allowed-origins', projectId], origins)
    },
  })
}
