'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchProjectCollaborators,
  inviteProjectCollaborator,
  removeProjectCollaborator,
  revokeProjectInvitation,
  type InviteCollaboratorResult,
  type ProjectCollaborators,
} from '@/lib/api'

export function useProjectCollaborators(projectId: string) {
  return useQuery<ProjectCollaborators, Error>({
    queryKey: ['project-collaborators', projectId],
    queryFn: () => fetchProjectCollaborators(projectId),
    enabled: !!projectId,
  })
}

export function useInviteProjectCollaborator(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<InviteCollaboratorResult, Error, { email: string }>({
    mutationFn: ({ email }) => inviteProjectCollaborator(projectId, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-collaborators', projectId],
      })
    },
  })
}

export function useRemoveProjectCollaborator(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { memberId: string }>({
    mutationFn: ({ memberId }) => removeProjectCollaborator(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-collaborators', projectId],
      })
    },
  })
}

export function useRevokeProjectInvitation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { invitationId: string }>({
    mutationFn: ({ invitationId }) =>
      revokeProjectInvitation(projectId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-collaborators', projectId],
      })
    },
  })
}
