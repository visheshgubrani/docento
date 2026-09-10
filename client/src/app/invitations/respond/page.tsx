'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { ApiError, respondToProjectInvitation } from '@/lib/api'

type Action = 'accept' | 'reject'
type ViewState = 'idle' | 'processing' | 'success' | 'error'

type ResponsePayload = {
  projectName?: string
}

function InvitationRespondFallback() {
  return (
    <main className='min-h-screen bg-background text-foreground px-4 py-16'>
      <section className='mx-auto w-full max-w-xl rounded-sm border border-neutral-200 bg-background p-8 text-center space-y-4'>
        <Loader2 className='mx-auto h-8 w-8 animate-spin text-muted-foreground' />
        <h1 className='text-2xl font-semibold'>Processing invitation...</h1>
        <p className='text-sm text-muted-foreground'>
          Please wait while we load your invitation details.
        </p>
      </section>
    </main>
  )
}

function InvitationRespondContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const action = useMemo<Action | null>(() => {
    const actionParam = searchParams.get('action')
    if (actionParam === 'accept') return 'accept'
    if (actionParam === 'reject') return 'reject'
    return null
  }, [searchParams])

  const [state, setState] = useState<ViewState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [payload, setPayload] = useState<ResponsePayload>({})
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (hasTriggered.current) return
    hasTriggered.current = true

    if (!token) {
      setState('error')
      setErrorMessage('Missing invitation token.')
      return
    }

    if (!action) {
      setState('error')
      setErrorMessage('Invalid invitation action.')
      return
    }

    setState('processing')

    void respondToProjectInvitation(token, action)
      .then((response) => {
        setPayload({ projectName: response.project?.name })
        setState('success')
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          const redirectPath = `/invitations/respond?token=${encodeURIComponent(token)}&action=${action}`
          window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`
          return
        }

        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to process this invitation.'
        setErrorMessage(message)
        setState('error')
      })
  }, [action, token])

  return (
    <main className='min-h-screen bg-background text-foreground px-4 py-16'>
      <section className='mx-auto w-full max-w-xl rounded-sm border border-neutral-200 bg-background p-8 text-center space-y-4'>
        {state === 'processing' || state === 'idle' ? (
          <>
            <Loader2 className='mx-auto h-8 w-8 animate-spin text-muted-foreground' />
            <h1 className='text-2xl font-semibold'>Processing invitation...</h1>
            <p className='text-sm text-muted-foreground'>Please wait while we confirm your response.</p>
          </>
        ) : null}

        {state === 'success' ? (
          <>
            {action === 'accept' ? (
              <CheckCircle2 className='mx-auto h-9 w-9 text-emerald-600' />
            ) : (
              <XCircle className='mx-auto h-9 w-9 text-amber-600' />
            )}
            <h1 className='text-2xl font-semibold'>
              {action === 'accept' ? 'Invitation accepted' : 'Invitation rejected'}
            </h1>
            <p className='text-sm text-muted-foreground'>
              {payload.projectName
                ? `Project: ${payload.projectName}`
                : 'Your response has been recorded.'}
            </p>
            <div className='pt-2'>
              <Link href='/projects' className='text-sm font-medium underline underline-offset-4'>
                Go to projects
              </Link>
            </div>
          </>
        ) : null}

        {state === 'error' ? (
          <>
            <XCircle className='mx-auto h-9 w-9 text-destructive' />
            <h1 className='text-2xl font-semibold'>Could not process invitation</h1>
            <p className='text-sm text-muted-foreground'>{errorMessage}</p>
            <div className='pt-2'>
              <Link href='/login' className='text-sm font-medium underline underline-offset-4'>
                Sign in and try again
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}

export default function InvitationRespondPage() {
  return (
    <Suspense fallback={<InvitationRespondFallback />}>
      <InvitationRespondContent />
    </Suspense>
  )
}
