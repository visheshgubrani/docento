import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildStorageKey,
  createLocalStorage,
  createStorage,
  sanitiseFilename,
  StorageError,
} from '../index.js'

/**
 * The local adapter is the default and the only one a test can exercise without
 * a bucket, so it carries the weight: path traversal, range handling, partial
 * writes, and the key shape that keeps two tenants' media apart on one disk.
 *
 * The S3 adapter is not tested here. Its interesting behaviour is the presigner
 * and the provider's own responses, both of which a test would have to mock into
 * agreement with itself — and the part worth asserting, that downloads go
 * through the API rather than a presigned URL, is a property of the route that
 * calls it rather than of the adapter.
 */

let directory: string

/**
 * The local adapter, with `put` narrowed to present.
 *
 * `put` is optional on the interface because an S3 upload goes straight to the
 * bucket and never reaches this process. The local adapter is the one that
 * receives bytes, so the test asserts that rather than working around it.
 */
function storage(): ReturnType<typeof createLocalStorage> & {
  put: NonNullable<ReturnType<typeof createLocalStorage>['put']>
} {
  return createLocalStorage({
    directory,
    apiUrl: 'http://localhost:4000',
  }) as ReturnType<typeof createLocalStorage> & {
    put: NonNullable<ReturnType<typeof createLocalStorage>['put']>
  }
}

const bytes = (text: string) => new TextEncoder().encode(text)

/**
 * A `ReadableStream` from a string.
 *
 * `ReadableStream.from` is not available in every runtime this package
 * supports, so the constructor is used directly.
 */
function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes(text))
      controller.close()
    },
  })
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  return new TextDecoder().decode(
    chunks.reduce((all, chunk) => {
      const merged = new Uint8Array(all.length + chunk.length)
      merged.set(all)
      merged.set(chunk, all.length)
      return merged
    }, new Uint8Array()),
  )
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'docento-storage-'))
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('put and get', () => {
  it('round-trips an object', async () => {
    const adapter = storage()

    await adapter.put(
      { key: 'ws/asset/notes.txt', contentType: 'text/plain' },
      streamOf('hello'),
    )

    expect(await adapter.exists('ws/asset/notes.txt')).toBe(true)

    const object = await adapter.get({ key: 'ws/asset/notes.txt' })
    expect(await readAll(object.body)).toBe('hello')
  })

  it('creates the directories a nested key needs', async () => {
    // A key has two directories by construction, and neither exists on a fresh
    // install — so a write that did not create them would fail on the first
    // upload and succeed on the second, which is the worst kind of bug.
    const adapter = storage()

    await adapter.put(
      { key: 'a/b/c/deep.txt', contentType: 'text/plain' },
      streamOf('deep'),
    )

    expect(await adapter.exists('a/b/c/deep.txt')).toBe(true)
  })

  it('reports a missing object as not-found rather than as a failure', async () => {
    await expect(storage().get({ key: 'nowhere.txt' })).rejects.toMatchObject({
      code: 'not_found',
    })
  })

  it('reports existence honestly', async () => {
    const adapter = storage()

    expect(await adapter.exists('absent.txt')).toBe(false)
  })
})

describe('keys', () => {
  it('refuses a key that escapes the storage root', async () => {
    /**
     * The check that matters most in this file. A key is built from an
     * author-supplied filename, and a `..` that survived would let an upload
     * write anywhere the process can reach — including over the application's
     * own source in a development checkout.
     */
    const adapter = storage()

    await expect(
      adapter.put(
        { key: '../../escaped.txt', contentType: 'text/plain' },
        streamOf('nope'),
      ),
    ).rejects.toBeInstanceOf(StorageError)

    await expect(
      adapter.get({ key: '../../etc/passwd' }),
    ).rejects.toBeInstanceOf(StorageError)
  })

  it('refuses at the moment a target is minted, not only at write', async () => {
    // Failing when the client asks for a destination is a refusal it can report;
    // failing when the bytes arrive is one it discovers halfway through an
    // upload.
    await expect(
      storage().createUploadTarget({
        key: '../escape.txt',
        contentType: 'text/plain',
      }),
    ).rejects.toBeInstanceOf(StorageError)
  })

  it('builds a key that separates workspaces and assets', () => {
    const key = buildStorageKey({
      workspaceId: 'ws1',
      assetId: 'a1',
      filename: 'lecture.mp4',
    })

    expect(key).toBe('ws1/a1/lecture.mp4')
  })

  it('keeps two uploads of the same filename apart', () => {
    // Without the asset id, the second upload of `lecture.mp4` would overwrite
    // the first — and an author would discover it when a lesson played the wrong
    // video.
    const first = buildStorageKey({
      workspaceId: 'ws',
      assetId: 'a1',
      filename: 'x.mp4',
    })
    const second = buildStorageKey({
      workspaceId: 'ws',
      assetId: 'a2',
      filename: 'x.mp4',
    })

    expect(first).not.toBe(second)
  })

  it('declares a workspace prefix an operator can browse', () => {
    // The reason the shape is not a random uuid: an operator looking at a bucket
    // can find a tenant's media without a database query.
    expect(
      buildStorageKey({
        workspaceId: 'ws9',
        assetId: 'a',
        filename: 'f',
      }).startsWith('ws9/'),
    ).toBe(true)
  })
})

