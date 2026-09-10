import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import ApiError from '../utils/ApiError'
import { prisma } from '../lib/prisma'
import ApiResponse from '../utils/ApiResponse'
import { Course, Lesson, Module } from '@prisma/client'
import {
  generateUploadToken,
  getVideoDetails,
  getPlaybackUrl,
  deleteVideo,
  getThumbnailUrl,
} from '../utils/clipmux'

type FullLessonContext = Lesson & {
  module: Module & {
    course: Course
  }
}

const createVideoUploadSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  playbackPolicy: z.enum(['public', 'signed']).default('signed'),
  generateSubtitle: z.boolean().default(false),
  generateChapters: z.boolean().default(false),
})

/**
 * Creates an upload token for Clipmux frontend SDK.
 *
 * Route: POST /api/v1/lessons/:lessonId/create-upload-session
 * Protected by: authorizeProjectAccess, resolveLessonContext
 */
const createVideoUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson as FullLessonContext

    const parsedBody = createVideoUploadSchema.safeParse(req.body ?? {})
    if (!parsedBody.success) {
      return next(new ApiError(400, 'Invalid upload payload.'))
    }
    const { playbackPolicy, generateSubtitle } = parsedBody.data
    // Chapters require subtitles — enforce the dependency server-side
    const generateChapters = parsedBody.data.generateChapters && generateSubtitle

    // 1. Validation
    if (lesson.contentType !== 'VIDEO')
      return next(new ApiError(400, 'Not a video lesson.'))

    // 2. Generate upload token from Clipmux
    const { uploadToken, expiresAt } = await generateUploadToken({
      expiresIn: '1h',
      maxFiles: 1,
      generateSubtitle,
      generateChapters,
    })

    // 3. Update Database to mark as awaiting upload
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        videoStatus: 'PROCESSING',
      },
    })

    // 4. Return upload token and Clipmux API URL
    return res.status(200).json(
      new ApiResponse(200, 'Upload token generated', {
        uploadToken,
        expiresAt,
        apiUrl: process.env.CLIPMUX_API_URL,
        playbackPolicy,
        generateSubtitle,
        generateChapters,
      }),
    )
  } catch (error) {
    console.error('[CLIPMUX_UPLOAD_ERROR]', error)
    console.error(
      '[CLIPMUX_UPLOAD_ERROR] Stack:',
      error instanceof Error ? error.stack : 'No stack',
    )
    return next(new ApiError(500, 'Failed to initialize upload with Clipmux.'))
  }
}

/**
 * Called by frontend after successful upload to link video to lesson.
 * The frontend passes the videoId returned by Clipmux after upload.
 */
const linkVideoToLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const project = req.project!
  const { lessonId } = req.params
  const { videoId, title } = req.body

  if (!videoId) {
    return next(
      new ApiError(400, 'A `videoId` is required in the request body.'),
    )
  }

  // Auth
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: {
        course: {
          projectId: project.id,
        },
      },
    },
  })

  if (!lesson) {
    return next(new ApiError(404, 'Lesson not found in this project.'))
  }

  try {
    // Fetch video details from Clipmux
    const videoDetails = await getVideoDetails(videoId)

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        videoUrl: videoId, // Store the Clipmux video ID
        videoId: videoId,
        contentType: 'VIDEO',
        duration: videoDetails.duration ? Math.round(videoDetails.duration) : 0,
        thumbnail: videoDetails.thumbnailUrl || getThumbnailUrl(videoId),
        videoStatus: videoDetails.status === 'ready' ? 'READY' : 'PROCESSING',
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Video successfully linked to lesson.', {
        lesson: updatedLesson,
      }),
    )
  } catch (error) {
    console.error('[CLIPMUX_LINK_ERROR]', error)
    return next(new ApiError(500, 'Failed to link video to lesson.'))
  }
}

/**
 * Delete video from Clipmux and unlink from lesson.
 */
const deleteVideoFromLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const project = req.project!
  const { lessonId } = req.params

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { course: { projectId: project.id } },
    },
    select: { videoUrl: true, videoId: true },
  })

  if (!lesson || !lesson.videoId) {
    return next(new ApiError(404, 'No video found for this lesson.'))
  }

  const videoId = lesson.videoId

  try {
    // Delete video from Clipmux
    await deleteVideo(videoId)
  } catch (error) {
    console.error('[CLIPMUX_DELETE_ERROR]', error)
    // Continue even if deletion fails - we'll still clear the DB
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      videoUrl: null,
      videoId: null,
      duration: 0,
      thumbnail: null,
      videoStatus: 'PROCESSING',
    },
  })

  return res.status(204).send()
}

const getVideoId = (lesson: any) => {
  if (lesson.videoId) return lesson.videoId
  // Fallback for old data: extract from URL
  if (lesson.videoUrl) return lesson.videoUrl
  return null
}

