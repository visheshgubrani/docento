import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { StorageAdapter } from '@docento/integrations'
import { StorageError } from '@docento/integrations'
import {
  type Principal,
  completeMediaAsset,
  createAcademy,
  createCourse,
  createLesson,
  createMediaAsset,
  createModule,
  createWorkspace,
  deleteMediaAsset,
  enroll,
  prisma,
  publishCourse,
} from '@docento/domain'

import { createApp } from '../app.js'

/**
 * The byte routes, over HTTP, with entitlement actually checked.
 *
 * ## Why this file exists
 *
 * The domain's media suite proves the row-level rules and passes. It would pass
 * just as well if the serve route ignored the caller completely — and for a
 * while it did: `media:serve` was declared, role-mapped and unit-tested, and
 * called by nothing in production, so any anonymous request holding an academy
 * id and an asset id received the bytes.
 *
 * That is the class of bug a domain test cannot catch, because the missing call
 * is in the layer above. So these drive the app.
 *
 * ## What is asserted, and why each one
 *
 *   - anonymous refused, and the refusal is a `404` rather than a `403`;
 *   - a learner with no enrollment refused — `media:serve` alone is
 *     academy-wide, so this is the case the entitlement check exists for;
 *   - a learner whose grant is revoked refused on the *next request*, which is
 *     ADR 0008's "checked at play time against enrollment" stated as a test;
 *   - an asset named with another academy's id refused;
 *   - a deleted asset stops serving immediately;
 *   - the byte range a player asks for is the byte range it gets.
 *
 * ## Why storage is a fake
 *
 * `createApp` accepts an adapter precisely so these can run without a
 * filesystem. The fake is in memory, supports ranges, and reports
 * `acceptsRanges`, which is the only thing the route reads from it.
 */

const bytes = new TextEncoder().encode('0123456789abcdefghijklmnopqrstuvwxyz')

/** An in-memory adapter: enough of `StorageAdapter` for the byte routes. */
function fakeStorage(options: { acceptsRanges?: boolean } = {}) {
  const files = new Map<string, Uint8Array>()
  const acceptsRanges = options.acceptsRanges ?? true

  const adapter: StorageAdapter = {
    provider: 'local',

    async createUploadTarget(target) {
      return {
        url: `http://localhost/api/v1/media/upload/${encodeURIComponent(target.key)}`,
        method: 'PUT',
        headers: { 'content-type': target.contentType },
        expiresAt: new Date(Date.now() + 60_000),
      }
    },

    async put(target, body) {
      files.set(target.key, new Uint8Array(await new Response(body).arrayBuffer()))
    },

    async get({ key, range }) {
      const stored = files.get(key)

      if (!stored) {
        throw new StorageError('not_found', 'That object is not stored here.')
      }

      if (!range || !acceptsRanges) {
        return {
          body: new Response(stored).body as ReadableStream<Uint8Array>,
          contentType: 'application/octet-stream',
          size: stored.byteLength,
          acceptsRanges,
        }
      }

      const end = range.end ?? stored.byteLength - 1

      if (range.start >= stored.byteLength || range.start > end) {
        throw new StorageError(
          'range_not_satisfiable',
          'That byte range is past the end of the object.',
        )
      }

      const slice = stored.slice(range.start, Math.min(end, stored.byteLength - 1) + 1)

      return {
        body: new Response(slice).body as ReadableStream<Uint8Array>,
        contentType: 'application/octet-stream',
        size: slice.byteLength,
        acceptsRanges: true,
      }
    },

    async delete(key) {
      files.delete(key)
    },

    async exists(key) {
      return files.has(key)
    },
  }

  return { adapter, files }
}

const storage = fakeStorage()
const app = createApp({ storage: storage.adapter })

const tag = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

let workspaceId = ''
let academyId = ''
let otherAcademyId = ''
let courseId = ''
let enrolledLearnerId = ''
let strangerLearnerId = ''
let enrolledCookie = ''
let strangerCookie = ''
let ownerUserId = ''
let servedAssetId = ''

const owner = (): Principal => ({
  kind: 'staff',
  userId: ownerUserId,
  workspaceId,
  memberId: 'unused',
  role: 'owner',
})

