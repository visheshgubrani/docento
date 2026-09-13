import { NextFunction, Request, Response } from 'express'

import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'

const CACHE_TTL_MS = 5 * 60 * 1000
const FALLBACK_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3005',
  'http://localhost:5173',
]

let cachedOrigins: Set<string> = new Set()
let cacheExpiresAt = 0
let cacheRefreshInFlight: Promise<Set<string>> | null = null

const isCorsDebugEnabled = process.env.CORS_DEBUG === 'true'

export const normalizeOrigin = (origin?: string | null): string | null => {
  if (!origin) return null
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.origin
  } catch {
    return origin.trim() || null
  }
}

const collectOriginsFromEnv = () => {
  const raw = process.env.CLIENT_ORIGIN
  const envOrigins = raw ? raw.split(',').map((item) => item.trim()) : []
  return [...envOrigins, ...FALLBACK_ORIGINS]
    .map((value) => normalizeOrigin(value))
    .filter(Boolean) as string[]
}

const fetchOriginsFromDb = async (): Promise<Set<string>> => {
  const origins = new Set<string>()
  collectOriginsFromEnv().forEach((origin) => origins.add(origin))

  try {
    const projects = await prisma.project.findMany({
      select: { allowedOrigins: true },
    })

    projects.forEach((project) => {
      project.allowedOrigins?.forEach((origin) => {
        const normalized = normalizeOrigin(origin)
        if (normalized) origins.add(normalized)
      })
    })
  } catch (error) {
    console.warn(
      '[CORS_WARNING] Failed to fetch origins from DB, using fallback only.',
    )
  }

  return origins
}

const refreshOriginsCache = async (): Promise<Set<string>> => {
  if (cacheRefreshInFlight) return cacheRefreshInFlight

  cacheRefreshInFlight = (async () => {
    cachedOrigins = await fetchOriginsFromDb()
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return cachedOrigins
  })()

  try {
    return await cacheRefreshInFlight
  } finally {
    cacheRefreshInFlight = null
  }
}

const getCachedOrigins = async () => {
  const now = Date.now()
  if (!cachedOrigins.size) {
    // Always allow env/fallback origins immediately, then refresh from DB in background.
    cachedOrigins = new Set(collectOriginsFromEnv())
    cacheExpiresAt = now + CACHE_TTL_MS
    void refreshOriginsCache().catch((error) => {
      console.warn(
        '[CORS_WARNING] Initial background origin cache refresh failed.',
        error,
      )
    })
    return cachedOrigins
  }

  if (cacheExpiresAt <= now) {
    void refreshOriginsCache().catch((error) => {
      console.warn(
        '[CORS_WARNING] Background origin cache refresh failed.',
        error,
      )
    })
  }

  return cachedOrigins
}

export const refreshAllowedOriginsCache = async () => {
  return refreshOriginsCache()
}

export const appendOriginToCache = (origin: string) => {
  const normalized = normalizeOrigin(origin)
  if (!normalized) return
  cachedOrigins.add(normalized)
}

export const dropOriginFromCache = (origin: string) => {
  const normalized = normalizeOrigin(origin)
  if (!normalized) return
  cachedOrigins = new Set(
    [...cachedOrigins].filter((item) => normalizeOrigin(item) !== normalized),
  )
}

export const dynamicCors = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const originHeader = req.headers.origin
    const normalizedHeader = normalizeOrigin(originHeader)
    const allowlist = await getCachedOrigins()

    const isAllowed =
      !originHeader || (normalizedHeader && allowlist.has(normalizedHeader))

    if (isCorsDebugEnabled) {
      console.log('[CORS_DEBUG]', {
        originHeader,
        normalizedHeader,
        allowlistSize: allowlist.size,
        isAllowed,
      })
    }

    if (!isAllowed) {
      if (req.method === 'OPTIONS') {
        return res.status(403).json({
          success: false,
          message: 'CORS: Origin not allowed',
        })
      }
      return next(new ApiError(403, 'CORS: Origin not allowed'))
    }

    // Reflect the request origin if allowed so cookies can be sent.
    if (originHeader) {
      res.header('Access-Control-Allow-Origin', originHeader)
    } else {
      const [fallback] = collectOriginsFromEnv()
      if (fallback) {
        res.header('Access-Control-Allow-Origin', fallback)
      }
    }

    res.header('Vary', 'Origin')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    )
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Publishable-Key, X-Api-Key, X-PostHog-Distinct-Id, X-PostHog-Session-Id, Tus-Resumable, Upload-Length, Upload-Metadata',
    )

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }

    return next()
  } catch (error) {
    console.error('[DYNAMIC_CORS_ERROR]', error)
    return next(new ApiError(500, 'Failed to process CORS'))
  }
}
