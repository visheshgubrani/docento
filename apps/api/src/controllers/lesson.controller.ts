import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { captureServerEvent } from '../lib/posthog'
import { prisma } from '../lib/prisma'
import { getR2Client, getR2PublicBaseUrl } from '../lib/r2'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'

const VALID_LESSON_CONTENT_TYPES = [
  'VIDEO',
  'TEXT',
  'QUIZ',
  'FILE',
  'ASSIGNMENT',
  'MOCK_TEST',
  'YOUTUBE',
]

const normalizeOptionalBoolean = (
  value: unknown,
  fieldName: string,
): boolean | undefined => {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  throw new ApiError(400, `${fieldName} must be a boolean`)
}

const createLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const module = req.module!
  const {
    title,
    description,
    contentType,
    textContent,
    fileUrl,
    videoUrl,
    isFree,
    duration,
  } = req.body

  if (!title || !contentType) {
    return next(new ApiError(400, 'Title and contentType are required'))
  }

  const normalizedContentType = String(contentType).toUpperCase()
  if (!VALID_LESSON_CONTENT_TYPES.includes(normalizedContentType)) {
    return next(new ApiError(400, 'Invalid contentType'))
  }

  let normalizedDuration: number | null = null
  if (duration !== undefined && duration !== null) {
    const parsedDuration = Number(duration)
    if (Number.isNaN(parsedDuration) || parsedDuration < 0) {
      return next(
        new ApiError(400, 'Duration must be a positive number in minutes'),
      )
    }
    normalizedDuration = Math.round(parsedDuration)
  }

  let normalizedIsFree = false
  try {
    normalizedIsFree = normalizeOptionalBoolean(isFree, 'isFree') ?? false
  } catch (error) {
    return next(error)
  }

  // Atomic insert: compute next order + create in a single DB round-trip
  const rows: any[] = await prisma.$queryRaw`
    INSERT INTO "lesson" (
      "id", "moduleId", "title", "description", "contentType",
      "textContent", "fileUrl", "videoUrl", "isFree", "duration",
      "order", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid()::text,
      ${module.id},
      ${title},
      ${description ?? null},
      ${normalizedContentType},
      ${textContent ?? null},
      ${fileUrl ?? null},
      ${videoUrl ?? null},
      ${normalizedIsFree},
      ${normalizedDuration},
      COALESCE((SELECT MAX("order") FROM "lesson" WHERE "moduleId" = ${module.id}), 0) + 1,
      NOW(),
      NOW()
    )
    RETURNING *
  `
  const lesson = rows[0]

  captureServerEvent(req, 'lesson_created_server', {
    content_type: lesson.contentType,
    course_id: req.course?.id,
    has_description:
      typeof description === 'string' && description.trim().length > 0,
    is_free: lesson.isFree,
    lesson_id: lesson.id,
    module_id: module.id,
    project_id: req.project?.id,
  })

  return res.status(201).json(
    new ApiResponse(201, 'Lesson created successfully', {
      lesson,
    }),
  )
}

const updateLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const lesson = req.lesson!
  const {
    title,
    description,
    contentType,
    videoUrl,
    textContent,
    fileUrl,
    duration,
    isFree,
    order,
  } = req.body

  if (contentType !== undefined) {
    const normalizedContentType = String(contentType).toUpperCase()
    if (!VALID_LESSON_CONTENT_TYPES.includes(normalizedContentType)) {
      return next(new ApiError(400, 'Invalid contentType'))
    }
  }

  const dataToUpdate: any = {}
  if (title !== undefined) dataToUpdate.title = title
  if (description !== undefined) dataToUpdate.description = description
  if (contentType !== undefined)
    dataToUpdate.contentType = String(contentType).toUpperCase()
  if (videoUrl !== undefined) dataToUpdate.videoUrl = videoUrl
  if (textContent !== undefined) dataToUpdate.textContent = textContent
  if (fileUrl !== undefined) dataToUpdate.fileUrl = fileUrl
  if (duration !== undefined) dataToUpdate.duration = duration
  if (isFree !== undefined) {
    try {
      dataToUpdate.isFree = normalizeOptionalBoolean(isFree, 'isFree')
    } catch (error) {
      return next(error)
    }
  }
  if (order !== undefined) dataToUpdate.order = order

  if (Object.keys(dataToUpdate).length === 0) {
    return next(new ApiError(400, 'At least one field is required to update'))
  }

  const updated = await prisma.lesson.update({
    where: { id: lesson.id },
    data: dataToUpdate,
  })

  if (
    dataToUpdate.contentType === 'QUIZ' ||
    dataToUpdate.contentType === 'MOCK_TEST'
  ) {
    await prisma.quiz.updateMany({
      where: { lessonId: lesson.id },
      data: {
        isMockTest: dataToUpdate.contentType === 'MOCK_TEST',
      },
    })
  }

  return res.status(200).json(
    new ApiResponse(200, 'Lesson updated successfully', {
      lesson: updated,
    }),
  )
}

const deleteLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const lesson = req.lesson!

  await prisma.lesson.delete({
    where: { id: lesson.id },
  })

  return res
    .status(200)
    .json(new ApiResponse(200, 'Lesson deleted successfully', {}))
}

const getLessons = async (req: Request, res: Response, next: NextFunction) => {
  const module = req.module!

  const lessons = await prisma.lesson.findMany({
    where: {
      moduleId: module.id,
    },
    orderBy: {
      order: 'asc',
    },
  })

  return res.status(200).json(
    new ApiResponse(200, 'Lessons fetched successfully', {
      lessons,
    }),
  )
}