/** A READY asset whose bytes are in the fake, plus the lesson that uses it. */
async function publishCourseWithMedia(input: {
  academy: string
  filename: string
  content: Uint8Array
  contentType?: string
}) {
  const asset = await createMediaAsset(owner(), {
    workspaceId,
    academyId: input.academy,
    provider: 'local',
    storageKeyFor: (assetId) => `${workspaceId}/${assetId}/${input.filename}`,
    originalFilename: input.filename,
    mimeType: input.contentType ?? 'video/mp4',
    sizeBytes: input.content.byteLength,
  })

  storage.files.set(asset.storageKey as string, input.content)

  await completeMediaAsset(owner(), {
    workspaceId,
    academyId: input.academy,
    assetId: asset.id,
    sizeBytes: input.content.byteLength,
  })

  return asset
}

beforeAll(async () => {
  const suffix = tag()

  ownerUserId = (
    await prisma.staffUser.create({
      data: {
        id: `u-${suffix}`,
        name: 'Owner',
        email: `media-route-${suffix}@example.com`,
      },
    })
  ).id

  workspaceId = (
    await createWorkspace({
      name: `Media route ${suffix}`,
      slug: `media-route-${suffix}`,
      ownerUserId,
    })
  ).id

  academyId = (
    await createAcademy(owner(), workspaceId, {
      name: 'Primary',
      slug: `media-route-primary-${tag()}`,
    })
  ).id

  /**
   * A second academy in the *same* workspace.
   *
   * The interesting containment question is not another tenant — that is the
   * workspace check — but another academy of the same tenant, which is what the
   * `academyId` column and the `media:serve` resource scope exist for.
   */
  otherAcademyId = (
    await createAcademy(owner(), workspaceId, {
      name: 'Secondary',
      slug: `media-route-secondary-${tag()}`,
    })
  ).id

  const asset = await publishCourseWithMedia({
    academy: academyId,
    filename: 'lecture.mp4',
    content: bytes,
  })

  const course = await createCourse(owner(), {
    workspaceId,
    academyId,
    title: 'Watching things',
    slug: `watching-${tag()}`,
  })

  courseId = course.id

  const module = await createModule(owner(), {
    workspaceId,
    academyId,
    courseId,
    title: 'Module',
  })

  await createLesson(owner(), {
    workspaceId,
    academyId,
    courseId,
    moduleId: module.id,
    title: 'The lesson',
    contentType: 'VIDEO',
    mediaAssetId: asset.id,
  })

  await publishCourse(owner(), { workspaceId, academyId, courseId })

  /**
   * Two learners, through the route rather than the instance.
   *
   * `/api/auth/learners/*` resolves the academy before choosing the realm, so
   * the session that comes back carries an academy the API can resolve — which
   * is what makes the cookie usable here.
   */
  const signUpLearner = async (label: string) => {
    const response = await app.request('/api/auth/learners/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-academy-slug': (
          await prisma.academy.findUniqueOrThrow({
            where: { id: academyId },
            select: { slug: true },
          })
        ).slug,
      },
      body: JSON.stringify({
        email: `media-${label}-${tag()}@example.com`,
        password: 'a-long-enough-password',
        name: label,
      }),
    })

    expect(response.ok, `learner sign-up (${label})`).toBe(true)

    return (response.headers.getSetCookie?.() ?? [])
      .map((entry) => entry.split(';')[0])
      .join('; ')
  }

  enrolledCookie = await signUpLearner('Enrolled')
  strangerCookie = await signUpLearner('Stranger')

  const learners = await prisma.learner.findMany({
    where: { academyId },
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
  })

  enrolledLearnerId =
    learners.find((learner) => learner.name === 'Enrolled')?.id ?? ''
  strangerLearnerId =
    learners.find((learner) => learner.name === 'Stranger')?.id ?? ''

  expect(enrolledLearnerId, 'the enrolled learner exists').toBeTruthy()
  expect(strangerLearnerId, 'the stranger learner exists').toBeTruthy()

  /**
   * Enrollment, which is what mints the grant the serve route checks.
   *
   * Through the domain operation rather than a raw insert, because the grant is
   * the thing under test: an insert here would be this test's opinion about what
   * enrolling produces.
   */
  await enroll(
    { kind: 'learner', learnerId: enrolledLearnerId, academyId },
    { workspaceId: null, academyId, courseId, learnerId: enrolledLearnerId },
  )

  /** The asset the served-bytes assertions below use. */
  servedAssetId = asset.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(() => {
  delete process.env.MEDIA_MAX_UPLOAD_BYTES
})

