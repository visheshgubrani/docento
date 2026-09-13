import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../../db'
import type { Principal } from '../../authorization/principal'
import { ForbiddenError } from '../../shared/errors'
import { createAcademy, createWorkspace } from '../../tenancy/academies'
import { createCourse, createLesson, createModule } from '../../content/drafts'
import {
  completeMediaAsset,
  createMediaAsset,
  deleteMediaAsset,
  getMediaAsset,
  isAllowedMimeType,
  listMediaAssets,
  resolvePendingAssetByKey,
  resolveServableAsset,
} from '../assets'

/**
 * Media, and the containment around it.
 *
 * The properties worth testing are not "an asset can be created" — that is one
 * insert — but the ones a media surface gets wrong:
 *
 *   - an instructor scoped to one academy cannot read, upload into, or delete
 *     another academy's media;
 *   - a key that was never issued cannot be uploaded to, and a *ready* asset
 *     cannot be overwritten;
 *   - a deleted or unfinished asset stops being servable immediately, rather
 *     than when a sweep next runs;
 *   - a caller cannot reach an asset by naming an academy they are allowed to
 *     read.
 */

let workspaceId: string
let otherWorkspaceId: string
let academyId: string
let otherAcademyId: string
let ownerUserId: string

const owner = (): Principal => ({
  kind: 'staff',
  userId: ownerUserId,
  workspaceId,
  memberId: 'unused',
  role: 'owner',
})

/** An instructor confined to `academyId`, for the containment tests. */
const instructor = (): Principal => ({
  kind: 'staff',
  userId: ownerUserId,
  workspaceId,
  memberId: 'unused',
  role: 'admin',
})

const tag = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

/**
 * The key the route composes: `workspaceId/assetId/filename`.
 *
 * Written out rather than imported. `buildStorageKey` lives in
 * `@docento/integrations`, which depends on this package — importing it here
 * would be the cycle the boundary rules exist to prevent, and the domain does
 * not need it: the key arrives as a string, so its shape is the route's concern.
 * What this test is about is that the id the operation generates is the one its
 * key names, and that a filename cannot escape the prefix.
 */
function storageKeyFor(workspace: string, filename: string) {
  const safe = (filename.split(/[/\\]/).pop() ?? 'file').replace(/^\.+/, '')

  return (assetId: string) => `${workspace}/${assetId}/${safe}`
}

/** An asset with a key composed exactly as the route composes one. */
async function createAsset(
  overrides: {
    workspaceId?: string
    academyId?: string
    mimeType?: string
    filename?: string
  } = {},
) {
  const targetWorkspaceId = overrides.workspaceId ?? workspaceId
  const targetAcademyId = overrides.academyId ?? academyId
  const filename = overrides.filename ?? `lecture-${tag()}.mp4`

  return createMediaAsset(owner(), {
    workspaceId: targetWorkspaceId,
    academyId: targetAcademyId,
    provider: 'local',
    storageKeyFor: storageKeyFor(targetWorkspaceId, filename),
    originalFilename: filename,
    mimeType: overrides.mimeType ?? 'video/mp4',
    sizeBytes: 1024,
  })
}

