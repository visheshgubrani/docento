import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const isQueryDebug = process.env.PRISMA_QUERY_DEBUG === 'true'

const prismaLogConfig = isQueryDebug
  ? [
      { emit: 'event' as const, level: 'query' as const },
      { emit: 'event' as const, level: 'warn' as const },
      { emit: 'event' as const, level: 'error' as const },
    ]
  : [
      { emit: 'event' as const, level: 'warn' as const },
      { emit: 'event' as const, level: 'error' as const },
    ]

export const prisma = new PrismaClient({
  log: prismaLogConfig,
})

prisma.$on('warn' as never, (event: any) => {
  logger.warn('Prisma warning', {
    target: event.target,
    message: event.message,
  })
})

prisma.$on('error' as never, (event: any) => {
  logger.error('Prisma error', {
    target: event.target,
    message: event.message,
  })
})

if (isQueryDebug) {
  prisma.$on('query' as never, (e: any) => {
    logger.debug('Prisma query', {
      durationMs: e.duration,
      query: e.query,
      params: e.params,
      target: e.target,
    })
  })
}
