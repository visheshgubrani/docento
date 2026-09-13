import crypto from 'crypto'
import jwt from 'jsonwebtoken'

interface StreamTokenOptions {
  videoId: string
  expiresIn?: number // Seconds
}

export const verifyCloudflareSignature = (
  signatureHeader: string,
  rawBody: string | any, // Can be string or object
  secret: string,
): boolean => {
  try {
    // 1. Parse the header: "time=123,sig1=abc..."
    const parts = signatureHeader.split(',')
    const timestamp = parts.find((p) => p.startsWith('time='))?.split('=')[1]
    const signature = parts.find((p) => p.startsWith('sig1='))?.split('=')[1]

    if (!timestamp || !signature) return false

    // 2. Reconstruct the payload string
    // ideally rawBody is the raw string. If it's an object, we try to stringify.
    const payloadString =
      typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)

    // 3. Construct the source string: "{time}.{body}"
    const sourceString = `${timestamp}.${payloadString}`

    // 4. Create expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(sourceString)
      .digest('hex')

    // 5. Constant-time comparison
    const a = Buffer.from(signature, 'hex')
    const b = Buffer.from(expectedSignature, 'hex')

    // Length check prevents timing attacks on length
    if (a.length !== b.length) return false

    return crypto.timingSafeEqual(a, b)
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

export const generateStreamToken = ({
  videoId,
  expiresIn = 3600 * 6, // 6 hours
}: StreamTokenOptions) => {
  const keyId = process.env.CLOUDFLARE_STREAM_KEY_ID

  // 1. Try to read the Base64 key first (The "Clean" Way)
  const b64Key = process.env.CLOUDFLARE_STREAM_PRIVATE_KEY_BASE64

  // 2. Fallback to the old raw key (The "Old" Way)
  const rawKey = process.env.CLOUDFLARE_STREAM_PRIVATE_KEY

  let privateKey = ''

  if (b64Key) {
    // ✅ Decode the Base64 string back to the correct PEM format
    privateKey = Buffer.from(b64Key, 'base64').toString('utf-8')
  } else if (rawKey) {
    // ⚠️ Fallback: Try to fix newlines manually (Error prone)
    privateKey = rawKey.replace(/\\n/g, '\n').replace(/"/g, '')
  } else {
    throw new Error(
      'Missing Cloudflare Stream Keys in .env (Check CLOUDFLARE_STREAM_PRIVATE_KEY_BASE64)',
    )
  }

  if (!keyId) {
    throw new Error('Missing CLOUDFLARE_STREAM_KEY_ID in .env')
  }

  // Payload structure as per Cloudflare Docs
  const payload = {
    sub: videoId,
    kid: keyId,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    accessRules: [
      {
        type: 'any',
        action: 'allow',
      },
    ],
  }

  // Sign using RS256
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    keyid: keyId,
  })
}

export const getSignedThumbnailUrl = (
  thumbnailUrl: string | null,
  videoId: string | null,
): string | null => {
  // 1. Basic Validation
  if (!thumbnailUrl || !videoId) return thumbnailUrl

  // 2. Optimization: If it's not hosted on Cloudflare (e.g. S3/R2), don't sign it.
  if (!thumbnailUrl.includes('cloudflarestream.com')) return thumbnailUrl

  try {
    // 3. Reuse your existing robust token generator
    // We use a shorter expiry (1 hour) for page loads compared to video playback
    const token = generateStreamToken({
      videoId,
      expiresIn: 3600,
    })

    // 4. Return the URL with the token attached
    return `${thumbnailUrl}?token=${token}`
  } catch (error) {
    console.error(`Failed to sign thumbnail for video ${videoId}:`, error)
    // Fallback: return the original URL so the UI doesn't crash (image just won't load)
    return thumbnailUrl
  }
}