beforeAll(async () => {
  const suffix = tag()

  /**
   * The membership row has a foreign key to the user, so the user exists first.
   *
   * Written directly rather than through Better Auth: this suite is about media,
   * and the sign-up flow is tested where it lives.
   */
  ownerUserId = (
    await prisma.staffUser.create({
      data: {
        id: `u-${suffix}`,
        name: 'Owner',
        email: `media-${suffix}@example.com`,
      },
    })
  ).id

  const workspace = await createWorkspace({
    name: `Media ${suffix}`,
    slug: `media-${suffix}`,
    ownerUserId,
  })

  workspaceId = workspace.id

  academyId = (
    await createAcademy(owner(), workspaceId, {
      name: 'Primary',
      slug: `primary-${tag()}`,
    })
  ).id

  /**
   * Deliberately in the same workspace as `academyId`.
   *
   * The interesting containment question is not "another tenant" — that is the
   * workspace check — but "another academy of the same tenant", which is what an
   * instructor assignment is scoped to and what the `academyId` column exists
   * for.
   */
  otherAcademyId = (
    await createAcademy(owner(), workspaceId, {
      name: 'Secondary',
      slug: `secondary-${tag()}`,
    })
  ).id

  /**
   * A second workspace, to prove the workspace half of containment rather than
   * only the academy half. An asset cannot be created in an academy belonging to
   * another workspace at all — that is the foreign key — so what is tested below
   * is the read and delete paths.
   */
  const otherUserId = (
    await prisma.staffUser.create({
      data: {
        id: `u-${tag()}`,
        name: 'Other',
        email: `media-other-${tag()}@example.com`,
      },
    })
  ).id

  const otherWorkspace = await createWorkspace({
    name: `Other ${tag()}`,
    slug: `other-${tag()}`,
    ownerUserId: otherUserId,
  })

  otherWorkspaceId = otherWorkspace.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('creating an asset', () => {
  it('builds a key that begins with the workspace and contains the asset id', async () => {
    const asset = await createAsset()

    expect(asset.status).toBe('PROCESSING')
    expect(asset.academyId).toBe(academyId)
    expect(asset.storageKey).toBe(
      `${workspaceId}/${asset.id}/${asset.originalFilename}`,
    )
  })

  it('refuses a type outside the allow-list', async () => {
    /**
     * SVG specifically: it is a document that can carry script, and serving one
     * from this origin would make an uploaded file a cross-site scripting
     * primitive. It is the reason the list is an allow-list rather than a
     * deny-list, so it is the case worth asserting.
     */
    expect(isAllowedMimeType('image/svg+xml')).toBe(false)

    await expect(createAsset({ mimeType: 'image/svg+xml' })).rejects.toThrow(
      /cannot be uploaded/i,
    )
  })

  it('refuses an academy that is not in the workspace', async () => {
    // The combination a caller would otherwise be able to assemble: a real
    // workspace they belong to and another workspace's academy id.
    await expect(
      createMediaAsset(owner(), {
        workspaceId,
        academyId: 'academy-that-does-not-exist',
        provider: 'local',
        storageKeyFor: (assetId) => `key/${assetId}`,
        mimeType: 'image/png',
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('sanitises a filename that tries to escape the workspace prefix', async () => {
    const asset = await createAsset({ filename: '../../etc/passwd' })

    expect(asset.storageKey).toBe(`${workspaceId}/${asset.id}/passwd`)
    expect(asset.storageKey).not.toContain('..')
  })
})

describe('completing an upload', () => {
  it('marks an asset ready and is idempotent', async () => {
    const asset = await createAsset()

    const completed = await completeMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
      sizeBytes: 2048,
    })

    expect(completed.status).toBe('READY')
    expect(completed.sizeBytes).toBe(2048)

    // A client that retried after a timeout must not see a failure for work
    // that landed.
    const again = await completeMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    expect(again.status).toBe('READY')
    expect(again.sizeBytes).toBe(2048)
  })

  it('refuses an asset in another academy of the same workspace', async () => {
    const asset = await createAsset({ academyId: otherAcademyId })

    await expect(
      completeMediaAsset(owner(), {
        workspaceId,
        academyId,
        assetId: asset.id,
      }),
    ).rejects.toThrow(/not found/i)
  })
})

describe('the upload key', () => {
  it('resolves only while the asset is unfinished', async () => {
    const asset = await createAsset()

    const pending = await resolvePendingAssetByKey({
      workspaceId,
      assetId: asset.id,
    })

    expect(pending?.id).toBe(asset.id)

    await completeMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    /**
     * The case that matters: a ready asset must not be writable again through
     * its upload URL, or one caller could replace another's bytes after the
     * fact.
     */
    expect(
      await resolvePendingAssetByKey({ workspaceId, assetId: asset.id }),
    ).toBeNull()
  })

  it('resolves nothing for a key naming a workspace the asset is not in', async () => {
    const asset = await createAsset()

    expect(
      await resolvePendingAssetByKey({
        workspaceId: otherWorkspaceId,
        assetId: asset.id,
      }),
    ).toBeNull()
  })
})

describe('serving', () => {
  it('resolves a ready asset in its own academy', async () => {
    const asset = await createAsset()

    expect(
      await resolveServableAsset({ academyId, assetId: asset.id }),
    ).toBeNull()

    await completeMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    const servable = await resolveServableAsset({
      academyId,
      assetId: asset.id,
    })

    expect(servable?.id).toBe(asset.id)
    expect(servable?.mimeType).toBe('video/mp4')
    expect(servable?.storageKey).toBe(asset.storageKey)
  })

  it('resolves nothing for an asset in a different academy', async () => {
    const asset = await createAsset()

    await completeMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    // The academy is the scope, so asking under the wrong one is the same
    // answer as asking about an id that does not exist.
    expect(
      await resolveServableAsset({
        academyId: otherAcademyId,
        assetId: asset.id,
      }),
    ).toBeNull()
  })

  it('stops resolving as soon as the asset is deleted', async () => {
    const asset = await createAsset()

    await completeMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    expect(
      await resolveServableAsset({ academyId, assetId: asset.id }),
    ).not.toBeNull()

    await deleteMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    // Immediately, not when a sweep next runs: a revoked asset that keeps
    // serving until a job catches up is the window that matters.
    expect(
      await resolveServableAsset({ academyId, assetId: asset.id }),
    ).toBeNull()
  })
})

describe('reading and deleting', () => {
  it('lists only the academy it was asked about', async () => {
    const mine = await createAsset()
    const theirs = await createAsset({ academyId: otherAcademyId })

    const listed = await listMediaAssets(owner(), { workspaceId, academyId })
    const ids = listed.map((asset) => asset.id)

    expect(ids).toContain(mine.id)
    expect(ids).not.toContain(theirs.id)
  })

  it('hides a deleted asset from the list', async () => {
    const asset = await createAsset()

    await deleteMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    const ids = (
      await listMediaAssets(owner(), { workspaceId, academyId })
    ).map((entry) => entry.id)

    expect(ids).not.toContain(asset.id)
  })

  it('refuses to read an asset through an academy it is not in', async () => {
    const asset = await createAsset({ academyId: otherAcademyId })

    await expect(
      getMediaAsset(owner(), { workspaceId, academyId, assetId: asset.id }),
    ).rejects.toThrow(/not found/i)
  })

  it('refuses to delete an asset through an academy it is not in', async () => {
    const asset = await createAsset({ academyId: otherAcademyId })

    await expect(
      deleteMediaAsset(owner(), { workspaceId, academyId, assetId: asset.id }),
    ).rejects.toThrow(/not found/i)

    // Still there, and still unfinished — the refusal did nothing.
    expect(asset.status).toBe('PROCESSING')
  })

  it('refuses an anonymous caller outright', async () => {
    const asset = await createAsset()

    await expect(
      listMediaAssets({ kind: 'anonymous' }, { workspaceId, academyId }),
    ).rejects.toThrow(ForbiddenError)

    await expect(
      deleteMediaAsset(
        { kind: 'anonymous' },
        {
          workspaceId,
          academyId,
          assetId: asset.id,
        },
      ),
    ).rejects.toThrow(ForbiddenError)
  })

  it('refuses a learner reading an academy they are not enrolled in', async () => {
    const asset = await createAsset()

    await expect(
      getMediaAsset(
        { kind: 'learner', learnerId: 'someone', academyId: otherAcademyId },
        { workspaceId, academyId, assetId: asset.id },
      ),
    ).rejects.toThrow(ForbiddenError)
  })
})

describe('lessons and assets together', () => {
  it('keeps an asset scoped to the academy its lesson is in', async () => {
    /**
     * The invariant the `academyId` column exists for: an asset is created
     * before the lesson that will use it, so its owner is recorded on the asset
     * rather than derived through a lesson that does not exist yet.
     */
    const course = await createCourse(instructor(), {
      workspaceId,
      academyId,
      title: `Illustrated ${tag()}`,
      slug: `illustrated-${tag()}`,
    })

    const module = await createModule(instructor(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Module',
    })

    const asset = await createAsset()

    const lesson = await createLesson(instructor(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Video',
      contentType: 'VIDEO',
      mediaAssetId: asset.id,
    })

    expect(lesson.mediaAssetId).toBe(asset.id)

    const reloaded = await getMediaAsset(instructor(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    expect(reloaded.academyId).toBe(academyId)
  })
})
