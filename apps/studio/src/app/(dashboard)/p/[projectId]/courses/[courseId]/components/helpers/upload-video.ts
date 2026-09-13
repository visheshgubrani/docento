import {
  createVideoUploadSession,
  linkVideoToLesson,
  type VideoPlaybackPolicy,
} from '@/lib/api'

interface UploadConfig {
  projectId: string
  courseId: string
  moduleId: string
  lessonId: string
  playbackPolicy?: VideoPlaybackPolicy
  generateSubtitle?: boolean
  generateChapters?: boolean
}

export async function uploadVideoFile(
  file: File,
  config: UploadConfig,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const { projectId, courseId, moduleId, lessonId } = config
  const playbackPolicy = config.playbackPolicy ?? 'signed'
  const generateSubtitle = config.generateSubtitle ?? false
  const generateChapters = config.generateChapters ?? false

  // Step 1: Get upload token from backend
  console.log('[SDK_DEBUG] Step 1: Getting upload token from backend...')
  const uploadSession = await createVideoUploadSession(
    projectId,
    courseId,
    moduleId,
    lessonId,
    file.name,
    playbackPolicy,
    generateSubtitle,
    generateChapters,
  )

  console.log('[SDK_DEBUG] Got session:', {
    apiUrl: uploadSession.apiUrl,
    uploadToken: uploadSession.uploadToken?.substring(0, 30) + '...',
    expiresAt: uploadSession.expiresAt,
  })

  // Step 2: Load and debug the SDK
  console.log('[SDK_DEBUG] Step 2: Loading @clipmux/uploader SDK...')
  const clipmuxModule = await import('@clipmux/uploader')
  console.log('[SDK_DEBUG] SDK module exported:', Object.keys(clipmuxModule))

  const { ClipmuxUploader } = clipmuxModule
  console.log('[SDK_DEBUG] ClipmuxUploader:', typeof ClipmuxUploader)

  // Check the constructor
  console.log(
    '[SDK_DEBUG] ClipmuxUploader.prototype:',
    Object.getOwnPropertyNames(ClipmuxUploader.prototype),
  )

  // Create uploader instance with debug
  const uploaderConfig = {
    baseUrl: uploadSession.apiUrl || 'http://localhost:4080',
    uploadToken: uploadSession.uploadToken,
  }
  console.log('[SDK_DEBUG] Creating uploader with config:', {
    baseUrl: uploaderConfig.baseUrl,
    uploadToken: uploaderConfig.uploadToken?.substring(0, 30) + '...',
  })

  const uploader = new ClipmuxUploader(uploaderConfig)
  console.log('[SDK_DEBUG] Uploader instance created:', uploader)
  console.log('[SDK_DEBUG] Uploader instance keys:', Object.keys(uploader))

  // Check what properties the uploader has
  console.log('[SDK_DEBUG] Uploader properties:')
  const uploaderRecord = uploader as unknown as Record<string, unknown>
  for (const key of Object.keys(uploaderRecord)) {
    const value = uploaderRecord[key]
    console.log(
      `  ${key}:`,
      typeof value,
      typeof value === 'string' ? value.substring(0, 30) + '...' : '',
    )
  }

  // Step 3: Monkey-patch fetch to see what headers are being sent
  console.log('[SDK_DEBUG] Step 3: Patching fetch to monitor SDK requests...')
  const originalFetch = window.fetch
  const requestLog: Array<{
    url: string
    method?: string
    headers?: HeadersInit
    timestamp: number
  }> = []

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    console.log('[SDK_DEBUG] Fetch intercepted:', {
      url: url.substring(0, 100),
      method: init?.method,
      headers: init?.headers,
    })

    requestLog.push({
      url,
      method: init?.method,
      headers: init?.headers,
      timestamp: Date.now(),
    })

    return originalFetch(input, init)
  }

  try {
    console.log('[SDK_DEBUG] Step 4: Starting upload via SDK...')
    console.log(
      '[SDK_DEBUG] Calling uploader.upload() with file:',
      file.name,
      file.size,
    )

    const result = await uploader.upload(file, {
      title: file.name,
      playbackPolicy: uploadSession.playbackPolicy,
      generateSubtitle: uploadSession.generateSubtitle,
      generateChapters: uploadSession.generateChapters,
      onProgress: (progress) => {
        console.log('[SDK_DEBUG] Progress callback:', progress)
        if (onProgress) {
          onProgress(progress.percentage || 0)
        }
      },
    })

    console.log('[SDK_DEBUG] Upload result:', result)
    console.log('[SDK_DEBUG] Request log:', requestLog)

    // Step 5: Link the video to the lesson
    console.log('[SDK_DEBUG] Step 5: Linking video to lesson...')
    await linkVideoToLesson(projectId, courseId, moduleId, lessonId, {
      videoId: result.fileId,
      title: file.name,
    })

    return result.fileId
  } finally {
    // Restore original fetch
    window.fetch = originalFetch
    console.log('[SDK_DEBUG] Fetch restored')
  }
}
