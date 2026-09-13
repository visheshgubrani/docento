'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth'

type SessionData = (typeof authClient)['$Infer']['Session']
type SessionPayload = SessionData | { session: SessionData } | null

const ProtectedSessionContext = createContext<SessionData | null>(null)

export const useProtectedSession = () => useContext(ProtectedSessionContext)

type ProtectedRouteProps = {
  children: ReactNode
  redirectTo?: string
}

const resolveSession = (payload: SessionPayload): SessionData | null => {
  if (!payload) return null
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'user' in (payload as Record<string, unknown>)
  ) {
    return payload as SessionData
  }

  if (
    typeof payload === 'object' &&
    'session' in (payload as Record<string, unknown>)
  ) {
    const nested = (payload as { session?: SessionData })?.session
    if (nested) {
      return nested
    }
  }

  return null
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      try {
        const response = await authClient.getSession()
        if (!isMounted) return

        const nextSession = resolveSession(
          (response?.data ?? null) as SessionPayload,
        )

        if (nextSession?.user) {
          setSession(nextSession)
        } else {
          router.replace(redirectTo)
        }
      } catch (error) {
        if (isMounted) {
          router.replace(redirectTo)
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    verifySession()

    return () => {
      isMounted = false
    }
  }, [redirectTo, router])

  const providerValue = useMemo(() => session, [session])

  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dashboard-bg text-sm text-muted-foreground">
        <svg
          fill="#B1A0F5FF"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className="size-10"
        >
          <rect x="1" y="4" width="6" height="14" opacity="1">
            <animate
              id="spinner_aqiq"
              begin="0;spinner_xVBj.end-0.25s"
              attributeName="y"
              dur="0.75s"
              values="1;5"
              fill="freeze"
            />
            <animate
              begin="0;spinner_xVBj.end-0.25s"
              attributeName="height"
              dur="0.75s"
              values="22;14"
              fill="freeze"
            />
            <animate
              begin="0;spinner_xVBj.end-0.25s"
              attributeName="opacity"
              dur="0.75s"
              values="1;.2"
              fill="freeze"
            />
          </rect>
          <rect x="9" y="4" width="6" height="14" opacity=".4">
            <animate
              begin="spinner_aqiq.begin+0.15s"
              attributeName="y"
              dur="0.75s"
              values="1;5"
              fill="freeze"
            />
            <animate
              begin="spinner_aqiq.begin+0.15s"
              attributeName="height"
              dur="0.75s"
              values="22;14"
              fill="freeze"
            />
            <animate
              begin="spinner_aqiq.begin+0.15s"
              attributeName="opacity"
              dur="0.75s"
              values="1;.2"
              fill="freeze"
            />
          </rect>
          <rect x="17" y="4" width="6" height="14" opacity=".3">
            <animate
              id="spinner_xVBj"
              begin="spinner_aqiq.begin+0.3s"
              attributeName="y"
              dur="0.75s"
              values="1;5"
              fill="freeze"
            />
            <animate
              begin="spinner_aqiq.begin+0.3s"
              attributeName="height"
              dur="0.75s"
              values="22;14"
              fill="freeze"
            />
            <animate
              begin="spinner_aqiq.begin+0.3s"
              attributeName="opacity"
              dur="0.75s"
              values="1;.2"
              fill="freeze"
            />
          </rect>
        </svg>
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    )
  }

  if (!session || !session.user) {
    return null
  }

  return (
    <ProtectedSessionContext.Provider value={providerValue}>
      {children}
    </ProtectedSessionContext.Provider>
  )
}
