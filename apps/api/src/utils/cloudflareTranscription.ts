/**
 * Cloudflare Streams Caption/Transcription Utilities
 *
 * Uses Cloudflare's AI-powered caption generation for video transcription.
 * Docs: https://developers.cloudflare.com/stream/edit-videos/adding-captions/
 */

// Supported languages for caption generation
export const SUPPORTED_LANGUAGES = [
  'cs',
  'nl',
  'en',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'pl',
  'pt',
  'ru',
  'es',
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

interface CloudflareResponse<T> {
  result: T
  success: boolean
  errors: Array<{ message: string }>
  messages: string[]
}

interface CaptionResult {
  language: string
  label: string
  generated: boolean
  status: 'inprogress' | 'ready' | 'error'
}

const getCloudflareCredentials = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error(
      'Cloudflare credentials not configured (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN)',
    )
  }

  return { accountId, apiToken }
}

/**
 * Trigger AI-powered caption generation for a video
 */
export const generateCaptions = async (
  videoId: string,
  language: SupportedLanguage = 'en',
): Promise<CaptionResult> => {
  const { accountId, apiToken } = getCloudflareCredentials()

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/captions/${language}/generate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  )

  const data: CloudflareResponse<CaptionResult> = await response.json()

  if (!data.success) {
    const errorMsg = data.errors?.[0]?.message || 'Failed to generate captions'
    throw new Error(errorMsg)
  }

  return data.result
}

/**
 * Get the status of captions for a video
 */
export const getCaptionStatus = async (
  videoId: string,
  language: string = 'en',
): Promise<CaptionResult | null> => {
  const { accountId, apiToken } = getCloudflareCredentials()

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/captions`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  )

  const data: CloudflareResponse<CaptionResult[]> = await response.json()

  if (!data.success) {
    return null
  }

  // Find the caption for the requested language
  return data.result.find((c) => c.language === language) || null
}

/**
 * Fetch the VTT transcription file content
 */
export const fetchTranscription = async (
  videoId: string,
  language: string = 'en',
): Promise<string> => {
  const { accountId, apiToken } = getCloudflareCredentials()

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/captions/${language}/vtt`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch transcription: ${response.status}`)
  }

  return response.text()
}

/**
 * Delete captions for a video
 */
export const deleteCaptions = async (
  videoId: string,
  language: string = 'en',
): Promise<boolean> => {
  const { accountId, apiToken } = getCloudflareCredentials()

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/captions/${language}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  )

  const data: CloudflareResponse<string> = await response.json()
  return data.success
}

/**
 * Parse VTT content to plain text (removes timestamps and formatting)
 */
export const vttToPlainText = (vttContent: string): string => {
  const lines = vttContent.split('\n')
  const textLines: string[] = []
  let isCaption = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip WebVTT header
    if (trimmed === 'WEBVTT' || trimmed === '') {
      isCaption = false
      continue
    }

    // Skip cue identifiers (numbers)
    if (/^\d+$/.test(trimmed)) {
      continue
    }

    // Skip timestamp lines
    if (trimmed.includes('-->')) {
      isCaption = true
      continue
    }

    // Capture caption text
    if (isCaption && trimmed) {
      textLines.push(trimmed)
    }
  }

  return textLines.join(' ')
}
