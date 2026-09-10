import { Request, Response, NextFunction } from 'express'
import { captureServerEvent } from '../lib/posthog'
import ApiError from '../utils/ApiError'
import { prisma } from '../lib/prisma'
import ApiResponse from '../utils/ApiResponse'

const createModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const course = req.course!
  const { title, description } = req.body

  if (!title) {
    return next(new ApiError(400, 'Title is required'))
  }

  // Get the next order number
  const lastModule = await prisma.module.findFirst({
    where: { courseId: course.id },
    orderBy: { order: 'desc' },
  })

  const order = lastModule ? lastModule.order + 1 : 1

  const module = await prisma.module.create({
    data: {
      courseId: course.id,
      title,
      description,
      order,
    },
  })

  captureServerEvent(req, 'module_created_server', {
    course_id: course.id,
    has_description:
      typeof description === 'string' && description.trim().length > 0,
    module_id: module.id,
    project_id: req.project?.id,
  })

  return res.status(201).json(
    new ApiResponse(201, 'Module created successfully', {
      module,
    })
  )
}

const updateModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const module = req.module!
  const { title, description, order } = req.body

  const dataToUpdate: any = {}
  if (title !== undefined) dataToUpdate.title = title
  if (description !== undefined) dataToUpdate.description = description
  if (order !== undefined) dataToUpdate.order = order

  if (Object.keys(dataToUpdate).length === 0) {
    return next(new ApiError(400, 'At least one field is required to update'))
  }

  const updated = await prisma.module.update({
    where: { id: module.id },
    data: dataToUpdate,
  })

  return res.status(200).json(
    new ApiResponse(200, 'Module updated successfully', {
      module: updated,
    })
  )
}

const deleteModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const module = req.module!

  await prisma.module.delete({
    where: { id: module.id },
  })

  return res
    .status(200)
    .json(new ApiResponse(200, 'Module deleted successfully', {}))
}

const getModules = async (req: Request, res: Response, next: NextFunction) => {
  const course = req.course!

  const modules = await prisma.module.findMany({
    where: {
      courseId: course.id,
    },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          contentType: true,
          duration: true,
          isFree: true,
          order: true,
        },
      },
      _count: {
        select: {
          lessons: true,
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  })

  return res.status(200).json(
    new ApiResponse(200, 'Modules fetched successfully', {
      modules,
    })
  )
}

const getModule = async (req: Request, res: Response, next: NextFunction) => {
  const module = req.module! // From resolveModuleContext

  const moduleWithDetails = await prisma.module.findUnique({
    where: { id: module.id },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
      },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  })

  return res.status(200).json(
    new ApiResponse(200, 'Module fetched successfully', {
      module: moduleWithDetails,
    })
  )
}

const reorderModules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const course = req.course!
  const { moduleOrders } = req.body // Array of { id, order }

  if (!Array.isArray(moduleOrders) || moduleOrders.length === 0) {
    return next(new ApiError(400, 'moduleOrders must be a non-empty array'))
  }

  // Validate structure
  for (const item of moduleOrders) {
    if (!item.id || typeof item.order !== 'number' || item.order < 1) {
      return next(new ApiError(400, 'Each item must have id and a positive order number'))
    }
  }

  // Verify all modules belong to this course
  const moduleIds = moduleOrders.map((m) => m.id)
  const existingModules = await prisma.module.findMany({
    where: {
      id: { in: moduleIds },
      courseId: course.id,
    },
    select: { id: true },
  })

  if (existingModules.length !== moduleIds.length) {
    return next(new ApiError(400, 'Some modules do not belong to this course'))
  }

  // Check for duplicate orders
  const orders = moduleOrders.map((m) => m.order)
  if (new Set(orders).size !== orders.length) {
    return next(new ApiError(400, 'Duplicate order values are not allowed'))
  }

  // Use sequential updates with temporary high values to avoid unique constraint
  await prisma.$transaction(async (tx) => {
    // First, set all to temporary high values to avoid conflicts
    const offset = 10000
    for (const { id, order } of moduleOrders) {
      await tx.module.update({
        where: { id },
        data: { order: order + offset },
      })
    }
    // Then set to final values
    for (const { id, order } of moduleOrders) {
      await tx.module.update({
        where: { id },
        data: { order },
      })
    }
  })

  return res
    .status(200)
    .json(new ApiResponse(200, 'Modules reordered successfully', {}))
}

export {
  createModule,
  updateModule,
  deleteModule,
  getModules,
  getModule,
  reorderModules,
}
