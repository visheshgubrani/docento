'use client'

import { useEffect } from 'react'

import { identifyUser } from '@/lib/posthog'

type PostHogUserIdentifyProps = {
  user: {
    id?: string | null
    email?: string | null
    name?: string | null
  }
}

export function PostHogUserIdentify({ user }: PostHogUserIdentifyProps) {
  useEffect(() => {
    identifyUser(user)
  }, [user.email, user.id, user.name])

  return null
}
