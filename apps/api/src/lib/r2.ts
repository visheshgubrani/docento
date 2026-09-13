import { S3Client } from '@aws-sdk/client-s3'

const normalizeBaseUrl = (value: string) =>
  value.endsWith('/') ? value.slice(0, -1) : value

export const getR2Client = () => {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const endpoint = process.env.R2_ENDPOINT

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export const getR2PublicBaseUrl = () => {
  const publicBase = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL

  if (!publicBase) return null
  return normalizeBaseUrl(publicBase.trim())
}
