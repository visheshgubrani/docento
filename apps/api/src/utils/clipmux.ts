import crypto from 'crypto'
import jwt from 'jsonwebtoken'

interface ClipmuxConfig {
  apiKey: string
  apiUrl: string
}

const getConfig = (): ClipmuxConfig => {
  const apiKey = process.env.CLIPMUX_API_KEY
  const apiUrl = process.env.CLIPMUX_API_URL

  if (!apiKey || !apiUrl) {
    throw new Error('Missing CLIPMUX_API_KEY or CLIPMUX_API_URL in environment')
  }

  return { apiKey, apiUrl }
}

interface UploadTokenOptions {
  expiresIn?: string
  maxFiles?: number
  generateSubtitle?: boolean
  generateChapters?: boolean
}

interface UploadTokenResponse {
  uploadToken: string
  expiresAt: string
}

export const generateUploadToken = async (
  options: UploadTokenOptions = {},
): Promise<UploadTokenResponse> => {
  const { apiKey, apiUrl } = getConfig()
  const {
    expiresIn = '1h',
    maxFiles = 1,
    generateSubtitle = false,
    generateChapters = false,
  } = options

  const response = await fetch(`${apiUrl}/v1/upload/token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expires_in: expiresIn,
      max_files: maxFiles,
      generate_subtitle: generateSubtitle,
      generate_chapters: generateChapters,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[CLIPMUX] Token generation failed:', error)
    throw new Error(`Failed to generate upload token: ${error}`)
  }

  const data = await response.json()
  return {
    uploadToken: data.upload_token,
    expiresAt: data.expires_at,
  }
}

interface VideoDetails {
  id: string
  title: string
  status: 'processing' | 'ready' | 'failed' | 'error'
  playbackPolicy: string
  duration?: number
  thumbnailUrl?: string
}

export const getVideoDetails = async (
  videoId: string,
): Promise<VideoDetails> => {
  const { apiKey, apiUrl } = getConfig()

  const response = await fetch(`${apiUrl}/v1/video/${videoId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get video details: ${error}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    playbackPolicy: data.playback_policy,
    duration: data.duration,
    thumbnailUrl: data.thumbnail_url,
  }
}

interface PlaybackTokenResponse {
  playbackUrl: string
  token: string
  expiresAt: number
  subtitle_url?: string | null
  chapters?: any[] | null
}

export const getPlaybackUrl = async (
  videoId: string,
  ip: string,
  userAgent: string,
): Promise<PlaybackTokenResponse> => {
  const { apiKey, apiUrl } = getConfig()

  const response = await fetch(`${apiUrl}/v1/video/${videoId}/playback-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      viewer_ip: ip,
      viewer_user_agent: userAgent,
      expires_in: '2h', // Optional
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get playback URL: ${error}`)
  }

  const data = await response.json()
  return {
    playbackUrl: data.playback_url,
    token: data.token,
    expiresAt: data.expires_at,
    subtitle_url: data.subtitle_url,
    chapters: data.chapters,
  }
}

export const deleteVideo = async (videoId: string): Promise<void> => {
  const { apiKey, apiUrl } = getConfig()

  const response = await fetch(`${apiUrl}/v1/video/${videoId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`Failed to delete video: ${error}`)
  }
}

interface WebhookPayload {
  event: string
  videoId: string
  status: 'processing' | 'ready' | 'failed' | 'error'
  duration?: number
  thumbnailUrl?: string
  timestamp: number
}

export const verifyClipmuxSignature = (
  signatureHeader: string,
  rawBody: string,
  secret: string,
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    )
  } catch (error) {
    console.error('Clipmux signature verification failed:', error)
    return false
  }
}

export const getThumbnailUrl = (videoId: string, token?: string): string => {
  const baseUrl = process.env.CLIPMUX_CDN_URL || ''
  const url = baseUrl
    ? `${baseUrl}/videos/${videoId}/poster.jpg`
    : `/videos/${videoId}/poster.jpg`
  return token ? `${url}?token=${token}` : url
}

export const getHlsUrl = (videoId: string, token?: string): string => {
  const baseUrl = process.env.CLIPMUX_CDN_URL || ''
  const url = baseUrl
    ? `${baseUrl}/videos/${videoId}/playlist.m3u8`
    : `/videos/${videoId}/playlist.m3u8`
  return token ? `${url}?token=${token}` : url
}

/**
 * Get signed thumbnail URL that works with both Cloudflare and Clipmux URLs.
 * During migration, some thumbnails may still be Cloudflare URLs.
 */
export const getSignedThumbnailUrl = (
  thumbnailUrl: string | null,
  videoId: string | null,
): string | null => {
  // 1. Basic Validation
  if (!thumbnailUrl) return null

  // 2. If it's not hosted on Cloudflare or Clipmux, return as-is (e.g., S3/R2)
  if (
    !thumbnailUrl.includes('cloudflarestream.com') &&
    !thumbnailUrl.includes('clipmux.com')
  ) {
    return thumbnailUrl
  }

  // 3. If it's already signed (has token), return as-is
  if (thumbnailUrl.includes('?token=')) {
    return thumbnailUrl
  }

  // 4. For Cloudflare URLs, we'd need the old signing logic
  // For now, return the URL as-is since migration will happen gradually
  // TODO: After full migration, remove Cloudflare handling
  return thumbnailUrl
}
