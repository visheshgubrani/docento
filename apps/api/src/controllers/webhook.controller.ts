import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import { dispatchWebhook } from '../utils/webhook'

const SUPPORTED_WEBHOOK_EVENTS = [
  'enrollment.created',
  'lesson.completed',
  'quiz.attempt_completed',
  'course.completed',
  'video.processed',
  'video.failed',
] as const

const isValidUrl = (value?: string | null) => {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const createWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user
    const { projectId } = req.params
    const { url, secret } = req.body || {}

    if (!user) {
      return next(new ApiError(401, 'User not authenticated'))
    }

    if (!projectId) {
      return next(new ApiError(400, 'Project ID is required'))
    }

    if (!isValidUrl(url)) {
      return next(new ApiError(400, 'A valid webhook URL is required'))
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: user.id,
      },
      select: {
        id: true,
        webhookSecret: true,
      },
    })

    if (!project) {
      return next(new ApiError(403, "Forbidden: You don't own this project."))
    }

    let finalSecret = secret?.trim()

    if (!finalSecret) {
      finalSecret =
        project.webhookSecret || crypto.randomBytes(32).toString('hex')
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        webhookUrl: url,
        webhookSecret: finalSecret,
      },
      select: {
        id: true,
        webhookUrl: true,
        webhookSecret: true,
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'Webhook configured successfully', {
        webhook: {
          url: updatedProject.webhookUrl,
          secret: updatedProject.webhookSecret,
          events: SUPPORTED_WEBHOOK_EVENTS,
        },
      })
    )
  } catch (error) {
    console.error('[CREATE_WEBHOOK_ERROR]', error)
    return next(new ApiError(500, 'Failed to configure webhook'))
  }
}

const deleteWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user
    const { projectId } = req.params

    if (!user) {
      return next(new ApiError(401, 'User not authenticated'))
    }

    if (!projectId) {
      return next(new ApiError(400, 'Project ID is required'))
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: user.id,
      },
    })

    if (!project) {
      return next(new ApiError(403, "Forbidden: You don't own this project."))
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        webhookUrl: null,
        webhookSecret: null,
      },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Webhook deleted successfully', {}))
  } catch (error) {
    console.error('[DELETE_WEBHOOK_ERROR]', error)
    return next(new ApiError(500, 'Failed to delete webhook'))
  }
}

const getWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user
    const { projectId } = req.params

    if (!user) {
      return next(new ApiError(401, 'User not authenticated'))
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      select: { webhookUrl: true, webhookSecret: true },
    })

    if (!project) {
      return next(new ApiError(404, 'Project not found'))
    }

    return res.status(200).json(
      new ApiResponse(200, 'Webhook config', {
        url: project.webhookUrl,
        secret: project.webhookSecret,
        events: SUPPORTED_WEBHOOK_EVENTS,
      })
    )
  } catch (error) {
    console.error('[GET_WEBHOOK_ERROR]', error)
    return next(new ApiError(500, 'Failed to fetch webhook config'))
  }
}

const testWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user
    const { projectId } = req.params
    const { event = 'enrollment.created' } = req.body || {}

    if (!user) {
      return next(new ApiError(401, 'User not authenticated'))
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      select: { id: true, webhookUrl: true, webhookSecret: true },
    })

    if (!project) {
      return next(new ApiError(404, 'Project not found'))
    }

    if (!project.webhookUrl || !project.webhookSecret) {
      return next(
        new ApiError(400, 'Webhook is not configured for this project')
      )
    }

    const normalizedEvent = String(event).toLowerCase()
    const isSupported = SUPPORTED_WEBHOOK_EVENTS.includes(
      normalizedEvent as (typeof SUPPORTED_WEBHOOK_EVENTS)[number]
    )

    if (!isSupported) {
      return next(
        new ApiError(
          400,
          `Unsupported event. Supported events: ${SUPPORTED_WEBHOOK_EVENTS.join(
            ', '
          )}`
        )
      )
    }

    await dispatchWebhook(project.id, normalizedEvent, {
      test: true,
      message: 'Test event from dashboard',
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Test webhook dispatched', {}))
  } catch (error) {
    console.error('[TEST_WEBHOOK_ERROR]', error)
    return next(new ApiError(500, 'Failed to dispatch test webhook'))
  }
}

export {
  createWebhook,
  deleteWebhook,
  getWebhook,
  testWebhook,
  SUPPORTED_WEBHOOK_EVENTS,
}
