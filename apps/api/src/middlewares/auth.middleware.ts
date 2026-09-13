import { Request, Response, NextFunction } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth' // Your Better Auth instance
import ApiError from '../utils/ApiError'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import jwt from 'jsonwebtoken'
import { Project, ProjectMember } from '../generated/prisma'
import { applyApiKeyRateLimit } from './rate-limit.middleware'

/**
 * Cache the Better Auth session on the request object so that repeated
 * getSession() calls across multiple middlewares hit the DB only once.
 */
const getSessionCached = async (req: Request) => {
  if ((req as any).__cachedSession !== undefined) {
    return (req as any).__cachedSession
  }
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })
  ;(req as any).__cachedSession = session ?? null
  return session
}

interface EndUserJwtPayload extends jwt.JwtPayload {
  userId: string
  projectId: string
}

const PROJECT_ACCESS_CACHE_TTL_MS = Number(
  process.env.PROJECT_ACCESS_CACHE_TTL_MS ?? '30000',
)

type ProjectAccessCacheEntry = {
  project: Project
  membership?: ProjectMember
  expiresAt: number
}

const projectAccessCache = new Map<string, ProjectAccessCacheEntry>()

const projectAccessCacheKey = (projectId: string, userId: string) =>
  `${projectId}:${userId}`

const getCachedProjectAccess = (key: string) => {
  if (PROJECT_ACCESS_CACHE_TTL_MS <= 0) return null

  const cached = projectAccessCache.get(key)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    projectAccessCache.delete(key)
    return null
  }

  return cached
}

const setCachedProjectAccess = (
  key: string,
  project: Project,
  membership?: ProjectMember,
) => {
  if (PROJECT_ACCESS_CACHE_TTL_MS <= 0) return

  projectAccessCache.set(key, {
    project,
    membership,
    expiresAt: Date.now() + PROJECT_ACCESS_CACHE_TTL_MS,
  })
}

const asHeaderString = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0]
  return value
}

const extractApiKey = (req: Request) => {
  const authHeader = req.headers.authorization
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined

  return (
    asHeaderString(req.headers['x-publishable-key']) ||
    asHeaderString(req.headers['x-api-key']) ||
    bearerToken
  )
}

/**
 * Publishable keys are public: they identify an academy in a browser and are
 * shipped in client bundles. They are read-only by construction.
 *
 * This was previously a comment ("Public/Read-Only") with nothing enforcing it,
 * which meant a publishable key authorized every `/:projectId` route that used
 * `authorizeProjectAccess` — including end-user create, update, and delete. The
 * check lives here, at the one place such a key is resolved, so a new route
 * cannot forget it. See ARCHITECTURE.md, "Authorization".
 */
const PUBLISHABLE_ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const isPublishableKey = (key: string | undefined): boolean =>
  typeof key === 'string' && key.trim().startsWith('pk_')

const publishableReadOnlyError = (method: string) =>
  new ApiError(
    403,
    `Publishable keys are read-only; ${method} is not permitted with one. Use a secret key from a server, or a learner session.`,
  )

const resolveApiKey = async (
  providedKey: string,
  allowPublishable: boolean,
) => {
  const key = providedKey.trim()
  if (!key) return null

  if (allowPublishable) {
    const projectFromPublishable = await prisma.project.findUnique({
      where: { publishableKey: key },
      include: { owner: true },
    })

    if (projectFromPublishable) {
      return {
        project: projectFromPublishable,
        apiKeyAuth: { type: 'publishable' as const },
        publishable: true as const,
      }
    }
  }

  const hashedKey = crypto.createHash('sha256').update(key).digest('hex')
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: { project: { include: { owner: true } } },
  })

  if (!apiKeyRecord || !apiKeyRecord.project) return null

  return {
    project: apiKeyRecord.project,
    apiKeyAuth: { type: 'secret' as const, keyId: apiKeyRecord.id },
  }
}

const resolveApiKeyFromRequest = async (
  req: Request,
  allowPublishable: boolean,
) => {
  const providedKey = extractApiKey(req)
  if (!providedKey) {
    return { key: undefined, project: undefined, apiKeyAuth: undefined }
  }

  const resolved = await resolveApiKey(providedKey, allowPublishable)
  return { key: providedKey, ...resolved }
}

