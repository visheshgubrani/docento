import { Request, Response, NextFunction } from 'express'

import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import {
  appendOriginToCache,
  dropOriginFromCache,
  refreshAllowedOriginsCache,
  normalizeOrigin,
} from '../middlewares/cors.middleware'

const ensureOwnerProject = async (projectId: string, userId?: string) => {
  if (!projectId) {
    throw new ApiError(400, 'Project ID is required')
  }

  if (!userId) {
    throw new ApiError(401, 'User not authenticated')
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true, allowedOrigins: true },
  })

  if (!project) {
    throw new ApiError(403, "Forbidden: You don't own this project.")
  }

  return project
}

const isValidOrigin = (value?: string | null) => {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const getAllowedOrigins = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params
    const user = req.user
    const project = await ensureOwnerProject(projectId, user?.id)

    return res.status(200).json(
      new ApiResponse(200, 'Allowed origins fetched', {
        origins: project.allowedOrigins ?? [],
      }),
    )
  } catch (error) {
    return next(error)
  }
}

const addAllowedOrigin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params
    const user = req.user
    const { origin } = req.body || {}

    if (!isValidOrigin(origin)) {
      return next(
        new ApiError(400, 'A valid origin is required (http:// or https://)'),
      )
    }

    const normalized = normalizeOrigin(origin)
    if (!normalized) {
      return next(new ApiError(400, 'Unable to parse origin'))
    }

    const project = await ensureOwnerProject(projectId, user?.id)
    const existingOrigins = project.allowedOrigins ?? []

    if (existingOrigins.some((item) => normalizeOrigin(item) === normalized)) {
      return res.status(200).json(
        new ApiResponse(200, 'Origin already allowed', {
          origins: existingOrigins,
        }),
      )
    }

    const updatedOrigins = [...existingOrigins, normalized]

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { allowedOrigins: updatedOrigins },
      select: { allowedOrigins: true },
    })

    appendOriginToCache(normalized)
    // Reset cache expiration so future requests get the latest list.
    await refreshAllowedOriginsCache()

    return res.status(201).json(
      new ApiResponse(201, 'Origin added', {
        origins: updated.allowedOrigins ?? [],
      }),
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error)
    }
    console.error('[ADD_ALLOWED_ORIGIN_ERROR]', error)
    return next(new ApiError(500, 'Failed to add origin'))
  }
}

const deleteAllowedOrigin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params
    const user = req.user
    const { origin } = req.body || {}

    if (!isValidOrigin(origin)) {
      return next(
        new ApiError(400, 'A valid origin is required (http:// or https://)'),
      )
    }

    const normalized = normalizeOrigin(origin)
    if (!normalized) {
      return next(new ApiError(400, 'Unable to parse origin'))
    }

    const project = await ensureOwnerProject(projectId, user?.id)

    const existingOrigins = project.allowedOrigins ?? []
    const filtered = existingOrigins.filter(
      (item) => normalizeOrigin(item) !== normalized,
    )

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { allowedOrigins: filtered },
      select: { allowedOrigins: true },
    })

    dropOriginFromCache(origin)
    await refreshAllowedOriginsCache()

    return res.status(200).json(
      new ApiResponse(200, 'Origin removed', {
        origins: updated.allowedOrigins ?? [],
      }),
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error)
    }
    console.error('[DELETE_ALLOWED_ORIGIN_ERROR]', error)
    return next(new ApiError(500, 'Failed to delete origin'))
  }
}

export { getAllowedOrigins, addAllowedOrigin, deleteAllowedOrigin }
