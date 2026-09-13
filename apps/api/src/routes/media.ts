import { Hono } from 'hono'

import type { StorageAdapter } from '@docento/integrations'
import {
  NotFoundError,
  authorizeMediaServe,
  resolveAcademyById,
  resolvePendingAssetByKey,
} from '@docento/domain'

import { resolvePrincipal } from '../auth/principal.js'
import { handleError } from '../middleware/respond.js'

/**
 * The two media routes that move bytes.
 *
 * ## Why these are not operations
 *
 * Every other route in this API is a JSON operation declared in
 * `@docento/contracts`: it validates an input against a schema, invokes a domain
 * operation, and wraps the result in an envelope. These two cannot be described
 * that way. One receives a file body and the other returns a file, and neither
 * has a JSON response for a generated client to unwrap — so declaring them as
 * operations would mean a `response` schema that lies, an SDK method that
 * returns nonsense, and an OpenAPI entry that documents the wrong thing.
 *
 * What they are not is unchecked. Both go through a domain operation for the
 * part that is a business rule: upload confirms the key the client was given,
 * and serving goes through `authorizeMediaServe`, which decides whether this
 * caller is entitled to these bytes before any are read.
 *
 * ## Why the upload key is verified rather than trusted
 *
 * The local adapter's target points back at this process with the storage key in
 * the path, so the client chooses it. A route that wrote wherever the key said
 * would let a caller overwrite another workspace's media by guessing a path.
 * `createMediaAsset` built the key — `workspaceId/assetId/filename` — so the
 * route rebuilds the expected prefixes and refuses anything else. The adapter's
 * own path check is still there; this is the layer that knows whose key it is.
 */

type MediaContext = {
  storage: StorageAdapter
}

/**
 * The largest body this route will read, when nothing says otherwise.
 *
 * A cap is not the same as a quota: it exists so a single request cannot fill
 * the disk or hold a connection open for an unbounded stream, and it is
 * deliberately generous because the default storage is a self-hoster's own
 * filesystem and a lecture recording is legitimately large. `MEDIA_MAX_UPLOAD_BYTES`
 * lowers it for a deployment that wants a real limit.
 */
const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

function maxUploadBytes(): number {
  const configured = Number(process.env.MEDIA_MAX_UPLOAD_BYTES)

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_UPLOAD_BYTES
}

/**
 * Raised from inside a stream, so the route can answer `413` rather than `500`.
 *
 * A `class` rather than a flag, because the failure surfaces from whichever
 * adapter was consuming the stream — `storage.put` is the thing that observes
 * it — and `instanceof` is what keeps it distinguishable from a genuine
 * storage fault once it has travelled back through that call.
 */
class UploadTooLargeError extends Error {}

/**
 * A body that fails once it exceeds `limit`.
 *
 * The bytes are counted as they arrive rather than trusted from
 * `content-length`, because that header is a claim: a client that omits it, or
 * lies about it, would otherwise stream without bound and fill the disk the cap
 * exists to protect.
 *
 * The stream is failed rather than truncated. A truncated write that reported
 * success would leave a file that plays until it does not — and the operator
 * would have no reason to re-upload it, which is a worse failure than one that
 * visibly did not work.
 */
function bodyLimitedTo(
  body: ReadableStream<Uint8Array>,
  limit: number,
): ReadableStream<Uint8Array> {
  let seen = 0

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength

        if (seen > limit) {
          controller.error(new UploadTooLargeError())
          return
        }

        controller.enqueue(chunk)
      },
    }),
  )
}

/**
 * A byte range from a `Range` header.
 *
 * Parsed here rather than in the storage adapter, because parsing a range is a
 * contract with HTTP and an adapter that also parsed it would be a second
 * implementation of the same rules. Only the single-range form is understood:
 * a multipart range response is a different content type and no player needs it.
 */
