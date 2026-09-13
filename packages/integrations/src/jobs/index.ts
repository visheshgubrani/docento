import { PgBoss } from 'pg-boss'
import { z } from 'zod'

/**
 * Durable job execution.
 *
 * ## Why pg-boss and not Redis
 *
 * The alternative everyone reaches for is Redis with BullMQ, which is mature and
 * well understood. It also means every self-hoster must run Redis to have a
 * working install. The stated goal is that Postgres is the only required
 * service, because the difference between one dependency and two is the
 * difference between a five-minute install and an afternoon of YAML.
 *
 * See docs/adr/0007-durable-jobs-on-postgres.md.
 *
 * ## Delivery semantics
 *
 * Work here is **retryable delivery with idempotent effects**, never exactly
 * once. Exactly-once across a network boundary is not achievable, and pretending
 * otherwise produces duplicate side effects that are worse than honest
 * at-least-once with idempotency keys. Every handler must tolerate being run
 * twice for the same job.
 *
 * ## Not yet transactional
 *
 * ARCHITECTURE.md and docs/adr/0007-durable-jobs-on-postgres.md describe jobs as
 * enqueued inside the transaction that caused them, so a rolled-back change
 * leaves no job behind. **That is the target, not the current state**:
 * `enqueue()` takes no transaction client, so a crash between the commit and the
 * enqueue loses the job, and a rollback after the enqueue leaves an orphan.
 *
 * Wiring pg-boss's ORM transaction adapters is tracked as follow-up work. It is
 * called out here because the gap is invisible at the call site, and a comment
 * claiming a guarantee that is not in force is worse than no comment.
 */

// ---------------------------------------------------------------------------
// Job registry
// ---------------------------------------------------------------------------

/**
 * Every job the system can run, with the shape of its payload.
 *
 * Declared in one place so that a job name is a compile-time symbol rather than
 * a string that silently fails to match a handler, and so the payload contract
 * is enforced at both ends.
 */
export const JOB_DEFINITIONS = {
  /** Housekeeping: drop expired rate-limit counters so the table cannot grow without bound. */
  'maintenance.prune-rate-limits': {
    schema: z.object({}),
    options: {
      retryLimit: 2,
      // Every fifteen minutes. Housekeeping is not urgent, and a missed run
      // costs nothing because the next one catches up.
      schedule: '*/15 * * * *',
    },
  },

  /** Deliver one outbound webhook, recording the attempt. */
  'webhook.deliver': {
    schema: z.object({ deliveryId: z.string().min(1) }),
    options: {
      retryLimit: 8,
      retryBackoff: true,
      retryDelaySeconds: 30,
      // Bounded so a hostile endpoint cannot occupy a worker indefinitely.
      expireInSeconds: 60,
    },
  },

  /** Send a transactional email. */
  'email.send': {
    schema: z.object({
      to: z.string().email(),
      template: z.string().min(1),
      data: z.record(z.string(), z.unknown()).optional(),
    }),
    options: { retryLimit: 5, retryBackoff: true, retryDelaySeconds: 30 },
  },
} as const satisfies Record<
  string,
  { schema: z.ZodTypeAny; options?: Record<string, unknown> }
>

export type JobName = keyof typeof JOB_DEFINITIONS

export type JobPayload<N extends JobName> = z.infer<
  (typeof JOB_DEFINITIONS)[N]['schema']
>

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export type JobQueueOptions = {
  connectionString: string
  /**
   * Postgres schema for queue tables. Keeping them out of `public` means a
   * `prisma migrate reset` during development does not drop in-flight jobs.
   */
  schema?: string
  /** Set false to enqueue from a process that must not consume work. */
  consume?: boolean
}

export type EnqueueOptions = {
  /** Delay before the job becomes eligible. */
  startAfterSeconds?: number
  /** Overrides the definition's retry limit for this job. */
  retryLimit?: number
  /**
   * Deduplicate key. Two jobs with the same key in the same queue collapse to
   * one, which is how a retried request avoids enqueueing duplicate work.
   */
  singletonKey?: string
}

type HandlerContext = {
  jobId: string
  /** Aborted when the job expires. Long work should observe it. */
  signal: AbortSignal
  attempt: number
}

export type JobHandler<N extends JobName> = (
  payload: JobPayload<N>,
  context: HandlerContext,
) => Promise<void>

export class JobQueue {
  private readonly boss: PgBoss
  private readonly schema: string
  private started = false
  private readonly handlers = new Map<JobName, JobHandler<JobName>>()

  constructor(options: JobQueueOptions) {
    this.schema = options.schema ?? 'pgboss'

    this.boss = new PgBoss({
      connectionString: options.connectionString,
      schema: this.schema,
      // Housekeeping is cheap and keeps queue tables from growing forever.
      // pg-boss runs its own maintenance; this only tunes the cadence.
      maintenanceIntervalSeconds: 60,
    })
  }

