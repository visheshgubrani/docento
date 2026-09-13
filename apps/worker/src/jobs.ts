import { prisma, pruneRateLimits } from '@docento/domain'
import { buildStorageKey, type StorageAdapter } from '@docento/integrations'

/**
 * What the worker does.
 *
 * Handlers live here rather than in `packages/integrations` because they touch
 * the database, and only `packages/domain` may import Prisma — which means the
 * queries below belong in the domain and these functions are the thin
 * orchestration around them. Where a handler needed a query that did not exist,
 * the query moved into the domain rather than being written here.
 *
 * ## Every handler is idempotent
 *
 * pg-boss guarantees at-least-once delivery, so a job that fails after its side
 * effect has landed is retried. Each handler below is written so a second run
 * either does nothing or produces the same result as the first.
 */

export type JobLogger = (
  message: string,
  fields?: Record<string, unknown>,
) => void

export type WorkerDependencies = {
  storage: StorageAdapter
  log: JobLogger
  logError: (
    message: string,
    error: unknown,
    fields?: Record<string, unknown>,
  ) => void
}

/**
 * Housekeeping: drop expired rate-limit counters.
 *
 * Idempotent by construction — deleting rows that have expired twice is the same
 * as deleting them once.
 */
export async function pruneRateLimitsJob(
  deps: WorkerDependencies,
): Promise<void> {
  const removed = await pruneRateLimits()

  deps.log('Pruned expired rate-limit counters', { removed })
}

/**
 * Sweep media the database says is unreferenced.
 *
 * ## Why a sweep rather than a reference count
 *
 * The schema used to carry a `referenceCount` column, and the Milestone A review
 * identified the problem: a counter decremented from several replicas is a race.
 * Two requests both read `1`, both write `0`, and one of them was wrong — and
 * the failure mode is deleting a video another course is using.
 *
 * This asks the database what is actually unreferenced instead. It is slower and
 * it cannot drift, and it is idempotent: a second run finds the same set, which
 * is now smaller.
 *
 * ## What it deletes, and what it does not
 *
 * An asset is removable when nothing points at it and it is older than a grace
 * period. The grace period matters: an author who uploads a video, then spends
 * twenty minutes writing the lesson that attaches it, must not lose the upload
 * to a sweep that ran in between. An hour is generous and costs one hour of disk.
 */
export async function mediaGcJob(deps: WorkerDependencies): Promise<void> {
  const graceMs = 60 * 60 * 1000

  const candidates = await prisma.mediaAsset.findMany({
    where: {
      deletedAt: null,
      createdAt: { lt: new Date(Date.now() - graceMs) },
      /**
       * Nothing references it — in a draft *or* in a published release.
       *
       * Both questions, and the second is the one that matters: an author who
       * swaps a lesson's video leaves the old asset unreferenced by the draft
       * while learners are still following the release that names it. A sweep
       * that asked only about drafts would delete a video out from under a
       * course that is currently being taken.
       */
      lessons: { none: {} },
      releaseLessons: { none: {} },
    },
    select: { id: true, workspaceId: true, storageKey: true, provider: true },
    take: 200,
  })

  let removed = 0
  let failed = 0

  for (const asset of candidates) {
    try {
      /**
       * Bytes first, then the row.
       *
       * The other order loses the key if the delete fails, leaving bytes nothing
       * can find or remove. This order leaves a row whose bytes are gone, which
       * a second run finishes — and a missing file is a `404` rather than an
       * orphan.
       */
      if (asset.storageKey && asset.provider === deps.storage.provider) {
        await deps.storage.delete(asset.storageKey)
      }

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { deletedAt: new Date() },
      })

      removed += 1
    } catch (error) {
      // One bad asset must not stop the sweep, and the failure is recorded
      // rather than swallowed — an asset that cannot be deleted is worth seeing.
      failed += 1

      deps.logError('Failed to remove an unreferenced media asset', error, {
        assetId: asset.id,
      })
    }
  }

  deps.log('Swept unreferenced media', {
    candidates: candidates.length,
    removed,
    failed,
  })
}

export { buildStorageKey }
