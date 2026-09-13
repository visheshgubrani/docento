import { Request, Response, NextFunction } from 'express'
import { captureServerException } from '../lib/posthog'
import ApiError from '../utils/ApiError'
import { logger } from '../utils/logger'

// Centralized error handler to return consistent JSON responses
const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) return next(err)

  const status = err instanceof ApiError ? err.statusCode : 500
  const message =
    err instanceof ApiError ? err.message : 'Internal Server Error'
  const errors = err instanceof ApiError ? err.errors : []
  const data = err instanceof ApiError ? err.data : null

  if (status >= 500) {
    captureServerException(err, req, {
      status_code: status,
      error_message: message,
    })
  }

  logger.error('Request failed', {
    statusCode: status,
    method: req.method,
    path: req.originalUrl || req.path,
    error: err,
  })

  return res.status(status).json({
    success: false,
    message,
    errors,
    data,
    requestId: req.requestId,
  })
}

export default errorHandler