// Auth middleware - attaches session to req.auth
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })

    if (session) {
      req.auth = session as any
    }

    next()
  } catch (error) {
    // For optional auth, we don't want to block the request on an error,
    // just log it and continue.
    console.error('Auth middleware error:', error)
    next()
  }
}

// Protected route middleware - requires authentication
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })

    // Check for the session and the nested user object
    if (!session || !session.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // ✅ YOUR FIX IS CORRECT!
    // We use the ID from the nested user object in the session...
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    // ...to fetch the most up-to-date user data from our database.
    if (!userFromDb) {
      return next(
        new ApiError(401, 'Unauthorized: User for this session not found.'),
      )
    }

    req.auth = session as any
    req.user = userFromDb

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate',
    })
  }
}

export const requireApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { key, project, apiKeyAuth } = await resolveApiKeyFromRequest(
      req,
      true,
    )

    if (!key || !project || !apiKeyAuth) {
      return next(new ApiError(401, 'Unauthorized: Invalid API key.'))
    }

    if (
      apiKeyAuth.type === 'publishable' &&
      !PUBLISHABLE_ALLOWED_METHODS.has(req.method.toUpperCase())
    ) {
      return next(publishableReadOnlyError(req.method.toUpperCase()))
    }

    req.project = project
    req.apiKeyAuth = apiKeyAuth
    return applyApiKeyRateLimit(req, res, next)
  } catch (error) {
    console.error('API Key middleware error:', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}

export const requireSecretApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const providedKey = extractApiKey(req)

    if (!providedKey) {
      return next(
        new ApiError(
          401,
          'Unauthorized: Secret API key is required for this endpoint.',
        ),
      )
    }

    if (providedKey.startsWith('pk_')) {
      return next(
        new ApiError(
          401,
          'Unauthorized: Publishable keys cannot be used for this endpoint.',
        ),
      )
    }

    const resolved = await resolveApiKey(providedKey, false)
    if (!resolved) {
      return next(new ApiError(401, 'Unauthorized: Invalid API key.'))
    }

    req.project = resolved.project
    req.apiKeyAuth = resolved.apiKeyAuth
    req.user = resolved.project.owner
    return applyApiKeyRateLimit(req, res, next)
  } catch (error) {
    console.error('API Key middleware error:', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}

export const verifyManagedUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // ✅ Check BOTH cookie and Authorization header
    const token =
      req.cookies?.authToken || // Check cookie first
      req.headers.authorization?.replace('Bearer ', '') // Then check header

    if (!token) {
      return next(
        new ApiError(401, 'Unauthorized: Token is missing. Please login.'),
      )
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as EndUserJwtPayload

    const endUser = await prisma.endUser.findUnique({
      where: { id: payload.userId },
      include: {
        managedUser: true,
        project: true,
      },
    })

    if (!endUser || !endUser.managedUser) {
      return next(
        new ApiError(
          401,
          'Unauthorized: User not found or is not a managed user.',
        ),
      )
    }

    if (endUser.status === 'BANNED') {
      return next(
        new ApiError(
          403,
          'Forbidden: This account has been banned. Please contact support.',
        ),
      )
    }

    if (endUser.projectId !== payload.projectId) {
      return next(
        new ApiError(401, 'Unauthorized: Invalid token (project mismatch).'),
      )
    }

    req.endUser = endUser
    req.project = endUser.project

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, 'Unauthorized: Token has expired.'))
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, 'Unauthorized: Invalid token.'))
    }

    console.error('[VERIFY_MANAGED_USER_ERROR]', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}

