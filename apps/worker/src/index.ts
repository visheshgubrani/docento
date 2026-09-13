import { loadEnv } from '@docento/config'
import { prisma } from '@docento/domain/db'
import { pruneRateLimits } from '@docento/domain/rate-limit'
import { createJobQueue, type JobQueue } from '@docento/integrations/jobs'

/**
 * The Docento background worker.
 *
 * A separate process from the API on purpose: a slow job must not be able to
 * starve request handling, and a worker restart must not drop in-flight HTTP
 * requests. Both processes share one domain implementation and one database —
 * the worker calls exactly the same operations the API does, never its own
 * version of a business rule.
 *
 * See ARCHITECTURE.md, "Reliability".
 */

const log = (message: string, fields: Record<string, unknown> = {}) => {
  // Structured output so log aggregation does not need a parser per message.
  console.log(
    JSON.stringify({
      level: 'info',
      service: 'worker',
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  )
}

const logError = (message: string, error: unknown, fields: Record<string, unknown> = {}) => {
  console.error(
    JSON.stringify({
      level: 'error',
      service: 'worker',
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      ...fields,
    }),
  )
}

/**
 * Register every job handler.
 *
 * Kept in one place so the set of work this process can do is reviewable, and
 * so a job that is declared but never handled is obvious rather than silent.
 *
 * Handlers must be idempotent. pg-boss guarantees at-least-once delivery: a job
 * that fails after its side effect has landed is retried, and duplicate side
 * effects are worse than a duplicate attempt.
 */
async function registerHandlers(queue: JobQueue): Promise<void> {
  await queue.work('maintenance.prune-rate-limits', async () => {
    const removed = await pruneRateLimits()
    log('Pruned expired rate-limit counters', { removed })
  })

  await queue.work('webhook.deliver', async (payload) => {
    // Not implemented until outbound delivery lands in Milestone D. Declared so
    // the queue exists and the payload contract is fixed; throwing here keeps
    // the gap visible instead of silently dropping deliveries.
    throw new Error(
      `webhook.deliver is not implemented yet (delivery ${payload.deliveryId}).`,
    )
  })

  await queue.work('email.send', async (payload) => {
    // Not implemented until the email integration lands in Milestone B.
    throw new Error(
      `email.send is not implemented yet (template "${payload.template}").`,
    )
  })
}

async function main(): Promise<void> {
  // Fail fast, and report every configuration problem at once rather than one
  // per restart.
  const env = loadEnv()

  log('Worker starting', {
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
  })

  const queue = createJobQueue({
    connectionString: env.DATABASE_URL,
  })

  await queue.start()
  await registerHandlers(queue)

  log('Worker ready', { handlers: queue.registeredHandlers() })

  // --- Graceful shutdown ---------------------------------------------------
  // On SIGTERM the orchestrator is asking this process to finish and exit. Stop
  // accepting new work, let in-flight jobs complete, then release the database.
  let shuttingDown = false

  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true

    log('Worker shutting down', { signal })

    try {
      await queue.stop()
    } catch (error) {
      logError('Failed to stop the job queue cleanly', error)
    }

    try {
      await prisma.$disconnect()
    } catch (error) {
      logError('Failed to disconnect from the database', error)
    }

    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  // A rejected promise nobody handled would otherwise leave the process in an
  // undefined state while still appearing healthy.
  process.on('unhandledRejection', (reason) => {
    logError('Unhandled promise rejection', reason)
  })
}

main().catch((error) => {
  logError('Worker failed to start', error)
  process.exit(1)
})