const getLesson = async (req: Request, res: Response, next: NextFunction) => {
  const lesson = req.lesson! // From resolveLessonContext

  const lessonWithDetails = await prisma.lesson.findUnique({
    where: { id: lesson.id },
    include: {
      module: {
        select: {
          id: true,
          title: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  })

  return res.status(200).json(
    new ApiResponse(200, 'Lesson fetched successfully', {
      lesson: lessonWithDetails,
    }),
  )
}

const reorderLessons = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const module = req.module!
  const { lessonOrders } = req.body // Array of { id, order }

  if (!Array.isArray(lessonOrders) || lessonOrders.length === 0) {
    return next(new ApiError(400, 'lessonOrders must be a non-empty array'))
  }

  // Validate structure
  for (const item of lessonOrders) {
    if (!item.id || typeof item.order !== 'number' || item.order < 1) {
      return next(
        new ApiError(400, 'Each item must have id and a positive order number'),
      )
    }
  }

  // Verify all lessons belong to this module
  const lessonIds = lessonOrders.map((l) => l.id)
  const existingLessons = await prisma.lesson.findMany({
    where: {
      id: { in: lessonIds },
      moduleId: module.id,
    },
    select: { id: true },
  })

  if (existingLessons.length !== lessonIds.length) {
    return next(new ApiError(400, 'Some lessons do not belong to this module'))
  }

  // Check for duplicate orders
  const orders = lessonOrders.map((l) => l.order)
  if (new Set(orders).size !== orders.length) {
    return next(new ApiError(400, 'Duplicate order values are not allowed'))
  }

  // Use sequential updates with temporary high values to avoid unique constraint
  await prisma.$transaction(async (tx) => {
    // First, set all to temporary high values to avoid conflicts
    const offset = 10000
    for (const { id, order } of lessonOrders) {
      await tx.lesson.update({
        where: { id },
        data: { order: order + offset },
      })
    }
    // Then set to final values
    for (const { id, order } of lessonOrders) {
      await tx.lesson.update({
        where: { id },
        data: { order },
      })
    }
  })

  return res
    .status(200)
    .json(new ApiResponse(200, 'Lessons reordered successfully', {}))
}

/**
 * POST /lessons/:lessonId/thumbnail/upload
 * Create a presigned URL for uploading a custom thumbnail
 */
const createThumbnailUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const { contentType, fileName } = req.body

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!contentType || !allowedTypes.includes(contentType)) {
      return next(
        new ApiError(400, 'contentType must be one of: jpeg, png, webp, gif'),
      )
    }

    const r2Client = getR2Client()
    const bucket = process.env.R2_BUCKET
    const publicBaseUrl = getR2PublicBaseUrl()

    if (!r2Client || !bucket) {
      return next(new ApiError(500, 'R2 storage is not configured'))
    }

    if (!publicBaseUrl) {
      return next(new ApiError(500, 'R2_PUBLIC_URL is not configured'))
    }

    // Generate unique key for the thumbnail
    const extension = contentType.split('/')[1] || 'jpg'
    const uniqueId = crypto.randomUUID()
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()
      : 'thumbnail'
    const key = `lessons/${lesson.id}/thumbnails/${safeName}-${uniqueId}.${extension}`
    const thumbnailUrl = `${publicBaseUrl}/${key}`

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 15 * 60, // 15 minutes
    })

    return res.status(200).json(
      new ApiResponse(200, 'Thumbnail upload URL created', {
        presignedUrl,
        thumbnailUrl,
        key,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        expiresIn: 900,
      }),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /lessons/:lessonId/thumbnail
 * Update the lesson thumbnail URL (after upload or with external URL)
 */
const updateThumbnail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const { thumbnail } = req.body

    if (!thumbnail || typeof thumbnail !== 'string') {
      return next(new ApiError(400, 'Thumbnail URL is required'))
    }

    // Basic URL validation
    try {
      new URL(thumbnail)
    } catch {
      return next(new ApiError(400, 'Invalid thumbnail URL'))
    }

    const updated = await prisma.lesson.update({
      where: { id: lesson.id },
      data: { thumbnail },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Thumbnail updated successfully', {
        lesson: updated,
      }),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * POST /lessons/:lessonId/pdf/presign
 * Create a presigned URL for uploading a PDF file
 */
const createPdfUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const { contentType, fileName } = req.body

    // Validate content type
    if (contentType !== 'application/pdf') {
      return next(new ApiError(400, 'contentType must be application/pdf'))
    }

    const r2Client = getR2Client()
    const bucket = process.env.R2_BUCKET
    const publicBaseUrl = getR2PublicBaseUrl()

    if (!r2Client || !bucket) {
      return next(new ApiError(500, 'R2 storage is not configured'))
    }

    if (!publicBaseUrl) {
      return next(new ApiError(500, 'R2_PUBLIC_URL is not configured'))
    }

    // Generate unique key for the PDF
    const uniqueId = crypto.randomUUID()
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()
      : 'document'
    const key = `lessons/${lesson.id}/pdfs/${safeName}-${uniqueId}.pdf`
    const fileUrl = `${publicBaseUrl}/${key}`

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 15 * 60, // 15 minutes
    })

    return res.status(200).json(
      new ApiResponse(200, 'PDF upload URL created', {
        presignedUrl,
        fileUrl,
        key,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        expiresIn: 900,
      }),
    )
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /lessons/:lessonId/pdf
 * Delete the PDF file from a lesson
 */
const deletePdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = req.lesson!

    // Clear the fileUrl only (contentType is required in schema)
    const updated = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        fileUrl: null,
      } as any,
    })

    return res.status(200).json(
      new ApiResponse(200, 'PDF deleted successfully', {
        lesson: updated,
      }),
    )
  } catch (error) {
    next(error)
  }
}

export {
  createLesson,
  updateLesson,
  deleteLesson,
  getLesson,
  getLessons,
  reorderLessons,
  createThumbnailUpload,
  updateThumbnail,
  createPdfUpload,
  deletePdf,
}
