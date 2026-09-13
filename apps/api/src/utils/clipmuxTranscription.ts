/**
 * Clipmux Video Transcription Utilities
 * 
 * This module provides transcription/caption functionality for Clipmux videos.
 * Note: Clipmux transcription API details may vary - update endpoints as needed.
 * 
 * During migration from Cloudflare, you may need to:
 * 1. Keep existing Cloudflare transcriptions working for old videos
 * 2. Use Clipmux transcription for new videos
 * 3. Or use a third-party service like OpenAI Whisper
 */

// Supported languages for caption generation
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'ko', 'zh', 'ru', 'ar'
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

interface ClipmuxResponse<T> {
  data: T
  success: boolean
  error?: string
}

interface TranscriptionResult {
  language: string
  status: 'inprogress' | 'ready' | 'error'
  text?: string
  vttUrl?: string
}

const getClipmuxCredentials = () => {
  const apiKey = process.env.CLIPMUX_API_KEY
  const apiUrl = process.env.CLIPMUX_API_URL

  if (!apiKey || !apiUrl) {
    throw new Error('Clipmux credentials not configured (CLIPMUX_API_KEY, CLIPMUX_API_URL)')
  }

  return { apiKey, apiUrl }
}

/**
 * Trigger transcription generation for a video
 * 
 * TODO: Update endpoint based on actual Clipmux transcription API
 */
export const generateTranscription = async (
  videoId: string,
  language: SupportedLanguage = 'en'
): Promise<TranscriptionResult> => {
  const { apiKey, apiUrl } = getClipmuxCredentials()

  // NOTE: Update this endpoint based on Clipmux's actual transcription API
  const response = await fetch(
    `${apiUrl}/v1/video/${videoId}/transcription`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language }),
    }
  )

  if (!response.ok) {
    // If Clipmux doesn't support transcription yet, you can:
    // 1. Throw an error to indicate it's not available
    // 2. Fallback to a third-party service (OpenAI Whisper, etc.)
    throw new Error(
      `Transcription not available: ${response.statusText}. ` +
      `Consider using OpenAI Whisper API as a fallback.`
    )
  }

  const data: ClipmuxResponse<TranscriptionResult> = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to generate transcription')
  }

  return data.data
}

/**
 * Get the status of transcription for a video
 * 
 * TODO: Update endpoint based on actual Clipmux transcription API
 */
export const getTranscriptionStatus = async (
  videoId: string,
  language: string = 'en'
): Promise<TranscriptionResult | null> => {
  const { apiKey, apiUrl } = getClipmuxCredentials()

  const response = await fetch(
    `${apiUrl}/v1/video/${videoId}/transcription?language=${language}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  )

  if (!response.ok) {
    return null
  }

  const data: ClipmuxResponse<TranscriptionResult> = await response.json()
  return data.success ? data.data : null
}

/**
 * Fetch the VTT transcription file content
 * 
 * TODO: Update endpoint based on actual Clipmux transcription API
 */
export const fetchTranscription = async (
  videoId: string,
  language: string = 'en'
): Promise<string> => {
  const { apiKey, apiUrl } = getClipmuxCredentials()

  const response = await fetch(
    `${apiUrl}/v1/video/${videoId}/transcription/vtt?language=${language}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch transcription: ${response.status}`)
  }

  return response.text()
}

/**
 * Delete transcription for a video
 * 
 * TODO: Update endpoint based on actual Clipmux transcription API
 */
export const deleteTranscription = async (
  videoId: string,
  language: string = 'en'
): Promise<boolean> => {
  const { apiKey, apiUrl } = getClipmuxCredentials()

  const response = await fetch(
    `${apiUrl}/v1/video/${videoId}/transcription?language=${language}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  )

  return response.ok
}

/**
 * Parse VTT content to plain text (removes timestamps and formatting)
 * 
 * This utility is compatible with both Cloudflare and Clipmux VTT formats
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