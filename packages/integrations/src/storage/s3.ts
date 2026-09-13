import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import {
  type GetOptions,
  type PutOptions,
  type StorageAdapter,
  type StoredObject,
  type UploadTarget,
  StorageError,
} from './types.js'

/**
 * The S3-compatible adapter.
 *
 * Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2 and anything else that
 * speaks the API — which is why the endpoint is a configuration value rather
 * than a provider name. A self-hoster running MinIO and one on R2 use the same
 * adapter with different settings.
 *
 * ## Uploads go straight to the bucket
 *
 * The bytes never reach the API, which is the whole reason to presign: a
 * 500 MB video upload does not occupy an application process, and the API's
 * memory ceiling stops mattering.
 *
 * ## Downloads come back through the API
 *
 * Deliberately not presigned, even though it would be faster and simpler. A
 * presigned download URL delegates the access decision to the bucket at the
 * moment it is minted: a learner whose access grant is revoked one second later
 * can still fetch the file until the URL expires. Serving through the API means
 * entitlement is checked when the bytes are asked for, which is the property the
 * media design is built around.
 *
 * The cost is real — every byte crosses the API — and it is the correct
 * trade for a platform whose access rules can change between two requests.
 */

export type S3StorageOptions = {
  bucket: string
  region: string
  /** Custom endpoint for R2, MinIO and friends. Omitted for AWS itself. */
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
  /**
   * Forces path-style addressing.
   *
   * MinIO needs it; R2 and AWS are happier without. Misconfigured, the symptom
   * is a bucket-not-found error that names the wrong bucket, which is worth a
   * comment because it costs an afternoon otherwise.
   */
  forcePathStyle?: boolean
  uploadTtlSeconds?: number
}

export function createS3Storage(options: S3StorageOptions): StorageAdapter {
  const uploadTtlSeconds = options.uploadTtlSeconds ?? 900

  const client = new S3Client({
    region: options.region,
    ...(options.endpoint ? { endpoint: options.endpoint } : {}),
    ...(options.forcePathStyle ? { forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  })

  /** Turn an SDK error into something the transport layer can map. */
  function asStorageError(error: unknown, fallback: string): StorageError {
    const name = (error as { name?: string } | null)?.name

    if (
      name === 'NoSuchKey' ||
      name === 'NotFound' ||
      name === 'NoSuchBucket'
    ) {
      // A missing bucket is a configuration problem, not a missing object. The
      // distinction matters: one is a 404 and the other should page somebody.
      if (name === 'NoSuchBucket') {
        return new StorageError(
          'not_configured',
          `The configured bucket "${options.bucket}" does not exist.`,
          { cause: error },
        )
      }

      return new StorageError('not_found', 'That object is not stored here.', {
        cause: error,
      })
    }

    if (name === 'CredentialsProviderError' || name === 'InvalidAccessKeyId') {
      return new StorageError(
        'not_configured',
        'The configured storage credentials were refused.',
        { cause: error },
      )
    }

    /**
     * A range the object cannot satisfy.
     *
     * S3 answers `416` itself and the SDK surfaces it as `InvalidRange`. Without
     * this branch it falls through to `provider_error`, and the API would report
     * a `502` for an ordinary seek past the end of a file.
     */
    if (name === 'InvalidRange') {
      return new StorageError(
        'range_not_satisfiable',
        'That byte range is past the end of the object.',
        { cause: error },
      )
    }

    return new StorageError('provider_error', fallback, { cause: error })
  }

  return {
    provider: 's3',

    async createUploadTarget(putOptions: PutOptions): Promise<UploadTarget> {
      const command = new PutObjectCommand({
        Bucket: options.bucket,
        Key: putOptions.key,
        ContentType: putOptions.contentType,
        ...(putOptions.sizeBytes !== undefined
          ? { ContentLength: putOptions.sizeBytes }
          : {}),
      })

      try {
        const url = await getSignedUrl(client, command, {
          expiresIn: uploadTtlSeconds,
        })

        return {
          url,
          method: 'PUT',
          /**
           * The content type is signed into the URL.
           *
           * A client that sends a different one gets a signature mismatch rather
           * than storing an object whose type disagrees with what the API
           * recorded — which would show up later as a file the browser refuses
           * to play.
           */
          headers: { 'content-type': putOptions.contentType },
          expiresAt: new Date(Date.now() + uploadTtlSeconds * 1000),
        }
      } catch (error) {
        throw asStorageError(error, 'An upload could not be prepared.')
      }
    },

    async get(getOptions: GetOptions): Promise<StoredObject> {
      const response = await client
        .send(
          new GetObjectCommand({
            Bucket: options.bucket,
            Key: getOptions.key,
            ...(getOptions.range
              ? {
                  Range: `bytes=${getOptions.range.start}-${
                    getOptions.range.end ?? ''
                  }`,
                }
              : {}),
          }),
        )
        .catch((error: unknown) => {
          throw asStorageError(error, 'That object could not be read.')
        })

      if (!response.Body) {
        throw new StorageError('not_found', 'That object has no contents.')
      }

      return {
        body: response.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: response.ContentType ?? 'application/octet-stream',
        size: response.ContentLength ?? null,
        /**
         * S3 ranges when asked, and says so.
         *
         * A 206 confirms it rather than an assumption about the provider: some
         * S3-compatible implementations ignore a `Range` header, and reporting
         * `true` for those would make a video seek silently restart.
         */
        acceptsRanges:
          response.$metadata.httpStatusCode === 206 ||
          getOptions.range === undefined,
      }
    },

    async delete(key: string): Promise<void> {
      await client
        .send(new DeleteObjectCommand({ Bucket: options.bucket, Key: key }))
        .catch((error: unknown) => {
          throw asStorageError(error, 'That object could not be deleted.')
        })
    },

    async exists(key: string): Promise<boolean> {
      try {
        await client.send(
          new HeadObjectCommand({ Bucket: options.bucket, Key: key }),
        )

        return true
      } catch (error) {
        // A head on a missing key is `NotFound`, which is an answer rather than
        // a failure — anything else is worth raising.
        if (error instanceof StorageError) throw error

        const name = (error as { name?: string } | null)?.name

        if (name === 'NotFound' || name === 'NoSuchKey' || name === '403') {
          return false
        }

        throw asStorageError(error, 'That object could not be checked.')
      }
    },
  }
}