export const authorizeProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const mwStart = process.hrtime.bigint()
  const recordTiming = () => {
    if ((req as any).__mwTimings) {
      const ms = Number(process.hrtime.bigint() - mwStart) / 1_000_000
      ;(req as any).__mwTimings.push({ name: 'authProjectAccess', ms })
    }
  }
  try {
    // Skip if this middleware already resolved for this request
    if (req.project) {
      recordTiming()
      return next()
    }

    const authHeader = req.headers.authorization

    // Helper to get header string
    const asHeaderString = (value?: string | string[]) =>
      Array.isArray(value) ? value[0] : value

    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined

    const providedKey =
      asHeaderString(req.headers['x-publishable-key']) ||
      asHeaderString(req.headers['x-api-key']) ||
      bearerToken

    // --- Path 1: API Key Authentication ---
    // Optimization: Only check DB if it actually LOOKS like one of your keys
    // (starts with pk_, sk_, lms_) OR if it came from specific x-api-key headers.
    // This prevents hashing every standard JWT session token.
    const isExplicitKey = !!(
      req.headers['x-publishable-key'] || req.headers['x-api-key']
    )
    const isKeyFormat =
      providedKey &&
      (providedKey.startsWith('pk_') ||
        providedKey.startsWith('sk_') ||
        providedKey.startsWith('lms_'))

    if (providedKey && (isExplicitKey || isKeyFormat)) {
      const key = providedKey.trim()

      // A. Publishable Key (Public/Read-Only)
      if (key.startsWith('pk_')) {
        const projectFromPublishable = await prisma.project.findUnique({
          where: { publishableKey: key },
          // ❌ Don't fetch owner here. It's not needed and saves a Join.
        })

        if (projectFromPublishable) {
          if (!PUBLISHABLE_ALLOWED_METHODS.has(req.method.toUpperCase())) {
            recordTiming()
            return next(publishableReadOnlyError(req.method.toUpperCase()))
          }

          req.project = projectFromPublishable
          req.user = undefined // 🔒 CRITICAL: Ensure no user is attached!
          req.apiKeyAuth = { type: 'publishable' }
          recordTiming()
          return applyApiKeyRateLimit(req, res, next)
        }
      }

      // B. Secret Key (Admin/Full Access)
      const hashedKey = crypto.createHash('sha256').update(key).digest('hex')
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: hashedKey },
        include: {
          project: { include: { owner: true } },
        },
      })

      if (apiKeyRecord && apiKeyRecord.project) {
        req.project = apiKeyRecord.project
        req.user = apiKeyRecord.project.owner // ✅ Safe for Secret Keys
        req.apiKeyAuth = { type: 'secret', keyId: apiKeyRecord.id }
        recordTiming()
        return applyApiKeyRateLimit(req, res, next)
      }
    }

    // --- Path 2: Session Authentication ---
    const session = await getSessionCached(req)

    if (session && session.user) {
      const { projectId } = req.params
      if (!projectId) {
        // Pass through if no projectId, letting the route handle it?
        // Or strict blocking. Strict is fine for this middleware.
        recordTiming()
        return next(
          new ApiError(400, 'Project ID is required in URL parameters.'),
        )
      }

      const cacheKey = projectAccessCacheKey(projectId, session.user.id)
      const cachedAccess = getCachedProjectAccess(cacheKey)
      if (cachedAccess) {
        req.project = cachedAccess.project
        req.user = session.user as any
        req.membership = cachedAccess.membership
        recordTiming()
        return next()
      }

      // Single query for both owner + member access to reduce DB roundtrips.
      const projectWithAccess = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
        include: {
          members: {
            where: { userId: session.user.id },
            take: 1,
          },
        },
      })

      if (projectWithAccess) {
        const { members, ...project } = projectWithAccess
        const membership =
          projectWithAccess.ownerId === session.user.id ? undefined : members[0]

        setCachedProjectAccess(cacheKey, project, membership)

        req.project = project
        req.user = session.user as any
        req.membership = membership
        recordTiming()
        return next()
      }
    }

    // --- Path 3: Unauthorized ---
    recordTiming()
    return next(new ApiError(401, 'Unauthorized'))
  } catch (error) {
    console.error('[AUTHORIZE_PROJECT_ACCESS_ERROR]', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}

/**
 * Middleware: Authorize access for project owner OR active members
 * Use this for general project access where both owners and members can operate
 * Attaches: req.project, req.user, req.membership (if member)
 */
export const authorizeProjectMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId } = req.params
    if (!projectId) {
      return next(new ApiError(400, 'Project ID is required'))
    }

    // Try session auth first
    const session = await getSessionCached(req)

    if (!session || !session.user) {
      return next(new ApiError(401, 'Unauthorized: Authentication required'))
    }

    const userId = session.user.id

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return next(new ApiError(404, 'Project not found'))
    }

    // Check if user is owner
    if (project.ownerId === userId) {
      req.project = project
      req.user = session.user as any
      req.membership = undefined // Owner doesn't have membership record
      return next()
    }

    // Check if user is an active member
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: projectId,
          userId: userId,
        },
      },
    })

    if (membership) {
      req.project = project
      req.user = session.user as any
      req.membership = membership
      return next()
    }

    return next(
      new ApiError(403, 'Forbidden: You do not have access to this project'),
    )
  } catch (error) {
    console.error('[AUTHORIZE_PROJECT_MEMBER_ERROR]', error)
    return next(new ApiError(500, 'Internal Server Error'))
  }
}

