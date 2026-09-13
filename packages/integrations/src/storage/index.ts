import { createLocalStorage } from './local.js'
import { createS3Storage } from './s3.js'
import {
  StorageError,
  type StorageAdapter,
  type StorageProvider,
} from './types.js'

export {
  StorageError,
  type GetOptions,
  type PutOptions,
  type StorageAdapter,
  type StorageProvider,
  type StoredObject,
  type UploadTarget,
} from './types.js'
export { createLocalStorage, localPathFor } from './local.js'
export type { LocalStorageOptions } from './local.js'
export { createS3Storage } from './s3.js'
export type { S3StorageOptions } from './s3.js'

/**
 * The storage configuration the environment describes.
 *
 * Deliberately narrow: only the fields the adapters need, so this module does
 * not depend on the config package's whole schema and a caller can build a
 * storage adapter in a test without a complete environment.
 */
export type StorageConfig = {
  driver: StorageProvider
  localDirectory: string
  apiUrl: string
  s3?: {
    bucket: string
    region: string
    endpoint?: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle?: boolean
  }
}

/**
 * Build the adapter the configuration asks for.
 *
 * ## Fails at construction, not at first use
 *
 * A misconfigured S3 bucket should stop a deployment from starting, not from
 * accepting uploads and failing them. The exception is `s3` selected with no
 * credentials at all, which is a configuration report the config package has
 * already produced — so this raises rather than defaulting, and the operator
 * sees the real problem rather than a silent switch to local disk that would
 * scatter files across a container's ephemeral filesystem.
 */
export function createStorage(config: StorageConfig): StorageAdapter {
  if (config.driver === 'local') {
    return createLocalStorage({
      directory: config.localDirectory,
      apiUrl: config.apiUrl,
    })
  }

  if (!config.s3) {
    throw new StorageError(
      'not_configured',
      'S3 storage is selected but no bucket or credentials are configured.',
    )
  }

  return createS3Storage(config.s3)
}

/**
 * A key for a new object.
 *
 * ## Why the shape is what it is
 *
 * `workspaceId/assetId/filename`. The workspace prefix means an operator can
 * find a tenant's media on disk without a database query, and the asset id
 * means two uploads of `lecture.mp4` cannot collide. The filename is kept last
 * and sanitised rather than replaced, because it is what a person sees when they
 * open a bucket browser and `a8f3c2...` tells them nothing.
 *
 * The sanitising is not cosmetic. A filename with a `/` would change the key's
 * depth, and one with `..` would escape the workspace prefix — both are handled
 * here, once, rather than by every caller.
 */
export function buildStorageKey(input: {
  workspaceId: string
  assetId: string
  filename: string
}): string {
  const safeName = sanitiseFilename(input.filename)

  return `${input.workspaceId}/${input.assetId}/${safeName}`
}

/**
 * Reduce a client-supplied filename to something safe to put in a path.
 *
 * Strips directory components rather than escaping them: a name is display
 * information, not a path, and preserving a separator would let a caller choose
 * where their upload lands.
 */
export function sanitiseFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? ''

  const cleaned = base
    /**
     * Control characters, plus what a URL, a shell, or a Windows path treats
     * specially. The control range is intentional — a NUL byte truncates a
     * filename in most APIs and a newline makes a log line lie — and the rule
     * that flags it is disabled for this line rather than for the file.
     */
    // eslint-disable-next-line no-control-regex -- the range is deliberate
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '')
    .replace(/^\.+/, '')
    .trim()

  if (cleaned.length === 0) return 'file'

  // Long names are truncated rather than refused: a client sending a 400
  // character name is probably a bug, and failing the upload over it would be a
  // worse answer than storing it under a shorter name.
  return cleaned.length > 120 ? cleaned.slice(-120) : cleaned
}
