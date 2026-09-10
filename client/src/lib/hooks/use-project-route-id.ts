'use client'

import { useParams } from 'next/navigation'

export function useProjectRouteId() {
  const params = useParams()
  const projectIdParam = params?.projectId

  if (Array.isArray(projectIdParam)) {
    return projectIdParam[0]
  }

  return typeof projectIdParam === 'string' ? projectIdParam : ''
}
