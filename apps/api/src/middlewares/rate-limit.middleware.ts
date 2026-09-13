import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const minutes = (value: number) => value * 60 * 1000
const hours = (value: number) => value * 60 * 60 * 1000

const readPositiveNumber = (name: string, fallback: number) => {
  const rawValue = process.env[name]
  if (!rawValue) return fallback

  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const getIpRateLimitKey = (req: Request) =>
  ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')

const extractApiKeyFromRequest = (req: Request) => {
  const authorization = req.headers.authorization
  const bearerToken =
    authorization && authorization.startsWith('Bearer ')
      ? authorization.split(' ')[1]
      : undefined

  const xPublishableKey = req.headers['x-publishable-key']
  const xApiKey = req.headers['x-api-key']

  return (
    (Array.isArray(xPublishableKey) ? xPublishableKey[0] : xPublishableKey) ||
    (Array.isArray(xApiKey) ? xApiKey[0] : xApiKey) ||
    bearerToken
  )
}

const getRetryAfterSeconds = (req: Request, windowMs: number) => {
  const resetTime = (req as any).rateLimit?.resetTime

  if (resetTime instanceof Date) {
    return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
  }

  return Math.max(1, Math.ceil(windowMs / 1000))
}

const createRateLimitHandler =
  (message: string, windowMs: number) => (req: Request, res: Response) => {
    const retryAfter = getRetryAfterSeconds(req, windowMs)

    res.setHeader('Retry-After', retryAfter.toString())
    res.status(429).json({
      success: false,
      message,
      retryAfter,
    })
  }

const createRateLimiter = ({
  windowMs,
  limit,
  message,
  keyGenerator,
  skip,
}: {
  windowMs: number
  limit: number
  message: string
  keyGenerator?: (req: Request, res: Response) => string | Promise<string>
  skip?: (req: Request, res: Response) => boolean | Promise<boolean>
}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    skip,
    handler: createRateLimitHandler(message, windowMs),
  })

const authWindowMs = readPositiveNumber(
  'AUTH_RATE_LIMIT_WINDOW_MS',
  minutes(15),
)
const authLimit = readPositiveNumber('AUTH_RATE_LIMIT_MAX', 10)

const passwordResetWindowMs = readPositiveNumber(
  'PASSWORD_RESET_RATE_LIMIT_WINDOW_MS',
  hours(1),
)
const passwordResetLimit = readPositiveNumber(
  'PASSWORD_RESET_RATE_LIMIT_MAX',
  3,
)

const apiKeyWindowMs = readPositiveNumber(
  'API_KEY_RATE_LIMIT_WINDOW_MS',
  minutes(1),
)
const apiKeyLimit = readPositiveNumber('API_KEY_RATE_LIMIT_MAX', 300)

const storefrontWindowMs = readPositiveNumber(
  'STOREFRONT_RATE_LIMIT_WINDOW_MS',
  minutes(15),
)
const storefrontLimit = readPositiveNumber('STOREFRONT_RATE_LIMIT_MAX', 400)

const webhookWindowMs = readPositiveNumber(
  'WEBHOOK_RATE_LIMIT_WINDOW_MS',
  minutes(1),
)
const webhookLimit = readPositiveNumber('WEBHOOK_RATE_LIMIT_MAX', 1000)

export const markSkipApiKeyRateLimit = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  req.skipApiKeyRateLimit = true
  next()
}

export const signUpRateLimiter = createRateLimiter({
  windowMs: authWindowMs,
  limit: authLimit,
  message: 'Too many sign-up attempts from this IP. Please try again later.',
  keyGenerator: (req) => `auth:signup:${getIpRateLimitKey(req)}`,
})

export const signInRateLimiter = createRateLimiter({
  windowMs: authWindowMs,
  limit: authLimit,
  message: 'Too many sign-in attempts from this IP. Please try again later.',
  keyGenerator: (req) => `auth:signin:${getIpRateLimitKey(req)}`,
})

export const delegatedLoginRateLimiter = createRateLimiter({
  windowMs: authWindowMs,
  limit: authLimit,
  message:
    'Too many delegated login attempts from this IP. Please try again later.',
  keyGenerator: (req) => `auth:delegated:${getIpRateLimitKey(req)}`,
})

export const passwordResetRequestRateLimiter = createRateLimiter({
  windowMs: passwordResetWindowMs,
  limit: passwordResetLimit,
  message:
    'Too many password reset requests from this IP. Please try again later.',
  keyGenerator: (req) => `auth:forgot-password:${getIpRateLimitKey(req)}`,
})

export const passwordResetConfirmRateLimiter = createRateLimiter({
  windowMs: passwordResetWindowMs,
  limit: passwordResetLimit,
  message:
    'Too many password reset attempts from this IP. Please try again later.',
  keyGenerator: (req) => `auth:reset-password:${getIpRateLimitKey(req)}`,
})

const apiKeyRateLimiter = createRateLimiter({
  windowMs: apiKeyWindowMs,
  limit: apiKeyLimit,
  message:
    'Too many requests for this API key. Please retry after the delay in the Retry-After header.',
  keyGenerator: (req) => {
    if (req.apiKeyAuth?.type === 'secret' && req.apiKeyAuth.keyId) {
      return `api-key:secret:${req.apiKeyAuth.keyId}`
    }

    if (req.apiKeyAuth?.type === 'publishable' && req.project?.id) {
      return `api-key:publishable:${req.project.id}`
    }

    const extractedApiKey = extractApiKeyFromRequest(req)
    if (extractedApiKey) {
      return `api-key:fallback:${crypto
        .createHash('sha256')
        .update(extractedApiKey)
        .digest('hex')}`
    }

    return `api-key:ip:${getIpRateLimitKey(req)}`
  },
  skip: (req) => !req.apiKeyAuth || req.skipApiKeyRateLimit === true,
})

export const applyApiKeyRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction,
) => apiKeyRateLimiter(req, res, next)

export const storefrontRateLimiter = createRateLimiter({
  windowMs: storefrontWindowMs,
  limit: storefrontLimit,
  message:
    'Too many storefront requests from this IP. Please retry after the delay in the Retry-After header.',
  keyGenerator: (req) => `storefront:${getIpRateLimitKey(req)}`,
})

export const webhookRateLimiter = createRateLimiter({
  windowMs: webhookWindowMs,
  limit: webhookLimit,
  message:
    'Too many webhook deliveries from this IP. Please retry after the delay in the Retry-After header.',
  keyGenerator: (req) => `webhook:${getIpRateLimitKey(req)}`,
})
