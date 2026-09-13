import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import path from 'path'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import { getR2Client, getR2PublicBaseUrl } from '../lib/r2'

const createUploadSchema = z.object({
  title: z.string().min(1, 'title is required'),
  type: z.string().min(1, 'type is required'),
  fileName: z.string().min(1).optional(),
})

const uploadIdSchema = z.object({
  uploadId: z.string().min(1, 'uploadId is required'),
})

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .toLowerCase()

const buildObjectKey = (lessonId: string, fileName: string | undefined) => {
  const safeName = fileName ? sanitizeFileName(fileName) : ''
  const extension = safeName ? path.extname(safeName) : ''
  const baseName =
    safeName && extension ? safeName.slice(0, -extension.length) : safeName
  const unique = crypto.randomUUID()
  const normalizedBase = baseName || 'resource'
  return `lessons/${lessonId}/${normalizedBase}-${unique}${extension}`
}

const resolvePublicUrl = (bucket: string, key: string, endpoint?: string) => {
  const baseFromEnv = getR2PublicBaseUrl()
  if (baseFromEnv) return `${baseFromEnv}/${key}`
  if (!endpoint) return null
  const trimmed = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint
  return `${trimmed}/${bucket}/${key}`
}

const createUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const parsed = createUploadSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const r2Client = getR2Client()
    const bucket = process.env.R2_BUCKET
    const endpoint = process.env.R2_ENDPOINT

    if (!r2Client || !bucket) {
      return next(new ApiError(500, 'Cloudflare R2 is not configured.'))
    }

    const { title, type, fileName } = parsed.data
    const key = buildObjectKey(lesson.id, fileName || title)
    const fileUrl = resolvePublicUrl(bucket, key, endpoint)

    if (!fileUrl) {
      return next(
        new ApiError(
          500,
          'Missing R2_PUBLIC_URL (or R2_PUBLIC_BASE_URL) for fileUrl generation.',
        ),
      )
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: type,
    })

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 15 * 60,
    })

    const upload = await prisma.upload.create({
      data: {
        lessonId: lesson.id,
        title,
        type,
        key,
        fileUrl,
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'Upload session created.', {
        upload,
        presignedUrl,
        method: 'PUT',
        headers: {
          'Content-Type': type,
        },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

const getUploads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = req.lesson!
    const uploads = await prisma.upload.findMany({
      where: { lessonId: lesson.id },
      orderBy: { createdAt: 'desc' },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Uploads fetched successfully.', {
        uploads,
      }),
    )
  } catch (error) {
    return next(error)
  }
}

const deleteUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const parsed = uploadIdSchema.safeParse(req.params)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { uploadId } = parsed.data
    const upload = await prisma.upload.findFirst({
      where: { id: uploadId, lessonId: lesson.id },
    })

    if (!upload) {
      return next(new ApiError(404, 'Upload not found for this lesson.'))
    }

    const r2Client = getR2Client()
    const bucket = process.env.R2_BUCKET
    if (r2Client && bucket) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: upload.key,
      })
      await r2Client.send(deleteCommand)
    }

    await prisma.upload.delete({ where: { id: upload.id } })

    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}

export { createUpload, getUploads, deleteUpload }
