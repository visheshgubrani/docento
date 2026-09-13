'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  fetchProjectWebhook,
  saveProjectWebhook,
  sendTestProjectWebhook,
  type ProjectWebhook,
  type ProjectWebhookEvent,
  type SaveProjectWebhookInput,
} from '@/lib/api'

export function useProjectWebhook(projectId: string) {
  return useQuery<ProjectWebhook, Error>({
    queryKey: ['project-webhook', projectId],
    queryFn: () => fetchProjectWebhook(projectId),
    enabled: !!projectId,
  })
}

export function useSaveProjectWebhook(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ProjectWebhook, Error, SaveProjectWebhookInput>({
    mutationFn: (input) => saveProjectWebhook(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-webhook', projectId],
      })
    },
  })
}

export function useSendTestWebhook(projectId: string) {
  return useMutation<void, Error, { event?: ProjectWebhookEvent }>({
    mutationFn: ({ event }) => sendTestProjectWebhook(projectId, event),
  })
}
