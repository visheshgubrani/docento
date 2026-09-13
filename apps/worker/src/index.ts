import { loadEnv, loadIntegration } from '@docento/config'
import { prisma } from '@docento/domain'
import {
  type EmailProvider,
  type JobQueue,
  type StorageAdapter,
  createEmailProvider,
  createJobQueue,
  createStorage,
  formatSender,
  renderTemplate,
} from '@docento/integrations'

import { mediaGcJob, pruneRateLimitsJob } from './jobs.js'

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

function log(message: string, fields: Record<string, unknown> = {}): void {
  // Structured output, so log aggregation does not need a parser per message.
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

function logError(
  message: string,
  error: unknown,
  fields: Record<string, unknown> = {},
): void {
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
 * Build the adapters the environment describes.
 *
 * ## Both integrations read from the loader, not the core schema
 *
 * `STORAGE_DRIVER` and `EMAIL_PROVIDER` live in their integration's own schema
 * because they are only meaningful together with the fields beside them. Reading
 * them from the core environment would mean this function could see
 * `STORAGE_DRIVER=s3` while the bucket fields it needs were, from its point of
 * view, absent.
 *
 * ## Storage has no silent fallback; email has a default
 *
 * An install configured for S3 and quietly given local disk scatters uploads
 * across a container's ephemeral filesystem, and nothing says so until a video
 * is missing — so `createStorage` raises. Email is the opposite: the console
 * provider is a real answer, and it is what makes a fresh install complete
 * without a mail account.
 */
function buildAdapters(env: ReturnType<typeof loadEnv>): {
  storage: StorageAdapter
  email: EmailProvider
} {
  /**
   * `process.env` rather than the validated core environment.
   *
   * `loadIntegration` reads the raw source because the optional keys it needs
   * are deliberately absent from the core schema — it strips `SMTP_HOST` and
   * `S3_BUCKET`, so passing the validated object would report every integration
   * as unconfigured while the variables were set.
   */
  const storageConfig = loadIntegration('storage', process.env)
  const emailConfig = loadIntegration('email', process.env)

  /**
   * Storage's own schema has defaults for the driver and the directory, so an
   * unconfigured result is still usable — but a `configured: false` with S3
   * selected is a deployment problem, and `createStorage` raises for it.
   */
  const storageSettings = storageConfig.config ?? {
    STORAGE_DRIVER: 'local' as const,
    LOCAL_STORAGE_DIR: './.data/uploads',
  }

  const storage = createStorage({
    driver: storageSettings.STORAGE_DRIVER,
    localDirectory: storageSettings.LOCAL_STORAGE_DIR,
    apiUrl: env.API_URL,
    ...(storageSettings.STORAGE_DRIVER === 's3'
      ? {
          s3: {
            bucket: storageSettings.S3_BUCKET ?? '',
            region: storageSettings.S3_REGION ?? '',
            ...(storageSettings.S3_ENDPOINT
              ? { endpoint: storageSettings.S3_ENDPOINT }
              : {}),
            accessKeyId: storageSettings.S3_ACCESS_KEY_ID ?? '',
            secretAccessKey: storageSettings.S3_SECRET_ACCESS_KEY ?? '',
          },
        }
      : {}),
  })

  if (!emailConfig.config) {
    log('Email is not configured; using the console provider', {
      problems: emailConfig.problems,
    })

    return { storage, email: createEmailProvider({ provider: 'console' }) }
  }

  const config = emailConfig.config
  const sender = formatSender({
    from: config.EMAIL_FROM ?? 'noreply@localhost',
    ...(config.EMAIL_FROM_NAME ? { name: config.EMAIL_FROM_NAME } : {}),
  })

  if (config.EMAIL_PROVIDER === 'resend') {
    /**
     * Raises when the key is missing rather than falling back to the console.
     *
     * A deployment that selected Resend and forgot the key would otherwise write
     * password resets to a log nobody is reading — and would look healthy while
     * doing it.
     */
    return {
      storage,
      email: createEmailProvider({
        provider: 'resend',
        apiKey: config.RESEND_API_KEY ?? '',
        from: sender,
      }),
    }
  }

  if (config.EMAIL_PROVIDER === 'smtp') {
    return {
      storage,
      email: createEmailProvider({
        provider: 'smtp',
        host: config.SMTP_HOST ?? '',
        port: config.SMTP_PORT ?? 587,
        secure: config.SMTP_SECURE ?? false,
        /**
         * Defaults to requiring TLS.
         *
         * Sending a password reset in plaintext because a server did not offer
         * STARTTLS is a downgrade nobody would notice from the configuration and
         * everybody would notice in a breach report.
         */
        requireTls: config.SMTP_REQUIRE_TLS ?? true,
        ...(config.SMTP_USERNAME ? { username: config.SMTP_USERNAME } : {}),
        ...(config.SMTP_PASSWORD ? { password: config.SMTP_PASSWORD } : {}),
        from: sender,
      }),
    }
  }

  return { storage, email: createEmailProvider({ provider: 'console' }) }
}

/**
 * Register every job handler.
 *
 * Kept in one place so the set of work this process can do is reviewable, and so
 * a job that is declared but never handled is obvious rather than silent. A
 * declared job with no handler is worse than an absent one: it accepts work and
 * then fails it, and the failure reads as a bug in the job rather than as a
 * missing registration.
 *
 * Handlers must be idempotent. pg-boss guarantees at-least-once delivery, so a
 * job that fails after its side effect has landed is retried.
 */
async function registerHandlers(
  queue: JobQueue,
  deps: { storage: StorageAdapter; email: EmailProvider },
): Promise<void> {
  const dependencies = { storage: deps.storage, log, logError }

  await queue.work('maintenance.prune-rate-limits', async () => {
    await pruneRateLimitsJob(dependencies)
  })

  await queue.work('media.gc', async () => {
    await mediaGcJob(dependencies)
  })

  await queue.work('email.send', async (payload) => {
    const rendered = renderTemplate(payload.template, payload.data as never)

    try {
      await deps.email.send({
        to: payload.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })

      log('Sent an email', {
        to: payload.to,
        template: payload.template,
        provider: deps.email.name,
      })
    } catch (error) {
      /**
       * A refused message is not retried, and neither is a broken configuration.
       *
       * An invalid recipient or an unverified sender domain fails identically on
       * every attempt, so retrying burns the queue's budget until the job
       * reaches the terminal-failure list — where nobody looks, because the real
       * problem was visible on the first attempt.
       *
       * Returning normally marks the job done. The log line is where an operator
       * will actually see it.
       */
      const code = (error as { code?: string } | null)?.code

      if (code === 'rejected' || code === 'not_configured') {
        logError('Refused an email; not retrying', error, {
          to: payload.to,
          template: payload.template,
        })

        return
      }

      // An outage is worth retrying, so the error propagates and pg-boss backs
      // off between attempts.
      throw error
    }
  })

  await queue.work('webhook.deliver', async (payload) => {
    /**
     * Not implemented until outbound delivery lands with payments.
     *
     * Still throwing rather than returning, and deliberately: a job that
     * silently succeeds is a delivery an operator believes happened. The queue
     * and the payload contract are fixed, so this becomes a handler body rather
     * than a change to the message shape.
     */
    throw new Error(
      `webhook.deliver is not implemented yet (delivery ${payload.deliveryId}).`,
    )
  })
}

async function main(): Promise<void> {
  // Fail fast, and report every configuration problem at once rather than one
  // per restart.
  const env = loadEnv()

  log('Worker starting', { nodeEnv: env.NODE_ENV })

  const adapters = buildAdapters(env)

  const queue = createJobQueue({ connectionString: env.DATABASE_URL })

  await queue.start()
  await registerHandlers(queue, adapters)

  log('Worker ready', {
    handlers: queue.registeredHandlers(),
    storage: adapters.storage.provider,
    email: adapters.email.name,
    sender: 'see the email provider log line',
  })

  // --- Graceful shutdown ---------------------------------------------------
  // On SIGTERM the orchestrator is asking this process to finish and exit. Stop
  // accepting new work, let in-flight jobs complete, then release the database.
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
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
