/**
 * Storage.
 *
 * One provider interface with several adapters, selected per asset rather than
 * per workspace: changing a workspace default affects new uploads and never
 * rewrites how existing media is served. An asset records the connection that
 * produced it, permanently — which is why the previous schema's global
 * uniqueness on `(provider, providerAssetId)` was wrong: two workspaces sharing
 * an S3 bucket produce the same provider-side ids.
 *
 * ## Byte movement is separate from storage
 *
 * An adapter does two things: mint a destination for an upload, and open a
 * readable stream for a download. It does not decide who may upload or
 * download — that is authorization, and it belongs to the caller. Keeping them
 * apart is what lets a byte route be added without a second copy of an
 * entitlement check.
 *
 * ## Downloads never come from the provider directly
 *
 * The local adapter streams from disk and the S3 adapter streams through the
 * API. A presigned download URL would be faster and is deliberately not used:
 * it delegates the access decision to the provider at the moment the URL is
 * minted, so a learner whose grant is revoked a second later can still fetch the
 * file until it expires. Serving through the API means entitlement is checked
 * when the bytes are asked for.
 */

export type StorageProvider = 'local' | 's3'

/** Where an upload should be sent, and how. */
export type UploadTarget = {
  /** Absolute URL to `PUT` the bytes to. */
  url: string
  method: 'PUT' | 'POST'
  headers: Record<string, string>
  /** When the target stops being accepted. */
  expiresAt: Date
}

/** A stored object, opened for reading. */
export type StoredObject = {
  body: ReadableStream<Uint8Array>
  contentType: string
  /** Total size when known, which a range response needs. */
  size: number | null
  /**
   * Whether the provider can serve a byte range.
   *
   * Video seeking depends on it, so it is reported rather than assumed. A
   * provider that cannot range is served whole, and the caller learns that from
   * this flag rather than from a seek that silently restarts.
   */
  acceptsRanges: boolean
}

export type PutOptions = {
  key: string
  contentType: string
  sizeBytes?: number
}

export type GetOptions = {
  key: string
  /**
   * A byte range, when the client asked for one.
   *
   * Passed through rather than interpreted here: parsing a `Range` header is a
   * contract with the HTTP layer, and a storage adapter that also parsed it
   * would be a second implementation of the same rules.
   */
  range?: { start: number; end?: number }
}

export interface StorageAdapter {
  readonly provider: StorageProvider
  /** Where the bytes would go. Only the local adapter writes to disk directly. */
  createUploadTarget(options: PutOptions): Promise<UploadTarget>
  /**
   * Accept bytes that arrived at this process.
   *
   * Only used by adapters whose `createUploadTarget` pointed back here — the
   * local one. An S3 upload goes straight to the bucket and never reaches the
   * API, which is the point of presigning.
   */
  put?(options: PutOptions, body: ReadableStream<Uint8Array>): Promise<void>
  get(options: GetOptions): Promise<StoredObject>
  delete(key: string): Promise<void>
  /** Whether the object exists. Used to confirm an upload landed. */
  exists(key: string): Promise<boolean>
}

/**
 * Errors a storage call can raise.
 *
 * Typed so the transport layer can map them: a missing object is a `404`, a
 * range the object cannot satisfy is a `416`, and a provider misconfiguration
 * is a `503`. The difference is worth keeping rather than collapsing into one
 * failure — a player that is told `404` stops, and one that is told `416`
 * retries without a range.
 */
export class StorageError extends Error {
  readonly code:
    'not_found' | 'not_configured' | 'provider_error' | 'range_not_satisfiable'

  constructor(
    code: StorageError['code'],
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'StorageError'
    this.code = code
  }
}
