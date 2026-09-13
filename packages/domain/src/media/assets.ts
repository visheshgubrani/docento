/**
 * Media assets.
 *
 * ## What is authorized where, and why the split is not arbitrary
 *
 * A media operation is one of two kinds. *Listing*, *creating* and *resolving*
 * an asset are academy-scoped questions: "may this caller upload into this
 * academy". *Deleting* is an asset-scoped one. The action table says which
 * fields each action needs, and `can()` refuses when a resource cannot identify
 * them — so a caller cannot reach an asset by naming only an academy it is
 * allowed to read.
 *
 * ## Bytes are not moved here
 *
 * This module creates, confirms, resolves and soft-deletes rows. Pushing and
 * pulling bytes is a transport concern with its own failure modes — a partial
 * upload, a client that disconnected, a range request — and it belongs to the
 * route that has the request body. What lives here is the part that must exist
 * once: who may, and what the row says afterwards.
 *
 * ## Deletion is soft, and storage is reclaimed separately
 *
 * `deletedAt` is set and the row survives. A hard delete would be a cascade
 * through `Lesson.mediaAssetId` and `ReleaseLesson.mediaAssetId`, and an asset a
 * published release names is a lesson that stops playing for everybody who
 * enrolled. So the row records the intent, the serve route refuses it
 * immediately, and the `media.gc` job reclaims the bytes once nothing references
 * them.
 */

import { prisma } from '../db'
import { assertCan, assertFound, DomainRuleError } from '../shared/errors'
import type { Principal } from '../authorization/principal'
import { can } from '../authorization/can'
import { hasAccess } from '../learning/enrollment'

/** The statuses the schema records. */
export const MEDIA_STATUSES = [
  'PROCESSING',
  'READY',
  'FAILED',
  'DELETED',
] as const
export type MediaStatus = (typeof MEDIA_STATUSES)[number]

/** The providers an asset can be stored by. */
export const MEDIA_PROVIDERS = ['local', 's3', 'openvod', 'external'] as const
export type MediaProvider = (typeof MEDIA_PROVIDERS)[number]

export type MediaAssetSummary = {
  id: string
  workspaceId: string
  academyId: string
  provider: string
  /**
   * The stored status, narrowed to the values this build understands.
   *
   * `string` would compile and lie: an unrecognised status means a migration has
   * not run, and the contract's enum would then reject the response at the
   * client rather than at the boundary that produced it.
   */
  status: MediaStatus
  storageKey: string | null
  title: string | null
  originalFilename: string | null
  mimeType: string | null
  sizeBytes: number | null
  createdAt: Date
}

