import { PrismaClient } from '@prisma/client'

/**
 * The single Prisma client for the process.
 *
 * A global is used in development so that hot reloading does not open a new
 * connection pool on every change, which exhausts Postgres connections quickly
 * and produces confusing "too many clients" errors.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export type { PrismaClient }
