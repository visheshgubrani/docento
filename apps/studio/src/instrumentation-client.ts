// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    enableLogs: true,
    sendDefaultPii: true,
  })
}

const posthogToken =
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

if (posthogToken && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
  posthog.init(posthogToken, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })
} else if (process.env.NODE_ENV === 'development') {
  console.warn(
    'PostHog is disabled because NEXT_PUBLIC_POSTHOG_TOKEN and/or NEXT_PUBLIC_POSTHOG_HOST are missing.',
  )
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