const ASSET_FIELDS = {
  id: true,
  workspaceId: true,
  academyId: true,
  provider: true,
  status: true,
  storageKey: true,
  title: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const

/**
 * `BigInt` is not JSON.
 *
 * A `sizeBytes` of `1234n` reaches `JSON.stringify` and throws, which turns a
 * successful read into a `500` far from the cause. Converting at the boundary of
 * this module means no caller has to remember, and the contract declares a
 * number because a file size above 2^53 bytes is not a case worth modelling.
 */
const STATUSES: readonly string[] = MEDIA_STATUSES

/**
 * A row, as the contract describes it.
 *
 * A status this build does not recognise is a migration that has not run rather
 * than a value to forward — so it is refused here, where the cause is visible,
 * instead of reaching a client whose contract rejects it with no explanation.
 */
function toSummary(row: {
  id: string
  workspaceId: string
  academyId: string
  provider: string
  status: string
  storageKey: string | null
  title: string | null
  originalFilename: string | null
  mimeType: string | null
  sizeBytes: bigint | null
  createdAt: Date
}): MediaAssetSummary {
  if (!STATUSES.includes(row.status)) {
    throw new DomainRuleError(
      'invalid_media_status',
      `Media asset "${row.id}" has status "${row.status}", which this version does not recognise. A migration is probably outstanding.`,
      [{ path: 'status', message: 'Unrecognised media status.' }],
    )
  }

  return {
    ...row,
    status: row.status as MediaStatus,
    sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
  }
}

/**
 * The MIME types that may be uploaded.
 *
 * An allow-list rather than a deny-list, because the failure mode of a deny-list
 * is a type nobody thought of. Deliberately excludes `image/svg+xml`: an SVG is
 * a document that can carry script, and serving one from the API's own origin
 * would make an uploaded file a cross-site scripting primitive. An academy that
 * needs SVG can host it elsewhere and reference it.
 */
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/webm',
  'application/pdf',
  'text/plain',
  'text/vtt',
  'text/markdown',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

/**
 * Begin an upload.
 *
 * ## Why the asset row comes first
 *
 * The storage key contains the asset id, and the id has to exist before there is
 * a key to upload to. Creating the row first also means an upload that is
 * abandoned leaves a `PROCESSING` row rather than nothing — which is what the
 * sweep looks for, and what makes "what happened to that upload" answerable.
 *
 * The caller supplies the key it wants the bytes under; this returns the row and
 * lets the route ask the storage adapter for a target. Composing the key here
 * rather than in the route is deliberate: `buildStorageKey` sanitises the
 * filename, and a route that forgot to call it would let a crafted name escape
 * the workspace prefix.
 */
export async function createMediaAsset(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    provider: MediaProvider
    /**
     * The key the bytes should be stored under, given the asset's id.
     *
     * ## Why this is a function and not a string
     *
     * The key contains the id, so it cannot be built before the id exists — and
     * the id is generated here, because `@default(cuid())` is the schema's and
     * the format it produces is not the one the `cuid2` package produces. A
     * route that generated its own would produce an id the client accepts and
     * the next migration's format checks might not, to save passing a callback.
     *
     * The callback also keeps the *shape* of the key in one place: it is
     * `buildStorageKey` in `@docento/integrations`, which sanitises an
     * author-supplied filename into a path segment. A route that composed the
     * string itself could skip that, and a filename with `../` in it would then
     * escape the workspace prefix.
     */
    storageKeyFor: (assetId: string) => string
    title?: string | null
    originalFilename?: string | null
    mimeType: string
    sizeBytes?: number | null
  },
): Promise<MediaAssetSummary> {
  assertCan(principal, 'media:upload', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  if (!isAllowedMimeType(input.mimeType)) {
    throw new DomainRuleError(
      'unsupported_media_type',
      `Files of type "${input.mimeType}" cannot be uploaded.`,
      [{ path: 'mimeType', message: 'This file type is not accepted.' }],
    )
  }

  /**
   * The academy is confirmed to be in the workspace before the row is written.
   *
   * `can()` has already checked that the caller may upload into this
   * *combination*, so this is not a second permission check — it is the foreign
   * key that would otherwise fail as an opaque constraint violation when a
   * caller pairs a real workspace with another workspace's academy.
   */
  const academy = await prisma.academy.findFirst({
    where: { id: input.academyId, workspaceId: input.workspaceId },
    select: { id: true },
  })

  assertFound('academy', academy, input.academyId)

  /**
   * The id first, because the key contains it.
   *
   * `crypto.randomUUID` rather than the package Prisma's `cuid()` comes from:
   * the schema's default is cuid v1, the `cuid2` package produces a different
   * format, and supplying an id from a third implementation to a column whose
   * default is a fourth is how a database ends up holding two shapes.
   */
  const assetId = crypto.randomUUID()

  const created = await prisma.mediaAsset.create({
    data: {
      id: assetId,
      workspaceId: input.workspaceId,
      academyId: input.academyId,
      provider: input.provider,
      storageKey: input.storageKeyFor(assetId),
      status: 'PROCESSING',
      title: input.title ?? null,
      originalFilename: input.originalFilename ?? null,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes ?? null,
    },
    select: ASSET_FIELDS,
  })

  return toSummary(created)
}

/**
 * Record that an upload landed.
 *
 * ## Why the row is not trusted to be right
 *
 * The route has already asked the storage adapter whether the object exists —
 * that is the completion check, and it is the only evidence that the bytes are
 * really there. This function records the answer. It does not verify anything
 * itself, because doing so would put a provider call inside a database
 * transaction and make the check's result depend on where it ran.
 *
 * Idempotent by construction: completing a `READY` asset returns it unchanged,
 * so a client that retried after a timeout does not fail.
 */
export async function completeMediaAsset(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    assetId: string
    sizeBytes?: number | null
  },
): Promise<MediaAssetSummary> {
  assertCan(principal, 'media:upload', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  /**
   * Scoped to the academy as well as the workspace.
   *
   * Not redundant: `can()` checks that the caller may upload into *this*
   * academy, and the lookup then has to agree about which asset is meant. A
   * workspace-only lookup let an owner of one academy mark another academy's
   * asset ready — the same class of hole as a missing tenant filter, caught by
   * the containment test below.
   */
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id: input.assetId,
      workspaceId: input.workspaceId,
      academyId: input.academyId,
      deletedAt: null,
    },
    select: { id: true, status: true },
  })

  assertFound('media asset', asset, input.assetId)

  if (asset.status === 'READY') {
    // The id was resolved under the academy above, so reading it back by id
    // alone cannot return a different academy's row.
    const ready = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: input.assetId },
      select: ASSET_FIELDS,
    })

    return toSummary(ready)
  }

  const updated = await prisma.mediaAsset.update({
    where: { id: input.assetId },
    data: {
      status: 'READY',
      ...(input.sizeBytes !== undefined ? { sizeBytes: input.sizeBytes } : {}),
    },
    select: ASSET_FIELDS,
  })

  return toSummary(updated)
}

