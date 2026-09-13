import { Request, Response, NextFunction } from 'express'
import { Course, Module } from '../generated/prisma'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'

const MODULE_CONTEXT_CACHE_TTL_MS = Number(
  process.env.MODULE_CONTEXT_CACHE_TTL_MS ?? '30000',
)

type ModuleContextCacheEntry = {
  module: Module
  course: Course
  expiresAt: number
}

const moduleContextCache = new Map<string, ModuleContextCacheEntry>()

const moduleContextCacheKey = (
  projectId: string | undefined,
  courseId: string,
  moduleId: string,
) => `${projectId ?? 'none'}:${courseId}:${moduleId}`

const getCachedModuleContext = (key: string) => {
  if (MODULE_CONTEXT_CACHE_TTL_MS <= 0) return null

  const cached = moduleContextCache.get(key)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    moduleContextCache.delete(key)
    return null
  }

  return cached
}

const setCachedModuleContext = (
  key: string,
  module: Module,
  course: Course,
) => {
  if (MODULE_CONTEXT_CACHE_TTL_MS <= 0) return

  moduleContextCache.set(key, {
    module,
    course,
    expiresAt: Date.now() + MODULE_CONTEXT_CACHE_TTL_MS,
  })
}

export const resolveModuleContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const mwStart = process.hrtime.bigint()
  const recordTiming = () => {
    if ((req as any).__mwTimings) {
      const ms = Number(process.hrtime.bigint() - mwStart) / 1_000_000
      ;(req as any).__mwTimings.push({ name: 'resolveModule', ms })
    }
  }
  try {
    const { moduleId, courseId } = req.params
    const project = req.project

    if (!moduleId) {
      recordTiming()
      return next(new ApiError(400, 'Module ID is required.'))
    }

    if (!courseId) {
      recordTiming()
      return next(new ApiError(400, 'Course ID is required.'))
    }

    const cacheKey = moduleContextCacheKey(project?.id, courseId, moduleId)
    const cachedContext = getCachedModuleContext(cacheKey)
    if (cachedContext) {
      req.module = cachedContext.module
      req.course = cachedContext.course
      recordTiming()
      return next()
    }

    const module = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId,
        ...(project ? { course: { projectId: project.id } } : {}),
      },
      include: {
        course: true,
      },
    })

    if (!module) {
      recordTiming()
      return next(
        new ApiError(
          404,
          'Module not found or does not belong to this course.',
        ),
      )
    }

    setCachedModuleContext(cacheKey, module, module.course)

    req.module = module
    req.course = module.course
    recordTiming()
    next()
  } catch (error) {
    console.error('[RESOLVE_MODULE_CONTEXT_ERROR]', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}