/** A GET of one asset's bytes. */
function serve(options: {
  academy?: string
  assetId: string
  cookie?: string
  range?: string
}) {
  const headers: Record<string, string> = {}

  if (options.cookie) headers.cookie = options.cookie
  if (options.range) headers.range = options.range

  /**
   * The academy comes from the path, and deliberately nothing else does.
   *
   * No `x-academy-slug`: a `<video>` element cannot send one, which is exactly
   * why the route resolves the academy from the path. Sending it here would
   * test a request no browser makes.
   */
  return app.request(
    `/api/v1/media/${options.academy ?? academyId}/${options.assetId}`,
    { headers },
  )
}

describe('serving bytes', () => {
  it('refuses an anonymous request, and says nothing about whether the asset exists', async () => {
    const response = await serve({ assetId: servedAssetId })

    /**
     * `404` rather than `403`.
     *
     * A `403` would confirm the asset exists, which turns the endpoint into a
     * way to test whether an academy holds a given id — and a media URL is
     * exactly the thing that gets shared.
     */
    expect(response.status).toBe(404)
  })

  it('refuses a learner who is not enrolled in the course that uses the asset', async () => {
    /**
     * This is the assertion the whole file exists for.
     *
     * `media:serve` is granted to any learner of the academy, so a check on it
     * alone would pass here — and would hand every signed-up learner every video
     * in the academy, including courses they never enrolled in. ADR 0008 says
     * access is checked against enrollment, so this must be a refusal.
     */
    const response = await serve({
      assetId: servedAssetId,
      cookie: strangerCookie,
    })

    expect(response.status).toBe(404)
  })

  it('serves the bytes to an enrolled learner', async () => {
    const response = await serve({
      assetId: servedAssetId,
      cookie: enrolledCookie,
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('video/mp4')
    expect(response.headers.get('accept-ranges')).toBe('bytes')

    /**
     * `nosniff` and `inline` together, asserted because they are the pair that
     * makes an uploaded file safe to render: the declared type is honoured and
     * never guessed, and the type was checked against an allow-list at upload.
     */
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-disposition')).toBe('inline')

    const body = new Uint8Array(await response.arrayBuffer())

    expect(body).toEqual(bytes)
  })

  it('answers a range request with 206 and only those bytes', async () => {
    const response = await serve({
      assetId: servedAssetId,
      cookie: enrolledCookie,
      range: 'bytes=2-5',
    })

    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 2-5/*')

    const body = new TextDecoder().decode(await response.arrayBuffer())

    expect(body).toBe('2345')
  })

  it('answers a range past the end of the object with 416, not 500', async () => {
    /**
     * A player that seeks past the end is an ordinary client doing an ordinary
     * thing, and the answer it needs is "ask again without a range". Before the
     * storage error was mapped, this was a `500` — which tells the caller to
     * stop, and tells an operator to look for a bug that is not there.
     */
    const response = await serve({
      assetId: servedAssetId,
      cookie: enrolledCookie,
      range: 'bytes=999999-',
    })

    expect(response.status).toBe(416)
  })

  it('refuses an asset named with another academy of the same workspace', async () => {
    // The caller is entitled in their own academy. Naming a sibling academy must
    // not widen that, or `academyId` in the path would be decoration.
    const response = await serve({
      academy: otherAcademyId,
      assetId: servedAssetId,
      cookie: enrolledCookie,
    })

    expect(response.status).toBe(404)
  })

  it('stops serving a revoked grant on the next request', async () => {
    /**
     * ADR 0008: "access is checked at play time against enrollment — not at the
     * time the page was rendered", and a client never receives a durable URL.
     *
     * So the grant is revoked and the *same* request is repeated. A learner who
     * lost access mid-course must stop receiving bytes, rather than finishing
     * the video from a URL they already hold.
     */
    const grant = await prisma.accessGrant.findFirstOrThrow({
      where: { academyId, courseId, learnerId: enrolledLearnerId, revokedAt: null },
      select: { id: true },
    })

    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { revokedAt: new Date() },
    })

    const response = await serve({
      assetId: servedAssetId,
      cookie: enrolledCookie,
    })

    expect(response.status).toBe(404)

    // Restored, so the order of these tests does not matter.
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { revokedAt: null },
    })

    await expect(
      serve({ assetId: servedAssetId, cookie: enrolledCookie }),
    ).resolves.toMatchObject({ status: 200 })
  })

  it('stops serving a deleted asset immediately', async () => {
    /**
     * The asset has to be reachable *before* it is deleted, or this asserts
     * nothing: an asset no published release uses is already refused by the
     * entitlement check, and the test would pass without the deletion doing
     * anything. So it is added to the course and published first.
     */
    const asset = await publishCourseWithMedia({
      academy: academyId,
      filename: 'temporary.mp4',
      content: bytes,
    })

    const module = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId,
      title: 'Second module',
    })

    await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId,
      moduleId: module.id,
      title: 'The temporary lesson',
      contentType: 'VIDEO',
      mediaAssetId: asset.id,
    })

    await publishCourse(owner(), { workspaceId, academyId, courseId })

    const before = await serve({ assetId: asset.id, cookie: enrolledCookie })

    expect(before.status).toBe(200)

    /**
     * The same cookie, unchanged. This asserts that the *row's* state stops the
     * bytes — the half the route owns. The caller's entitlement is identical
     * before and after, and the answer changes anyway.
     */
    await deleteMediaAsset(owner(), {
      workspaceId,
      academyId,
      assetId: asset.id,
    })

    const after = await serve({ assetId: asset.id, cookie: enrolledCookie })

    expect(after.status).toBe(404)
  })

  it('refuses an asset that is not in an academy at all', async () => {
    const response = await serve({
      academy: 'academy-that-does-not-exist',
      assetId: servedAssetId,
      cookie: enrolledCookie,
    })

    expect(response.status).toBe(404)
  })
})

