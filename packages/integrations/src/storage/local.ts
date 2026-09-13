import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rm, stat } from 'node:fs/promises'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import {
  type GetOptions,
  type PutOptions,
  type StorageAdapter,
  type StoredObject,
  type UploadTarget,
  StorageError,
} from './types.js'

/**
 * The local filesystem adapter, and the default.
 *
 * A complete install needs no external service, which is the whole constraint
 * this project is built around: local disk plus Postgres is a working academy.
 *
 * ## Uploads arrive through the API
 *
 * Unlike S3, there is nowhere else for the bytes to go — the API is the only
 * process that can write to this directory, and in a container the worker mounts
 * the same volume. So the target points back at this process, and `put` is what
 * receives the body.
 *
 * That is genuinely simpler than presigning for a self-hoster, and it is why the
 * upload contract has a `method` and `headers` rather than assuming a presigned
 * `PUT`: the client follows the target it is given rather than knowing how the
 * deployment is wired.
 */

export type LocalStorageOptions = {
  /** Where objects live. Created on first write. */
  directory: string
  /**
   * Absolute URL prefix for upload targets.
   *
   * The API's own origin. A self-hoster behind a proxy needs this to be the
   * public origin rather than the container's, or the client is told to upload
   * to a hostname it cannot reach.
   */
  apiUrl: string
  /** How long an upload target is accepted. */
  uploadTtlSeconds?: number
}

export function createLocalStorage(
  options: LocalStorageOptions,
): StorageAdapter {
  const root = resolve(options.directory)
  const uploadTtlSeconds = options.uploadTtlSeconds ?? 900

  /**
   * Resolve a key to a path inside the root, refusing anything that escapes.
   *
   * The check is not decoration. A key is built from an author-supplied filename
   * and a generated id, and a `..` that survived would let an upload write
   * anywhere the process can — including over the application's own source in a
   * development checkout.
   */
  function pathFor(key: string): string {
    const candidate = resolve(root, normalize(key).replace(/^([/\\])+/, ''))
    const rootWithSeparator = root.endsWith(sep) ? root : `${root}${sep}`

    if (candidate !== root && !candidate.startsWith(rootWithSeparator)) {
      throw new StorageError(
        'provider_error',
        'That storage key is not valid: it resolves outside the storage root.',
      )
    }

    return candidate
  }

  return {
    provider: 'local',

    async createUploadTarget(putOptions: PutOptions): Promise<UploadTarget> {
      // Validate now rather than at write time, so a bad key is a refusal at the
      // moment the client asks for a destination.
      pathFor(putOptions.key)

      return {
        /**
         * Points back at the API's own upload route.
         *
         * The key travels in the path, so the route can verify the key belongs
         * to the asset the caller was authorized for rather than trusting
         * whatever the client puts in the URL.
         */
        url: `${options.apiUrl.replace(/\/+$/, '')}/api/v1/media/upload/${encodeURIComponent(
          putOptions.key,
        )}`,
        method: 'PUT',
        headers: { 'content-type': putOptions.contentType },
        expiresAt: new Date(Date.now() + uploadTtlSeconds * 1000),
      }
    },

    async put(
      putOptions: PutOptions,
      body: ReadableStream<Uint8Array>,
    ): Promise<void> {
      const path = pathFor(putOptions.key)

      await mkdir(dirname(path), { recursive: true })

      try {
        // Streamed rather than buffered: a video is not something to hold in
        // memory, and buffering would set the process's ceiling to the largest
        // file anybody uploads.
        await pipeline(Readable.fromWeb(body as never), createWriteStream(path))
      } catch (error) {
        /**
         * A partial write is removed rather than left behind.
         *
         * A truncated file that exists is worse than one that does not: the
         * asset would be marked ready and then serve half a video, and nothing
         * would indicate why.
         */
        await rm(path, { force: true }).catch(() => undefined)

        throw new StorageError(
          'provider_error',
          'The upload could not be written.',
          {
            cause: error,
          },
        )
      }
    },

    async get(getOptions: GetOptions): Promise<StoredObject> {
      const path = pathFor(getOptions.key)

      let size: number

      try {
        const stats = await stat(path)

        if (!stats.isFile()) {
          throw new StorageError('not_found', 'That object is not a file.')
        }

        size = stats.size
      } catch (error) {
        if (error instanceof StorageError) throw error

        throw new StorageError('not_found', 'That object is not stored here.', {
          cause: error,
        })
      }

      const { start, end } = rangeFor(getOptions.range, size)

      const stream =
        getOptions.range === undefined
          ? createReadStream(path)
          : createReadStream(path, { start, end })

      return {
        body: Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>,
        contentType: 'application/octet-stream',
        size: getOptions.range === undefined ? size : end - start + 1,
        // Files can be ranged, so video seeking works with no extra service.
        acceptsRanges: true,
      }
    },

    async delete(key: string): Promise<void> {
      // Force, so deleting an object that is already gone succeeds. The caller
      // is asking for an end state, not for a statement about the past.
      await rm(pathFor(key), { force: true })
    },

    async exists(key: string): Promise<boolean> {
      try {
        return (await stat(pathFor(key))).isFile()
      } catch {
        return false
      }
    },
  }
}

/**
 * Clamp a requested range to the object.
 *
 * An end past the file is clamped rather than refused, and a start past it is a
 * refusal: a client that asks for more than exists is usually a player
 * estimating the end, while one that asks to start beyond the end has a stale
 * idea of the file.
 */
function rangeFor(
  range: GetOptions['range'],
  size: number,
): { start: number; end: number } {
  if (!range) return { start: 0, end: Math.max(0, size - 1) }

  const start = Math.max(0, Math.floor(range.start))
  const requestedEnd =
    range.end === undefined ? size - 1 : Math.floor(range.end)
  const end = Math.min(requestedEnd, size - 1)

  if (start > end) {
    /**
     * A range the object cannot satisfy, which is a `416` and not a `404`.
     *
     * Reporting it as absent would tell a player the file is gone, and the
     * right response to that is to stop; the right response to a range past the
     * end is to ask again without one.
     */
    throw new StorageError(
      'range_not_satisfiable',
      'That byte range is past the end of the object.',
    )
  }

  return { start, end }
}

/** Where a key lives on disk, for an operator who needs to look. */
export function localPathFor(directory: string, key: string): string {
  return join(resolve(directory), key)
}