/** An asset in the academy the caller asked about, or a not-found. */
export async function getMediaAsset(
  principal: Principal,
  input: { workspaceId: string; academyId: string; assetId: string },
): Promise<MediaAssetSummary> {
  assertCan(principal, 'media:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id: input.assetId,
      workspaceId: input.workspaceId,
      /**
       * Scoped to the academy in the same query rather than checked afterwards.
       * A check on the loaded row is a check a caller can forget; a predicate in
       * the `where` clause is one the query cannot return without.
       */
      academyId: input.academyId,
      deletedAt: null,
    },
    select: ASSET_FIELDS,
  })

  assertFound('media asset', asset, input.assetId)

  return toSummary(asset)
}

/** The assets in an academy, newest first. */
export async function listMediaAssets(
  principal: Principal,
  input: { workspaceId: string; academyId: string; limit?: number },
): Promise<MediaAssetSummary[]> {
  assertCan(principal, 'media:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  const rows = await prisma.mediaAsset.findMany({
    where: {
      workspaceId: input.workspaceId,
      academyId: input.academyId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(input.limit ?? 50, 1), 200),
    select: ASSET_FIELDS,
  })

  return rows.map(toSummary)
}

/**
 * The asset a serve request names, as a row that has bytes.
 *
 * ## Why this one does not call `can()`
 *
 * It answers "does this asset exist, here, with bytes?" and nothing else. That
 * is deliberately not the same question as "may this caller have them", and the
 * two are separated so no caller can answer the second by accident:
 * `authorizeMediaServe` is the one that decides, and it calls this after it has
 * decided.
 *
 * An earlier version of this comment claimed the route compensated by serving
 * "only for `media:serve`, which a learner holds for their own academy and an
 * anonymous visitor holds for a free lesson". Neither half was true. `can()`
 * was never consulted on this path, and no anonymous media path exists to hold
 * anything — the public catalogue deliberately omits `mediaAssetId`, so there
 * was never a visitor to serve. The claim is recorded here because the shape of
 * the mistake is instructive: a comment asserting an authorization property
 * that no code implemented read as a guarantee for as long as nobody checked.
 *
 * Returning `null` rather than throwing, so the route can answer a `404` and
 * reveal nothing about which ids exist.
 */
export async function resolveServableAsset(input: {
  academyId: string
  assetId: string
}): Promise<{
  id: string
  workspaceId: string
  academyId: string
  storageKey: string
  mimeType: string
  status: MediaStatus
} | null> {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id: input.assetId,
      academyId: input.academyId,
      deletedAt: null,
      status: 'READY',
    },
    select: {
      id: true,
      workspaceId: true,
      academyId: true,
      storageKey: true,
      mimeType: true,
      status: true,
    },
  })

  /**
   * A `PROCESSING` or `FAILED` asset has no bytes to serve, and a null
   * `storageKey` is a row that never got a destination. Both are absent as far
   * as a reader is concerned.
   */
  if (!asset || !asset.storageKey || !asset.mimeType) return null

  return {
    ...asset,
    storageKey: asset.storageKey,
    mimeType: asset.mimeType,
    status: 'READY',
  }
}

/** The asset fields a serve decision needs once it has said yes. */
export type ServableAsset = NonNullable<
  Awaited<ReturnType<typeof resolveServableAsset>>
>

/**
 * The asset a caller is entitled to the bytes of, or `null`.
 *
 * ## Why this is a domain question and not a route check
 *
 * "May this person watch this video" is the same rule everywhere it is asked:
 * the route asks it now, and a signed-URL endpoint, a player manifest, or a
 * worker validating a caption fetch would each ask it later. A route-level
 * `can()` call would be a second place for the rule to live, and the second
 * place is the one that drifts.
 *
 * ## The two decisions, and why one is not enough
 *
 * `media:serve` names an academy, so `can()` answers the tenant question: a
 * learner of one academy cannot reach another's bytes, and an anonymous caller
 * is refused outright.
 *
 * For a learner that is necessary and not sufficient. A learner holds
 * `media:serve` for their whole academy, so `can()` alone would let anyone who
 * signed up at an academy fetch every asset in it — including the videos of
 * courses they never enrolled in, and courses whose access they have lost.
 * ADR 0008 is explicit that access is checked *at play time against
 * enrollment*, so the second decision asks whether a course that actually uses
 * this asset is one they may currently open.
 *
 * A staff member or service key does not need the second decision: the academy
 * boundary is the right bar for the people who run it, and `media:delete` and
 * `media:read` already work that way.
 *
 * ## Why `null` and not a thrown refusal
 *
 * The route turns this into the same `404` an unknown id gets. Distinguishing
 * "not yours" from "does not exist" would make the endpoint a way to test
 * whether an academy has a given asset, which is the thing a shared URL would
 * otherwise tell nobody.
 */
