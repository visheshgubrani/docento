'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createProjectCoupon,
  fetchProjectCoupons,
  updateProjectCouponStatus,
  type CreateProjectCouponInput,
  type ProjectCoupon,
  type ProjectCouponStatus,
} from '@/lib/api'

const couponsQueryKey = (projectId: string) =>
  ['project-coupons', projectId] as const

export function useProjectCoupons(projectId: string) {
  return useQuery<ProjectCoupon[], Error>({
    queryKey: couponsQueryKey(projectId),
    queryFn: () => fetchProjectCoupons(projectId),
    enabled: !!projectId,
  })
}

export function useCreateProjectCoupon(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ProjectCoupon, Error, CreateProjectCouponInput>({
    mutationFn: (input) => createProjectCoupon(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: couponsQueryKey(projectId),
      })
    },
  })
}

export function useUpdateProjectCouponStatus(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    ProjectCoupon,
    Error,
    { couponId: string; status: ProjectCouponStatus }
  >({
    mutationFn: ({ couponId, status }) =>
      updateProjectCouponStatus(projectId, couponId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: couponsQueryKey(projectId),
      })
    },
  })
}
