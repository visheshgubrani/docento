import './instrument'
import './utils/logger'
import app from './app'
import { prisma } from './lib/prisma'
import { flushPostHog } from './lib/posthog'
import { logger } from './utils/logger'

const port = process.env.PORT || 4000
let server: ReturnType<typeof app.listen> | null = null
let isShuttingDown = false
const requiredEnvVars = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'] as const

const validateRequiredEnvVars = () => {
  const missingEnvVars = requiredEnvVars.filter((envVar) => {
    const value = process.env[envVar]
    return typeof value !== 'string' || value.trim().length === 0
  })

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    )
  }
}

const closeServer = () =>
  new Promise<void>((resolve, reject) => {
    if (!server) {
      resolve()
      return
    }

    server.close((error?: Error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  logger.info(`${signal} received, shutting down gracefully`)

  try {
    await closeServer()
    await flushPostHog()
    await prisma.$disconnect()
    await logger.flush()
    process.exit(0)
  } catch (error) {
    logger.error('Graceful shutdown failed', { signal, error })
    try {
      await logger.flush()
    } finally {
      process.exit(1)
    }
  }
}

const startServer = async () => {
  validateRequiredEnvVars()

  try {
    await prisma.$connect()
    logger.info('Prisma connected')
  } catch (error) {
    logger.warn('Prisma preconnect failed, continuing startup', { error })
  }

  server = app.listen(port, () => {
    logger.info('Server started', {
      port: Number(port),
      url: `http://localhost:${port}`,
    })
    logger.info('Environment configuration loaded', {
      jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
      refreshTokenSecretConfigured: Boolean(process.env.REFRESH_TOKEN_SECRET),
    })
  })
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM')
})

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT')
})

void startServer()
