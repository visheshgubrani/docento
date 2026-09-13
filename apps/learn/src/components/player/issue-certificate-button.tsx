'use client'

import { useState } from 'react'

import { browserApiClient, messageFor } from '@/lib/client-api'
import { Button } from '@/components/ui/button'

/**
 * Ask for a certificate.
 *
 * An explicit action, because issuing one is a durable effect: the page it
 * replaces did it during a render, and a render can happen more than once. The
 * API is idempotent either way, which is why this is a correctness improvement
 * rather than a fix for a data-loss bug — but a write on a read is a thing that
 * eventually does something surprising.
 *
 * The key is stable across retries of one request, so an impatient second press
 * returns the certificate the first press created rather than a second one.
 */
export function IssueCertificateButton({ courseId }: { courseId: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [key] = useState(() => `certificate-${courseId}-${crypto.randomUUID()}`)

  const issue = async () => {
    setPending(true)
    setError(null)

    try {
      const api = browserApiClient()
      await api.requestCertificate(courseId, key)

      // A full navigation, so the page renders what the API now holds rather
      // than a cached render from before issuance.
      window.location.reload()
    } catch (caught) {
      setError(messageFor(caught))
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        You have completed every required lesson.
      </p>

      <Button onClick={issue} disabled={pending}>
        {pending ? 'Issuing…' : 'Get your certificate'}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
