import { serve } from '@hono/node-server'

import { loadEnv } from '@docento/config'
import { prisma } from '@docento/domain'

import { createApp } from './app.js'

/**
 * The API process.
 *
 * Configuration is validated once, at startup, and the report lists every
 * problem at once rather than one per restart. A server that starts with an
 * unusable value and fails on the first request that needs it is a server whose
 * failures arrive without context.
 */

function log(message: string, fields: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      level: 'info',
      service: 'api',
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  )
}

async function main(): Promise<void> {
  // Fails fast, with every problem listed. Never throws at import time, which
  // is why it is called here rather than relied upon.
  const env = loadEnv()

  const app = createApp()

  const server = serve(
    {
      fetch: app.fetch,
      port: env.API_PORT,
    },
    (info) => {
      log('API listening', { port: info.port, url: env.API_URL, nodeEnv: env.NODE_ENV })
    },
  )

  /**
   * Graceful shutdown, because a container orchestrator sends `SIGTERM` and
   * then waits.
   *
   * In-flight requests are allowed to finish and the database connection is
   * released, so a deploy does not turn into a burst of failed requests for
   * whoever happened to be mid-call. A second signal exits immediately, which is
   * what an operator pressing Ctrl-C twice expects.
   */
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      log('Second signal, exiting now', { signal })
      process.exit(1)
    }

    shuttingDown = true
    log('Shutting down', { signal })

    server.close(async (error) => {
      if (error) {
        log('Server close failed', { error: error.message })
      }

      try {
        await prisma.$disconnect()
      } catch (disconnectError) {
        log('Database disconnect failed', {
          error:
            disconnectError instanceof Error
              ? disconnectError.message
              : String(disconnectError),
        })
      }

      process.exit(error ? 1 : 0)
    })

    /**
     * A deadline, because a connection that never closes would otherwise hold
     * the process open until the orchestrator escalates to `SIGKILL` — which
     * loses the graceful part anyway.
     */
    setTimeout(() => {
      log('Shutdown deadline reached, exiting')
      process.exit(0)
    }, 10_000).unref()
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  /**
   * A rejected promise nobody handled leaves the process in an undefined state
   * while still appearing healthy, so it is reported rather than swallowed.
   */
  process.on('unhandledRejection', (reason) => {
    console.error(
      JSON.stringify({
        level: 'error',
        service: 'api',
        message: 'unhandled_rejection',
        error: reason instanceof Error ? reason.message : String(reason),
        timestamp: new Date().toISOString(),
      }),
    )
  })
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: 'error',
      service: 'api',
      message: 'failed_to_start',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }),
  )

  process.exit(1)
})