describe('filenames', () => {
  it.each([
    ['plain.mp4', 'plain.mp4'],
    ['with spaces.pdf', 'with spaces.pdf'],
    ['../../etc/passwd', 'passwd'],
    ['/absolute/path.png', 'path.png'],
    ['windows\\path\\file.docx', 'file.docx'],
    ['null\u0000byte.txt', 'nullbyte.txt'],
    ['', 'file'],
    ['...', 'file'],
  ])('sanitises %j to %j', (input, expected) => {
    /**
     * A name is display information, not a path.
     *
     * Stripping the directory components rather than escaping them matters: a
     * preserved separator would let a caller choose where their upload lands,
     * and `..` would let them choose outside the workspace prefix.
     */
    expect(sanitiseFilename(input)).toBe(expected)
  })

  it('truncates a very long name rather than refusing it', () => {
    const long = `${'a'.repeat(500)}.mp4`
    const result = sanitiseFilename(long)

    expect(result.length).toBeLessThanOrEqual(120)
    expect(result.endsWith('.mp4')).toBe(true)
  })

  it('keeps the extension when truncating, because it is the useful part', () => {
    // Slicing from the end rather than the front: a truncated name that lost its
    // extension would be served with a content type nobody can infer.
    expect(sanitiseFilename(`${'b'.repeat(200)}.pdf`).endsWith('.pdf')).toBe(
      true,
    )
  })
})

describe('byte ranges', () => {
  const content = 'abcdefghij'

  async function seed(): Promise<ReturnType<typeof storage>> {
    const adapter = storage()

    await adapter.put(
      { key: 'ranged.txt', contentType: 'text/plain' },
      streamOf(content),
    )

    return adapter
  }

  it('serves a range', async () => {
    // Video seeking depends on this, and a provider that silently ignores a
    // range makes a seek restart from the beginning.
    const adapter = await seed()
    const object = await adapter.get({
      key: 'ranged.txt',
      range: { start: 2, end: 4 },
    })

    expect(await readAll(object.body)).toBe('cde')
    expect(object.size).toBe(3)
  })

  it('serves an open-ended range to the end of the object', async () => {
    const adapter = await seed()
    const object = await adapter.get({ key: 'ranged.txt', range: { start: 7 } })

    expect(await readAll(object.body)).toBe('hij')
  })

  it('clamps an end past the object rather than failing', async () => {
    // A player estimating the end asks for more than exists, and refusing would
    // break playback for a request that is reasonable.
    const adapter = await seed()
    const object = await adapter.get({
      key: 'ranged.txt',
      range: { start: 8, end: 500 },
    })

    expect(await readAll(object.body)).toBe('ij')
  })

  it('refuses a start past the end', async () => {
    // The other direction: a client asking to start beyond the end has a stale
    // idea of the file, and answering with nothing hides that.
    const adapter = await seed()

    await expect(
      adapter.get({ key: 'ranged.txt', range: { start: 500 } }),
    ).rejects.toBeInstanceOf(StorageError)
  })

  it('reports that it accepts ranges', async () => {
    // Reported rather than assumed: a caller that knows the provider cannot
    // range serves the whole object instead of promising a seek.
    const adapter = await seed()

    expect((await adapter.get({ key: 'ranged.txt' })).acceptsRanges).toBe(true)
  })

  it('reports the full size when no range was asked for', async () => {
    const adapter = await seed()

    expect((await adapter.get({ key: 'ranged.txt' })).size).toBe(content.length)
  })
})

describe('delete', () => {
  it('removes an object', async () => {
    const adapter = storage()

    await adapter.put(
      { key: 'gone.txt', contentType: 'text/plain' },
      streamOf('x'),
    )
    await adapter.delete('gone.txt')

    expect(await adapter.exists('gone.txt')).toBe(false)
  })

  it('succeeds when the object is already gone', async () => {
    // The caller is asking for an end state, not for a statement about the
    // past — and a delete retried after a partial failure must not fail.
    await expect(storage().delete('never-existed.txt')).resolves.toBeUndefined()
  })
})

describe('upload targets', () => {
  it('points back at the API, where the bytes are received', async () => {
    // Unlike S3, there is nowhere else for the bytes to go: the API is the only
    // process that can write to this directory.
    const target = await storage().createUploadTarget({
      key: 'ws/a/file.txt',
      contentType: 'text/plain',
    })

    expect(target.method).toBe('PUT')
    expect(target.url).toContain('http://localhost:4000')
    expect(target.headers['content-type']).toBe('text/plain')
  })

  it('carries the key in the path so the route can verify it', async () => {
    // The route checks the key belongs to the asset the caller was authorized
    // for, rather than trusting whatever the client puts in the URL.
    const target = await storage().createUploadTarget({
      key: 'ws/a/file.txt',
      contentType: 'text/plain',
    })

    expect(decodeURIComponent(target.url)).toContain('ws/a/file.txt')
  })

  it('expires', async () => {
    const target = await storage().createUploadTarget({
      key: 'ws/a/file.txt',
      contentType: 'text/plain',
    })

    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('encodes a key with characters a URL would mangle', async () => {
    const target = await storage().createUploadTarget({
      key: 'ws/a/with spaces & ampersand.txt',
      contentType: 'text/plain',
    })

    // A raw space or `&` in the path would change what the route parses.
    expect(target.url).not.toContain(' ')
    expect(target.url).not.toContain('&')
  })
})

describe('provider selection', () => {
  it('builds the local adapter when asked for local', () => {
    expect(
      createStorage({
        driver: 'local',
        localDirectory: directory,
        apiUrl: 'http://x',
      }).provider,
    ).toBe('local')
  })

  it('refuses S3 with no configuration rather than silently using disk', () => {
    /**
     * The tempting fallback is local disk, and it is the wrong one: a deployment
     * that asked for a bucket and got a container's ephemeral filesystem would
     * scatter uploads that vanish on the next restart, and nothing would say so
     * until somebody's video was missing.
     */
    expect(() =>
      createStorage({
        driver: 's3',
        localDirectory: directory,
        apiUrl: 'http://x',
      }),
    ).toThrow(StorageError)
  })
})