/**
 * Middleware: Require project owner role
 * Use this for owner-only operations: delete project, billing, API keys, invites
 * Must be used AFTER authorizeProjectMember or authorizeProjectAccess
 */
export const requireProjectOwner = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const project = req.project
  const user = req.user
  const membership = req.membership

  if (!project || !user) {
    return next(new ApiError(401, 'Unauthorized'))
  }

  // If there's a membership record, user is NOT the owner
  if (membership) {
    return next(
      new ApiError(
        403,
        'Forbidden: Only project owners can perform this action',
      ),
    )
  }

  // Double-check ownership
  if (project.ownerId !== user.id) {
    return next(
      new ApiError(
        403,
        'Forbidden: Only project owners can perform this action',
      ),
    )
  }

  next()
}

export const authorizeLessonAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { lessonId } = req.params
    const endUser = req.endUser!

    if (!lessonId) {
      return next(new ApiError(400, 'Lesson ID is required.'))
    }

    const lesson = await prisma.lesson.findUnique({
      where: {
        id: lessonId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        contentType: true,
        duration: true,
        isFree: true,
        videoUrl: true,
        videoStatus: true,
        videoId: true,
        module: {
          select: {
            courseId: true,
          },
        },
      },
    })

    if (!lesson || !lesson.module) {
      return next(new ApiError(404, 'Lesson not found.'))
    }

    if (lesson.isFree) {
      req.lesson = lesson // Attach the lesson context
      return next() // Skip enrollment check for free lessons
    }
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: lesson.module.courseId,
        endUserId: endUser.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    if (!enrollment) {
      return next(
        new ApiError(
          403,
          'Forbidden: You are not enrolled in this course or your access has expired.',
        ),
      )
    }

    req.lesson = lesson
    req.enrollment = enrollment
    next()
  } catch (error) {
    return next(error)
  }
}

export const handleDelegatedUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project
    const externalUserId = req.headers['x-user-id'] as string

    if (!externalUserId) {
      return next(new ApiError(400, 'Bad Request: Missing x-user-id header.'))
    }

    if (project?.authMode !== 'DELEGATED') {
      return next(
        new ApiError(
          403,
          'Forbidden: This project is not configured for delegated authentication.',
        ),
      )
    }

    // Find or create shadow user
    const userMetadata = req.body.metadata || {}

    // transaction to perform a safe find or create (upsert)
    const endUser = await prisma.$transaction(async (tx) => {
      // find the enduser based on the externalId and projjectId
      let user = await tx.endUser.findUnique({
        where: {
          projectId_externalId: {
            projectId: project.id,
            externalId: externalUserId,
          },
        },
        include: { delegatedUser: true },
      })

      if (user) {
        // User exists, update their metadata
        await tx.delegatedUser.update({
          where: { id: user.delegatedUser!.id },
          data: { metadata: userMetadata, lastSeenAt: new Date() },
        })
      } else {
        // User does not exists, create both endUser and delegatedUser
        user = await tx.endUser.create({
          data: {
            projectId: project.id,
            externalId: externalUserId,
            delegatedUser: {
              create: {
                metadata: userMetadata,
              },
            },
          },
          include: { delegatedUser: true },
        })
      }
      return user
    })
    req.endUser = endUser
    next()
  } catch (error) {
    console.error('[DELEGATED_USER_ERROR]', error)
    return next(new ApiError(500, 'Internal server error'))
  }
}

// Usage in routes:

// Example 1: Optional auth - session available if logged in
// app.get("/api/profile", authMiddleware, (req, res) => {
//   if (req.auth) {
//     return res.json({ user: req.auth.user });
//   }
//   return res.status(401).json({ error: "Not authenticated" });
// });

// Example 2: Required auth - must be logged in
// app.get("/api/protected", requireAuth, (req, res) => {
//   // req.auth is guaranteed to exist here
//   return res.json({ user: req.auth!.user });
// });

// Example 3: Using in controller
// export const getProfile = (req: Request, res: Response) => {
//   const user = req.auth!.user;
//   return res.json({ user });
// };