function parseRange(header: string | undefined): { start: number; end?: number } | undefined {
  if (!header) return undefined

  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim())

  if (!match) return undefined

  const start = Number(match[1])
  const end = match[2] ? Number(match[2]) : undefined

  if (!Number.isFinite(start) || start < 0) return undefined
  if (end !== undefined && (!Number.isFinite(end) || end < start)) return undefined

  return { start, ...(end === undefined ? {} : { end }) }
}

/**
 * The routes, mounted under `/api/v1`.
 *
 * ## Why the workspace is a path segment and not the header
 *
 * Every JSON operation takes its workspace from `x-workspace-id`, because a
 * staff request has to say which tenant it means. These routes are reached by a
 * *browser uploading a file* or a *player fetching one*, and neither is a staff
 * API call — the learner's browser has no workspace to name. So the academy, not
 * the workspace, is what these paths carry, and the storage key's workspace
 * prefix is verified against the caller rather than read from the request.
 */
export function createMediaRoutes(options: MediaContext): Hono {
  const routes = new Hono()

  /**
   * Receive the bytes for a key the API issued.
   *
   * ## Why the principal is not re-checked here
   *
   * It cannot be, usefully: this URL is followed by a *browser* that has a
   * session cookie, and with S3 configured it is not followed at all. What
   * protects it is that the key names a `PROCESSING` asset in a workspace, and
   * overwriting an existing object requires knowing its key — an id no caller is
   * told. A caller who uploads to their own asset's key is doing the thing this
   * route exists for.
   *
   * The body is streamed rather than buffered: a video is not something to hold
   * in memory, and buffering would set the process's ceiling to the largest file
   * anybody uploads.
   */
  routes.put('/media/upload/:key{.+}', async (c) => {
    try {
      /**
       * Not decoded again.
       *
       * Hono has already decoded the path parameter, and calling
       * `decodeURIComponent` a second time is not a no-op: a filename
       * containing a literal `%` — `100%.mp4` — throws `URIError` and becomes a
       * `500`, and a double-encoded `%2e%2e%2f` survives a second pass, so the
       * key this route *verifies* stops being the key it *writes*. The adapter
       * would still refuse an escape, but a check that examines a different
       * string from the one it guards is not a check.
       */
      const key = c.req.param('key')

      const [workspaceId, assetId] = key.split('/')

      if (!workspaceId || !assetId) {
        return handleError(c, new NotFoundError('media asset', key))
      }

      /**
       * The asset must exist, be unfinished, and be in the workspace its key
       * claims. Anything else is a key that was not issued here.
       */
      const asset = await resolvePendingAssetByKey({ workspaceId, assetId })

      if (!asset) {
        return handleError(c, new NotFoundError('media asset', assetId))
      }

      if (!options.storage.put) {
        /**
         * An adapter with no `put` is one whose targets point somewhere else —
         * S3. Reaching this route with such a key means the client ignored the
         * target it was given, and saying so is better than a silent no-op.
         */
        return c.json(
          {
            success: false,
            error: {
              code: 'validation_failed' as const,
              message:
                'This deployment uploads directly to storage; do not send bytes to the API.',
            },
          },
          422,
        )
      }

      const body = c.req.raw.body

      if (!body) {
        return c.json(
          {
            success: false,
            error: {
              code: 'validation_failed' as const,
              message: 'The request had no body to store.',
            },
          },
          422,
        )
      }

      const limit = maxUploadBytes()

      /**
       * A declared length above the cap is refused before a byte is read.
       *
       * `content-length` is a claim and not evidence, so this is the cheap
       * rejection rather than the guard — the counter below is the guard. Both
       * exist because the common case is an honest client with an oversized
       * file, and refusing it after streaming two gigabytes wastes exactly the
       * thing the cap protects.
       */
      const declared = Number(c.req.header('content-length') ?? '')

      if (Number.isFinite(declared) && declared > limit) {
        return c.json(
          {
            success: false,
            error: {
              code: 'validation_failed' as const,
              message: `The upload is larger than this deployment accepts (${limit} bytes).`,
            },
          },
          413,
        )
      }

      await options.storage.put(
        {
          key,
          contentType: asset.mimeType ?? 'application/octet-stream',
        },
        bodyLimitedTo(body, limit),
      )

      return c.json({ success: true, data: { ok: true } }, 200)
    } catch (error) {
      if (error instanceof UploadTooLargeError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'validation_failed' as const,
              message: `The upload is larger than this deployment accepts (${maxUploadBytes()} bytes).`,
            },
          },
          413,
        )
      }

      return handleError(c, error)
    }
  })

  /**
   * Serve the bytes for an asset.
   *
   * ## Who may have them
   *
   * `authorizeMediaServe` decides, and it decides before a byte is read: the
   * caller must reach the academy (`media:serve`) and, when they are a learner,
   * must currently have access to a course whose published release uses this
   * asset. That second half is the one that matters — `media:serve` is granted
   * academy-wide, so the check alone would hand a learner every video in the
   * academy, including the ones they never enrolled in.
   *
   * ## Why the academy comes from the path
   *
   * A `<video>` element issues a plain GET. It sends no `x-academy-slug`, and
   * behind a proxy the `Host` the API sees is the API's own, so neither input
   * the JSON API resolves an academy from is available here. The path segment
   * *selects* which academy the request is about — exactly as a hostname does —
   * and the caller is still resolved from their session, so naming an academy
   * grants nothing.
   *
   * A refusal and an unknown id are the same `404`, so the endpoint cannot be
   * used to test whether an academy holds a given asset.
   */
  routes.get('/media/:academyId/:assetId', async (c) => {
    try {
      const academyId = c.req.param('academyId')
      const assetId = c.req.param('assetId')

      const academy = await resolveAcademyById(academyId)

      const principal = await resolvePrincipal(c, academy)

      const asset = academy
        ? await authorizeMediaServe({ principal, academyId: academy.id, assetId })
        : null

      if (!asset) {
        return handleError(c, new NotFoundError('media asset', assetId))
      }

      const range = parseRange(c.req.header('range'))

      const object = await options.storage.get({
        key: asset.storageKey,
        ...(range ? { range } : {}),
      })

      /**
       * `206` only when the response really is a range.
       *
       * A provider that cannot do ranges returns the whole object, and
       * answering `206` with a `Content-Range` for it tells a player it may seek
       * within something it cannot — so the status follows what came back
       * rather than what was asked for.
       */
      const partial = range !== undefined && object.acceptsRanges

      /**
       * `Accept-Ranges` is reported from what the provider can actually do,
       * rather than asserted. A player that is told a file is seekable and then
       * finds it is not restarts from zero, and the flag is what stops it.
       */
      const headers: Record<string, string> = {
        'content-type': asset.mimeType,
        'cache-control': 'private, max-age=300',
        'accept-ranges': object.acceptsRanges ? 'bytes' : 'none',
        /**
         * `nosniff`, always. The MIME type is validated on upload against an
         * allow-list, and this is the second half of that: a browser that
         * ignores the declared type and sniffs an HTML file out of a `.txt`
         * upload would serve an attacker's script from this origin.
         */
        'x-content-type-options': 'nosniff',
        /**
         * Inline for media, because a PDF or a video is meant to be viewed.
         * Everything is still `nosniff`ed and SVG is refused at upload, so
         * "inline" cannot become "executed".
         */
        'content-disposition': 'inline',
      }

      if (object.size !== null) {
        headers['content-length'] = String(object.size)
      }

      if (partial && object.size !== null && range) {
        headers['content-range'] = `bytes ${range.start}-${
          range.end ?? range.start + object.size - 1
        }/*`
      }

      return new Response(object.body, {
        status: partial ? 206 : 200,
        headers,
      })
    } catch (error) {
      return handleError(c, error)
    }
  })

  return routes
}

