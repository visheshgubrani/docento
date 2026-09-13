import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { JobQueue } from '../index.js'

/**
 * Job execution tests.
 *
 * These run against a real Postgres and a real pg-boss schema. Registering a
 * handler proves nothing — the failure mode worth catching is a queue that
 * starts cleanly and then never delivers anything.
 */

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL must be set for job tests.')
}

let queue: JobQueue

/** Wait for a condition, polling, with a hard timeout. */
async function waitFor(
  predicate: () => boolean,
  { timeoutMs = 20_000, intervalMs = 100 } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Condition was not met within ${timeoutMs}ms`)
}

beforeAll(async () => {
  queue = new JobQueue({
    connectionString,
    schema: 'pgboss_test',
  })
  await queue.start()
})

afterAll(async () => {
  await queue.stop()
})

describe('JobQueue', () => {
  it('delivers a job to its handler', async () => {
    const seen: string[] = []

    await queue.work('maintenance.prune-rate-limits', async () => {
      seen.push('ran')
    })

    await queue.enqueue('maintenance.prune-rate-limits', {})
    await waitFor(() => seen.length > 0)

    expect(seen).toEqual(['ran'])
  })

  it('delivers a typed payload intact', async () => {
    const received: string[] = []

    await queue.work('webhook.deliver', async (payload) => {
      received.push(payload.deliveryId)
      // The declared handler in the worker throws because delivery is not
      // implemented; here the handler succeeds so the transport is what is
      // under test.
    })

    await queue.enqueue('webhook.deliver', { deliveryId: 'delivery-123' })
    await waitFor(() => received.length > 0)

    expect(received).toEqual(['delivery-123'])
  })

  it('rejects a payload that does not match the declared schema', async () => {
    // A malformed job must fail at the call site, where the caller can see it,
    // rather than inside a worker minutes later.
    await expect(
      queue.enqueue('webhook.deliver', { deliveryId: '' } as never),
    ).rejects.toThrow(/Invalid payload for job "webhook\.deliver"/)
  })

  it('refuses to enqueue before it has started', async () => {
    const unstarted = new JobQueue({ connectionString, schema: 'pgboss_test' })

    await expect(
      unstarted.enqueue('maintenance.prune-rate-limits', {}),
    ).rejects.toThrow(/before the queue has started/)

    // And stopping an unstarted queue is a no-op rather than an error.
    await expect(unstarted.stop()).resolves.toBeUndefined()
  })

  it('reports which handlers are registered', async () => {
    expect(queue.registeredHandlers().length).toBeGreaterThan(0)
    expect(queue.registeredHandlers()).toContain('maintenance.prune-rate-limits')
  })
})
