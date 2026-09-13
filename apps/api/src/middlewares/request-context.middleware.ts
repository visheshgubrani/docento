import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

import {
  logger,
  getRequestIdFromHeaders,
  runWithLogContext,
} from '../utils/logger'

const REQUEST_ID_HEADER = 'x-request-id'

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for']
  const rawForwarded = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor

  if (rawForwarded) {
    const [clientIp = ''] = rawForwarded.split(',')
    const normalized = clientIp.trim()
    if (normalized) return normalized
  }

  return req.ip || req.socket.remoteAddress || null
}

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = getRequestIdFromHeaders(req.headers) || randomUUID()
  const userAgent = Array.isArray(req.headers['user-agent'])
    ? req.headers['user-agent'][0]
    : req.headers['user-agent']

  req.requestId = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)

  const context = {
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: getClientIp(req),
    userAgent: userAgent || null,
  }

  const startedAt = process.hrtime.bigint()
  const shouldSkipAccessLog = req.path === '/health'
  let finished = false

  res.on('finish', () => {
    finished = true

    if (shouldSkipAccessLog) return

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    runWithLogContext(context, () => {
      logger.info('HTTP request completed', {
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        contentLength: res.getHeader('content-length') || null,
      })
    })
  })

  res.on('close', () => {
    if (finished || shouldSkipAccessLog) return

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    runWithLogContext(context, () => {
      logger.warn('HTTP request closed before response finished', {
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      })
    })
  })

  runWithLogContext(context, () => next())
}