const firstHeaderValue = (value: string | string[] | undefined): string | null => {
  if (!value) return null
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null

  const [first = ''] = raw.split(',')
  const normalized = first.trim()
  return normalized || null
}

const normalizeViewerIp = (value: string): string => {
  let normalized = value.trim()
  if (!normalized) return ''

  const ipv4WithPort = normalized.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)
  if (ipv4WithPort?.[1]) {
    normalized = ipv4WithPort[1]
  }

  const bracketedIpv6 = normalized.match(/^\[([a-f0-9:.%]+)\](?::\d+)?$/i)
  if (bracketedIpv6?.[1]) {
    normalized = bracketedIpv6[1]
  }

  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice('::ffff:'.length)
  }

  return normalized
}

const getViewerIpFromRequest = async (req: Request): Promise<string> => {
  const ipFromHeaders =
    firstHeaderValue(req.headers['cf-connecting-ip']) ||
    firstHeaderValue(req.headers['x-forwarded-for']) ||
    firstHeaderValue(req.headers['x-real-ip'])

  const candidate = ipFromHeaders || req.ip || req.socket.remoteAddress || ''
  const normalized = normalizeViewerIp(candidate) || '127.0.0.1'

  const isLocalIp = 
    normalized === '127.0.0.1' || 
    normalized === '::1' || 
    normalized.startsWith('192.168.') || 
    normalized.startsWith('10.') || 
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalized)

  if (process.env.NODE_ENV !== 'production' && isLocalIp) {
    try {
      // Fetch the actual public IP of the developer's machine to pass to Clipmux
      // Added a 3 second timeout so local dev doesn't hang if offline
      const response = await fetch('https://api.ipify.org', {
        signal: AbortSignal.timeout(3000)
      })
      const publicIp = await response.text()
      return publicIp.trim() || '8.8.8.8'
    } catch (e) {
      console.warn('Failed to fetch public IP for local dev, falling back to 8.8.8.8')
      return '8.8.8.8' // Fallback dummy public IP
    }
  }

  return normalized
}

/**
 * Generate signed playback URL for video.
 */
const playableVideoUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const endUser = req.endUser

    const videoId = getVideoId(lesson)

    if (!videoId) {
      return next(new ApiError(404, 'No video content found.'))
    }

    if (lesson.videoStatus !== 'READY') {
      return next(new ApiError(422, 'Video is processing.'))
    }

    // Generate the signed playback URL from Clipmux.
    // Use trusted proxy headers first, then fall back to Express/socket IP.
    const viewerIp = await getViewerIpFromRequest(req)
    const userAgentHeader = req.headers['user-agent']
    const viewerUserAgent =
      (Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader) || 'unknown'
    const playbackData = await getPlaybackUrl(videoId, viewerIp, viewerUserAgent)

    return res.status(200).json(
      new ApiResponse(200, 'Playback authorized', {
        type: 'clipmux',
        videoId: videoId,
        token: playbackData.token,
        url: playbackData.playbackUrl,
        expiresAt: playbackData.expiresAt,
        subtitle_url: playbackData.subtitle_url,
        chapters: playbackData.chapters,
      }),
    )
  } catch (error) {
    console.error('[CLIPMUX_PLAYBACK_ERROR]', error)
    next(new ApiError(500, 'Failed to generate playback URL.'))
  }
}

/**
 * Get video upload status from Clipmux.
 */
const getVideoStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const project = req.project!
  const { lessonId } = req.params

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: { course: { projectId: project.id } },
    },
    select: { videoId: true, videoStatus: true },
  })

  if (!lesson || !lesson.videoId) {
    return next(new ApiError(404, 'No video found for this lesson.'))
  }

  try {
    const videoDetails = await getVideoDetails(lesson.videoId)

    // Map Clipmux status to our status
    let status = lesson.videoStatus
    if (videoDetails.status === 'ready') {
      status = 'READY'
    } else if (
      videoDetails.status === 'failed' ||
      videoDetails.status === 'error'
    ) {
      status = 'FAILED'
    } else {
      status = 'PROCESSING'
    }

    // Update DB if status changed
    if (status !== lesson.videoStatus) {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          videoStatus: status,
          ...(videoDetails.duration && {
            duration: Math.round(videoDetails.duration),
          }),
          ...(videoDetails.thumbnailUrl && {
            thumbnail: videoDetails.thumbnailUrl,
          }),
        },
      })
    }

    return res.status(200).json(
      new ApiResponse(200, 'Video status retrieved', {
        videoId: lesson.videoId,
        status,
        duration: videoDetails.duration,
        thumbnail: videoDetails.thumbnailUrl,
      }),
    )
  } catch (error) {
    console.error('[CLIPMUX_STATUS_ERROR]', error)
    next(new ApiError(500, 'Failed to get video status.'))
  }
}

export {
  createVideoUpload,
  linkVideoToLesson,
  deleteVideoFromLesson,
  playableVideoUrl,
  getVideoStatus,
}
