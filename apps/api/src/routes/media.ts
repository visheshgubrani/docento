import { Hono } from 'hono'

import type { StorageAdapter } from '@docento/integrations'
import {
  NotFoundError,
  resolvePendingAssetByKey,
  resolveServableAsset,
} from '@docento/domain'

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
 * and serving resolves the asset through `resolveServableAsset`, which is scoped
 * to the academy and refuses a soft-deleted or not-yet-ready row.
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
      const key = decodeURIComponent(c.req.param('key'))

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

      await options.storage.put(
        {
          key,
          contentType: asset.mimeType ?? 'application/octet-stream',
        },
        body,
      )

      return c.json({ success: true, data: { ok: true } }, 200)
    } catch (error) {
      return handleError(c, error)
    }
  })

  /**
   * Serve the bytes for an asset.
   *
   * ## Why there is no authorization call in this handler
   *
   * There is, and it is the resolution below: `resolveServableAsset` is scoped to
   * the academy in the path, refuses a soft-deleted or unfinished asset, and
   * returns nothing for an unknown id. On top of that the route requires the
   * academy to resolve for this request at all — an academy that does not resolve
   * serves no bytes, which is the same fail-closed rule the rest of the public
   * surface follows.
   *
   * What it deliberately does not do is distinguish "not yours" from "does not
   * exist". Both are a 404.
   */
  routes.get('/media/:academyId/:assetId', async (c) => {
    try {
      const academyId = c.req.param('academyId')
      const assetId = c.req.param('assetId')

      const asset = await resolveServableAsset({ academyId, assetId })

      if (!asset) {
        return handleError(c, new NotFoundError('media asset', assetId))
      }

      const range = parseRange(c.req.header('range'))

      const object = await options.storage.get({
        key: asset.storageKey,
        ...(range ? { range } : {}),
      })

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

      if (range && object.size !== null) {
        headers['content-range'] = `bytes ${range.start}-${
          range.end ?? range.start + object.size - 1
        }/*`
      }

      return new Response(object.body, {
        status: range ? 206 : 200,
        headers,
      })
    } catch (error) {
      return handleError(c, error)
    }
  })

  return routes
}