describe('receiving bytes', () => {
  it('refuses a key that was never issued', async () => {
    const response = await app.request(
      `/api/v1/media/upload/${workspaceId}/not-an-asset/file.mp4`,
      { method: 'PUT', body: bytes },
    )

    expect(response.status).toBe(404)
  })

  it('accepts an upload whose filename contains a literal percent', async () => {
    /**
     * A regression, and the reason is worth keeping.
     *
     * Hono already decodes a path parameter. Decoding it a second time threw
     * `URIError` on `100%.mp4` — a perfectly ordinary filename — and the route
     * reported `500`. It also meant a double-encoded traversal sequence survived
     * the second pass, so the key that was *verified* was not the key that was
     * *written*; the adapter still refused the escape, but a check examining a
     * different string from the one it guards is not a check.
     */
    const asset = await createMediaAsset(owner(), {
      workspaceId,
      academyId,
      provider: 'local',
      storageKeyFor: (assetId) => `${workspaceId}/${assetId}/100%.mp4`,
      originalFilename: '100%.mp4',
      mimeType: 'video/mp4',
    })

    const response = await app.request(
      `/api/v1/media/upload/${workspaceId}/${asset.id}/100%25.mp4`,
      { method: 'PUT', body: bytes },
    )

    expect(response.status).toBe(200)
    expect(storage.files.get(`${workspaceId}/${asset.id}/100%.mp4`)).toEqual(
      bytes,
    )
  })

  it('refuses a body larger than the deployment accepts', async () => {
    process.env.MEDIA_MAX_UPLOAD_BYTES = '16'

    const asset = await createMediaAsset(owner(), {
      workspaceId,
      academyId,
      provider: 'local',
      storageKeyFor: (assetId) => `${workspaceId}/${assetId}/big.mp4`,
      originalFilename: 'big.mp4',
      mimeType: 'video/mp4',
    })

    const response = await app.request(
      `/api/v1/media/upload/${workspaceId}/${asset.id}/big.mp4`,
      { method: 'PUT', body: bytes },
    )

    expect(response.status).toBe(413)

    /**
     * And nothing was written.
     *
     * A cap that refused the response while leaving a partial file behind would
     * be worse than no cap: the row would be completable and the course would
     * serve a truncated video.
     */
    expect(storage.files.has(`${workspaceId}/${asset.id}/big.mp4`)).toBe(false)
  })
})