  /** Start the queue and create every declared queue. Idempotent. */
  async start(): Promise<void> {
    if (this.started) return

    this.boss.on('error', (error) => {
      // A queue error must be visible; swallowing it turns a stalled worker
      // into a silent one.
      console.error('[jobs] pg-boss error', error)
    })

    await this.boss.start()
    this.started = true

    for (const name of Object.keys(JOB_DEFINITIONS) as JobName[]) {
      await this.boss.createQueue(name)
    }
  }

  /**
   * Enqueue a job.
   *
   * Payloads are validated against the registry before they are written, so a
   * malformed job fails here — where the caller can see it — rather than inside
   * a worker minutes later.
   */
  async enqueue<N extends JobName>(
    name: N,
    payload: JobPayload<N>,
    options: EnqueueOptions = {},
  ): Promise<string | null> {
    if (!this.started) {
      throw new Error(
        `Cannot enqueue "${name}" before the queue has started. Call start() first.`,
      )
    }

    const definition = JOB_DEFINITIONS[name]
    const parsed = definition.schema.safeParse(payload)

    if (!parsed.success) {
      throw new Error(
        `Invalid payload for job "${name}": ${parsed.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'} ${issue.message}`,
          )
          .join('; ')}`,
      )
    }

    // pg-boss validates these and rejects an explicit `undefined`, so the
    // object is built rather than passed with holes. The queue's declared
    // options are the default; the caller may override the retry limit.
    const declared =
      (definition as { options?: Record<string, unknown> }).options ?? {}

    const sendOptions: Record<string, unknown> = {}

    const retryLimit = options.retryLimit ?? declared.retryLimit
    if (typeof retryLimit === 'number') sendOptions.retryLimit = retryLimit

    // The option is `expireInSeconds`, not `expireIn`. The wrong name was
    // silently ignored, so jobs expired on pg-boss's 15-minute default rather
    // than the declared 60 seconds — a bounded timeout that was not in force.
    if (typeof declared.expireInSeconds === 'number') {
      sendOptions.expireInSeconds = declared.expireInSeconds
    }

    if (declared.retryBackoff === true) {
      sendOptions.retryBackoff = true
      // Without an explicit delay, backoff retries land almost immediately,
      // which is the opposite of what backoff is for.
      if (typeof declared.retryDelaySeconds === 'number') {
        sendOptions.retryDelay = declared.retryDelaySeconds
      }
    }
    if (options.startAfterSeconds !== undefined) {
      sendOptions.startAfter = options.startAfterSeconds
    }
    if (options.singletonKey !== undefined) {
      sendOptions.singletonKey = options.singletonKey
    }

    return this.boss.send(name, parsed.data as object, sendOptions)
  }

  /**
   * Register a handler.
   *
   * Handlers must be idempotent: pg-boss guarantees at-least-once delivery, and
   * a job that fails after its side effect has landed will be retried.
   */
  async work<N extends JobName>(
    name: N,
    handler: JobHandler<N>,
  ): Promise<void> {
    if (!this.started) {
      throw new Error(
        `Cannot register a handler for "${name}" before the queue has started. Call start() first.`,
      )
    }

    this.handlers.set(name as JobName, handler as JobHandler<JobName>)

    await this.boss.work(name, async (jobs) => {
      for (const job of jobs) {
        const parsed = (
          JOB_DEFINITIONS[name] as { schema: z.ZodTypeAny }
        ).schema.safeParse(job.data)

        if (!parsed.success) {
          // A payload that cannot be parsed will never succeed. Failing loudly
          // beats retrying it eight times.
          throw new Error(
            `Job "${name}" (${job.id}) has an invalid payload: ${parsed.error.message}`,
          )
        }

        await (handler as JobHandler<N>)(parsed.data as JobPayload<N>, {
          jobId: job.id,
          signal: job.signal,
          attempt: 1,
        })
      }
    })

    // A scheduled job is not useful if nothing ever enqueues it.
    const schedule = (
      JOB_DEFINITIONS[name] as { options?: { schedule?: string } }
    ).options?.schedule

    if (schedule) {
      await this.boss.schedule(name, schedule)
    }
  }

  /** Enqueue a scheduled job immediately, for an operator-triggered run. */
  async trigger<N extends JobName>(
    name: N,
    payload: JobPayload<N>,
  ): Promise<string | null> {
    return this.enqueue(name, payload)
  }

  /** Stop accepting work and release connections. Safe to call twice. */
  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    await this.boss.stop({ graceful: true, timeout: 10_000 })
  }

  /** Names with a registered handler. Useful for a readiness report. */
  registeredHandlers(): JobName[] {
    return [...this.handlers.keys()]
  }
}

export function createJobQueue(options: JobQueueOptions): JobQueue {
  return new JobQueue(options)
}
