'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchProjectPaymentSettings,
  saveProjectPaymentSettings,
  type ProjectPaymentSettings,
  type SaveProjectPaymentSettingsInput,
} from '@/lib/api'

export function useProjectPaymentSettings(projectId: string) {
  return useQuery<ProjectPaymentSettings, Error>({
    queryKey: ['project-payment-settings', projectId],
    queryFn: () => fetchProjectPaymentSettings(projectId),
    enabled: !!projectId,
  })
}

export function useSaveProjectPaymentSettings(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, SaveProjectPaymentSettingsInput>({
    mutationFn: (input) => saveProjectPaymentSettings(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-payment-settings', projectId],
      })
    },
  })
}
