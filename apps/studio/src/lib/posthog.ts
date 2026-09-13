'use client'

import posthog from 'posthog-js'
import type { Properties } from 'posthog-js'

const POSTHOG_TOKEN =
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

const isConfigured = Boolean(POSTHOG_TOKEN && POSTHOG_HOST)

type IdentifyUserInput = {
  id?: string | null
  email?: string | null
  name?: string | null
}

export function captureEvent(event: string, properties?: Properties) {
  if (!isConfigured) {
    return
  }

  posthog.capture(event, properties)
}

export function identifyUser(user: IdentifyUserInput) {
  if (!isConfigured) {
    return
  }

  const distinctId = user.email ?? user.id
  if (!distinctId) {
    return
  }

  posthog.identify(distinctId, {
    ...(user.email ? { email: user.email } : {}),
    ...(user.name ? { name: user.name } : {}),
  })
}

export function resetAnalytics() {
  if (!isConfigured) {
    return
  }

  posthog.reset()
}

export function getPostHogRequestHeaders(): Record<string, string> {
  if (!isConfigured) {
    return {}
  }

  const headers: Record<string, string> = {}
  const distinctId = posthog.get_distinct_id()
  const sessionId = posthog.get_session_id()

  if (distinctId) {
    headers['X-POSTHOG-DISTINCT-ID'] = distinctId
  }

  if (sessionId) {
    headers['X-POSTHOG-SESSION-ID'] = sessionId
  }

  return headers
}

export function captureClientException(
  error: unknown,
  properties?: Properties & { context?: string },
) {
  if (!isConfigured) {
    return
  }

  if (error instanceof Error) {
    posthog.captureException(error, properties)
    return
  }

  posthog.capture('client_exception_captured', {
    ...properties,
    message: String(error),
  })
}
