'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchProjectEndUsers,
  createEndUser,
  updateEndUserStatus,
  type EndUser,
  type CreateEndUserInput,
  type EndUserList,
  type EndUserStatus,
} from '@/lib/api'

export type UseProjectEndUsersOptions = {
  search?: string
  page?: number
  limit?: number
}

export function useProjectEndUsers(
  projectId: string,
  options: UseProjectEndUsersOptions = {},
) {
  return useQuery<EndUserList, Error>({
    queryKey: [
      'project-end-users',
      projectId,
      options.search ?? '',
      options.page ?? 1,
      options.limit ?? 20,
    ],
    queryFn: () =>
      fetchProjectEndUsers(projectId, {
        search: options.search,
        page: options.page,
        limit: options.limit,
      }),
    enabled: !!projectId,
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateEndUser(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<EndUser, Error, CreateEndUserInput>({
    mutationFn: (input) => createEndUser(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-end-users', projectId],
      })
    },
  })
}

export function useUpdateEndUserStatus(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    EndUser,
    Error,
    { endUserId: string; status: EndUserStatus }
  >({
    mutationFn: ({ endUserId, status }) =>
      updateEndUserStatus(projectId, endUserId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-end-users', projectId],
      })
    },
  })
}
