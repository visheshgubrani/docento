'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { useProtectedSession } from '@/components/auth/protected-route'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const projectId = useProjectRouteId()
  const session = useProtectedSession()
  const { data: project, isLoading } = useProject(projectId)

  const isOwner = Boolean(
    project?.ownerId && session?.user?.id && project.ownerId === session.user.id
  )

  useEffect(() => {
    if (!projectId || isLoading || !project) return

    if (!isOwner) {
      router.replace(`/p/${projectId}/overview`)
    }
  }, [isLoading, isOwner, project, projectId, router])

  if (isLoading || !project) {
    return (
      <div className='flex min-h-[280px] items-center justify-center'>
        <Loader2 className='size-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className='flex min-h-[280px] items-center justify-center text-sm text-muted-foreground'>
        Redirecting...
      </div>
    )
  }

  return <>{children}</>
}