export async function authorizeMediaServe(input: {
  principal: Principal
  academyId: string
  assetId: string
}): Promise<ServableAsset | null> {
  const entitledToAcademy = can(input.principal, 'media:serve', {
    academyId: input.academyId,
  })

  if (!entitledToAcademy.allowed) return null

  const asset = await resolveServableAsset({
    academyId: input.academyId,
    assetId: input.assetId,
  })

  if (!asset) return null

  /**
   * Only a learner is answering a question about their own enrollment. Staff
   * are answering one about the academy they administer.
   */
  if (input.principal.kind !== 'learner') return asset

  const enrolled = await learnerMayOpenMedia({
    academyId: input.academyId,
    learnerId: input.principal.learnerId,
    assetId: asset.id,
  })

  return enrolled ? asset : null
}

/**
 * Whether a learner may currently open a course whose published release uses
 * this asset.
 *
 * Read from `ReleaseLesson` rather than from the draft lesson, because that is
 * the row that says what a learner is following: an author swapping a lesson's
 * video mid-term changes the draft, and a learner working through an older
 * release keeps the asset that release names.
 *
 * Access is asked per course with `hasAccess`, which evaluates grants as of
 * now — so a revoked or expired grant stops the bytes on the next request
 * rather than on the next page render.
 */
async function learnerMayOpenMedia(input: {
  academyId: string
  learnerId: string
  assetId: string
}): Promise<boolean> {
  const referencing = await prisma.releaseLesson.findMany({
    where: {
      mediaAssetId: input.assetId,
      release: {
        supersededAt: null,
        course: { academyId: input.academyId },
      },
    },
    select: { release: { select: { courseId: true } } },
    /**
     * Bounded, because an asset is workspace-owned and reusable across courses:
     * a logo or an intro clip could legitimately appear in many. The cap is
     * deliberately far above the plausible number of courses one learner is
     * enrolled in, and a miss here is a refusal rather than an unbounded scan.
     */
    take: 200,
  })

  const courseIds = [...new Set(referencing.map((row) => row.release.courseId))]

  for (const courseId of courseIds) {
    if (await hasAccess(input.academyId, courseId, input.learnerId)) {
      return true
    }
  }

  return false
}

/**
 * Mark an asset deleted.
 *
 * ## Why this does not check what references the asset
 *
 * It cannot be done atomically with the delete, so it would be a check that is
 * true when read and false when acted upon. Instead the row is marked, the serve
 * route stops serving it immediately, and `media.gc` reclaims the bytes only
 * once nothing references them — which is a question the sweep asks at a moment
 * when nothing else is writing.
 *
 * Deleting an already-deleted asset succeeds. It is a state, not an event, and a
 * client retrying after a timeout should not see a failure for work that landed.
 */
export async function deleteMediaAsset(
  principal: Principal,
  input: { workspaceId: string; academyId: string; assetId: string },
): Promise<{ ok: true }> {
  assertCan(principal, 'media:delete', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    assetId: input.assetId,
  })

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id: input.assetId,
      workspaceId: input.workspaceId,
      academyId: input.academyId,
    },
    select: { id: true },
  })

  assertFound('media asset', asset, input.assetId)

  // By id after an academy-scoped resolution, which is what makes it safe: the
  // row was found under both scopes a moment ago.
  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { status: 'DELETED', deletedAt: new Date() },
  })

  return { ok: true }
}

/**
 * The asset an upload key names, if the key was issued by this API.
 *
 * ## Why this takes no principal
 *
 * It is the one media read that cannot have one. With local storage the upload
 * target points at the API, and the request that follows it is a browser sending
 * a file body — it carries a session cookie and no workspace header, and with S3
 * configured it never reaches this process at all.
 *
 * What makes it safe is the lookup, not a permission check. The key is
 * `workspaceId/assetId/filename`, both halves must agree with a real row, and
 * the row must still be `PROCESSING`: a caller can therefore only write to an
 * asset the API created and has not yet finished, and only by knowing an id
 * nobody told them. Overwriting a *ready* asset is refused here, which is the
 * case that would otherwise let one upload replace another's bytes.
 */
export async function resolvePendingAssetByKey(input: {
  workspaceId: string
  assetId: string
}): Promise<{ id: string; mimeType: string | null } | null> {
  return prisma.mediaAsset.findFirst({
    where: {
      id: input.assetId,
      workspaceId: input.workspaceId,
      deletedAt: null,
      status: 'PROCESSING',
    },
    select: { id: true, mimeType: true },
  })
}
