/**
 * Unified Video Transcription Service
 *
 * Handles transcription for both Cloudflare Stream and Clipmux videos.
 * During migration, the system may have videos from both platforms.
 */

import {
  generateCaptions as generateCloudflareCaptions,
  getCaptionStatus as getCloudflareCaptionStatus,
  fetchTranscription as fetchCloudflareTranscription,
  deleteCaptions as deleteCloudflareCaptions,
  vttToPlainText,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from './cloudflareTranscription'

import {
  generateTranscription as generateClipmuxTranscription,
  getTranscriptionStatus as getClipmuxTranscriptionStatus,
  fetchTranscription as fetchClipmuxTranscription,
  deleteTranscription as deleteClipmuxTranscription,
  SUPPORTED_LANGUAGES as CLIPMUX_SUPPORTED_LANGUAGES,
  SupportedLanguage as ClipmuxSupportedLanguage,
} from './clipmuxTranscription'

// Re-export common utilities
export { vttToPlainText, SUPPORTED_LANGUAGES }
export type { SupportedLanguage }

/**
 * Determine if a video is from Cloudflare or Clipmux based on videoId/URL patterns
 */
const detectVideoPlatform = (
  videoId: string,
): 'cloudflare' | 'clipmux' | 'unknown' => {
  // Cloudflare video IDs are typically UUIDs or long strings with dashes
  // but we can also check the stored videoUrl if needed

  // For now, use a simple heuristic:
  // - If videoId contains 'cloudflarestream.com' or looks like a CF UID -> Cloudflare
  // - Otherwise -> Clipmux

  if (videoId.includes('cloudflarestream.com')) {
    return 'cloudflare'
  }

  // Cloudflare video IDs are typically 32 chars with dashes (UUID-like)
  // Clipmux IDs may have different formats
  // This is a rough heuristic - adjust based on your actual ID formats
  const cfPattern =
    /^[a-f0-9]{32}$|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

  if (cfPattern.test(videoId)) {
    return 'cloudflare'
  }

  return 'clipmux'
}

interface TranscriptionResult {
  language: string
  label?: string
  status: 'inprogress' | 'ready' | 'error'
  generated?: boolean
}

/**
 * Generate captions/transcription for a video (auto-detects platform)
 */
export const generateCaptions = async (
  videoId: string,
  language: SupportedLanguage = 'en',
): Promise<TranscriptionResult> => {
  const platform = detectVideoPlatform(videoId)

  if (platform === 'cloudflare') {
    return generateCloudflareCaptions(videoId, language)
  }

  // For Clipmux, use the Clipmux transcription service
  return generateClipmuxTranscription(
    videoId,
    language as ClipmuxSupportedLanguage,
  )
}

/**
 * Get caption/transcription status (auto-detects platform)
 */
export const getCaptionStatus = async (
  videoId: string,
  language: string = 'en',
): Promise<TranscriptionResult | null> => {
  const platform = detectVideoPlatform(videoId)

  if (platform === 'cloudflare') {
    return getCloudflareCaptionStatus(videoId, language)
  }

  const result = await getClipmuxTranscriptionStatus(videoId, language)
  return result
    ? {
        language: result.language,
        status: result.status,
        generated: result.status === 'ready',
      }
    : null
}

/**
 * Fetch transcription VTT content (auto-detects platform)
 */
export const fetchTranscription = async (
  videoId: string,
  language: string = 'en',
): Promise<string> => {
  const platform = detectVideoPlatform(videoId)

  if (platform === 'cloudflare') {
    return fetchCloudflareTranscription(videoId, language)
  }

  return fetchClipmuxTranscription(videoId, language)
}

/**
 * Delete captions/transcription (auto-detects platform)
 */
export const deleteCaptions = async (
  videoId: string,
  language: string = 'en',
): Promise<boolean> => {
  const platform = detectVideoPlatform(videoId)

  if (platform === 'cloudflare') {
    return deleteCloudflareCaptions(videoId, language)
  }

  return deleteClipmuxTranscription(videoId, language)
}
