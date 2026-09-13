import 'dotenv/config'
import './instrument'
import './utils/logger'
import express, { Request, Response } from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import * as Sentry from '@sentry/node'
import { auth } from './lib/auth'
import { toNodeHandler } from 'better-auth/node'
import routes from './routes'
import { setupSwagger } from './utils/swagger'
import {
  dynamicCors,
  refreshAllowedOriginsCache,
} from './middlewares/cors.middleware'
import errorHandler from './middlewares/errorHandler'
import { requestContextMiddleware } from './middlewares/request-context.middleware'
import { logger } from './utils/logger'

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')

const isProduction = process.env.NODE_ENV === 'production'
const isRequestTimingDebugEnabled = process.env.REQUEST_TIMING_DEBUG === 'true'

app.use(requestContextMiddleware)

if (isRequestTimingDebugEnabled) {
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint()
    const middlewareTimings: Array<{ name: string; ms: number }> = []
    ;(req as any).__mwTimings = middlewareTimings
    ;(req as any).__mwLast = startedAt

    res.on('finish', () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
      logger.info('Request timing', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(elapsedMs.toFixed(2)),
        middlewareTimings,
      })
    })

    next()
  })
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    referrerPolicy: {
      policy: 'no-referrer',
    },
  }),
)

app.use(dynamicCors)

// Warm the dynamic CORS cache without blocking startup.
void refreshAllowedOriginsCache().catch((error) => {
  logger.warn('Initial origin cache warmup failed', { error })
})

app.all('/api/auth/*splat', toNodeHandler(auth))
app.use(
  express.json({
    verify: (req, _res, buf) => {
      ;(req as any).rawBody = buf
    },
  }),
)
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Swagger Documentation
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app)
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  })
})

app.use('/api/v1', routes)
Sentry.setupExpressErrorHandler(app)
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
  })

  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    requestId: req.requestId,
  })
})

export default app
