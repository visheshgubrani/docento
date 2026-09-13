import type { Request } from 'express'
import { PostHog } from 'posthog-node'

import { logger } from '../utils/logger'

const POSTHOG_TOKEN =
  process.env.POSTHOG_TOKEN ?? process.env.POSTHOG_PROJECT_TOKEN
const POSTHOG_HOST = process.env.POSTHOG_HOST

const POSTHOG_DISTINCT_ID_HEADER = 'x-posthog-distinct-id'
const POSTHOG_SESSION_ID_HEADER = 'x-posthog-session-id'

type AnalyticsProperties = Record<string | number, unknown>

let posthogClient: PostHog | null = null

const isConfigured = Boolean(POSTHOG_TOKEN && POSTHOG_HOST)

const asHeaderString = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0]
  return value
}

const compactProperties = (properties: AnalyticsProperties) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false
      }

      if (typeof value === 'string') {
        return value.trim().length > 0
      }

      return true
    }),
  ) as AnalyticsProperties

const getPostHogClient = () => {
  if (!isConfigured) {
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_TOKEN!, {
      host: POSTHOG_HOST,
    })
  }

  return posthogClient
}

const getActorKind = (req: Request) => {
  if (req.endUser) return 'end_user'
  if (req.user) return 'dashboard_user'
  if (req.apiKeyAuth) return 'api_key'
  return 'anonymous'
}

export const getAnalyticsDistinctId = (req: Request) => {
  const headerDistinctId = asHeaderString(
    req.headers[POSTHOG_DISTINCT_ID_HEADER],
  )?.trim()

  if (headerDistinctId) {
    return headerDistinctId
  }

  if (req.user) {
    return req.user.email ?? req.user.id
  }

  if (req.endUser) {
    return req.endUser.email ?? req.endUser.externalId ?? req.endUser.id
  }

  return undefined
}

const getAnalyticsSessionId = (req: Request) =>
  asHeaderString(req.headers[POSTHOG_SESSION_ID_HEADER])?.trim()

const getBaseProperties = (req: Request): AnalyticsProperties =>
  compactProperties({
    source: 'server',
    actor_kind: getActorKind(req),
    request_id: req.requestId,
    request_method: req.method,
    request_path: req.originalUrl || req.path,
    user_id: req.user?.id,
    end_user_id: req.endUser?.id,
    project_id: req.project?.id,
    course_id: req.course?.id,
    module_id: req.module?.id,
    lesson_id: req.lesson?.id,
    api_key_type: req.apiKeyAuth?.type,
    api_key_id: req.apiKeyAuth?.keyId,
    $session_id: getAnalyticsSessionId(req),
  })

export const captureServerEvent = (
  req: Request,
  event: string,
  properties: AnalyticsProperties = {},
) => {
  const client = getPostHogClient()

  if (!client) {
    return
  }

  try {
    client.capture({
      distinctId: getAnalyticsDistinctId(req),
      event,
      groups: req.project ? { project: req.project.id } : undefined,
      properties: compactProperties({
        ...getBaseProperties(req),
        ...properties,
      }),
    })
  } catch (error) {
    logger.warn('PostHog event capture failed', {
      event,
      error,
      requestId: req.requestId,
    })
  }
}

export const captureServerException = (
  error: unknown,
  req: Request,
  properties: AnalyticsProperties = {},
) => {
  const client = getPostHogClient()

  if (!client) {
    return
  }

  try {
    client.captureException(error, getAnalyticsDistinctId(req), {
      ...getBaseProperties(req),
      ...compactProperties(properties),
    })
  } catch (captureError) {
    logger.warn('PostHog exception capture failed', {
      error: captureError,
      requestId: req.requestId,
    })
  }
}

export const flushPostHog = async () => {
  if (!posthogClient) {
    return
  }

  try {
    await posthogClient.flush()
  } catch (error) {
    logger.warn('PostHog flush failed', { error })
  }
}
