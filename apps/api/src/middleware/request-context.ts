import { randomUUID } from 'node:crypto'

import type { Context, MiddlewareHandler } from 'hono'

import { REQUEST_ID_HEADER } from '@docento/contracts'

/**
 * Request identity and access logging.
 *
 * Every request gets a `requestId`, echoed in the `x-request-id` header and
 * included in every response's `meta`. That is what turns "it said forbidden"
 * into a log line: the id a user can read off the screen is the id in the
 * server's output.
 *
 * A caller may supply its own via the header, so a request already traced
 * upstream keeps one id rather than acquiring a second at this boundary.
 */

export type RequestContext = {
  requestId: string
  method: string
  path: string
  startedAt: number
  /** Set once the response is known, so the access log is one line per request. */
  status?: number
}

declare module 'hono' {
  interface ContextVariableMap {
    request: RequestContext
  }
}

/** Truncated to the header limit, and never trusted for anything but logging. */
function sanitiseRequestId(value: string | undefined): string | null {
  if (!value) return null

  const trimmed = value.trim()

  if (trimmed.length === 0 || trimmed.length > 128) return null

  return trimmed
}

export function requestContext(): MiddlewareHandler {
  return async (c, next) => {
    const requestId =
      sanitiseRequestId(c.req.header(REQUEST_ID_HEADER)) ?? randomUUID()

    c.set('request', {
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      startedAt: Date.now(),
    })

    c.header(REQUEST_ID_HEADER, requestId)

    try {
      await next()
    } finally {
      const context = c.get('request')
      const status = c.res.status

      /**
       * One line per request, including failures.
       *
       * `console.log` rather than a logging library: the deployment target is a
       * container whose stdout is collected, and a structured line is what a
       * collector needs. `ARCHITECTURE.md` promises structured output, not a
       * particular library.
       */
      if (context.path !== '/health') {
        console.log(
          JSON.stringify({
            level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
            service: 'api',
            message: 'request',
            requestId,
            method: context.method,
            path: context.path,
            status,
            durationMs: Date.now() - context.startedAt,
            timestamp: new Date().toISOString(),
          }),
        )
      }
    }
  }
}

/** The current request's context. Throws if the middleware is not installed. */
export function requestOf(c: Context): RequestContext {
  const context = c.get('request')

  if (!context) {
    throw new Error(
      'Request context is missing. The requestContext() middleware must be installed before any route.',
    )
  }

  return context
}
