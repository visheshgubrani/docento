import { Request, Response, NextFunction } from 'express'
import { captureServerEvent } from '../lib/posthog'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { encrypt } from '../utils/encryption'
import Razorpay from 'razorpay'

const END_USER_STATUSES = ['ACTIVE', 'BANNED'] as const
type EndUserStatus = (typeof END_USER_STATUSES)[number]

const normalizeEndUserStatus = (status?: string): EndUserStatus | null => {
  if (!status) return null
  const normalized = String(status).toUpperCase()
  return END_USER_STATUSES.find((value) => value === normalized) ?? null
}

const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, authMode } = req.body
  if (!name) {
    return next(new ApiError(404, 'Name and authMode is required'))
  }
  if (authMode) {
    if (authMode !== 'MANAGED' && authMode !== 'DELEGATED') {
      return next(
        new ApiError(400, 'Auth Mode can only be either managed or delegated')
      )
    }
  }

  const user = req.user
  if (!user) {
    // This will catch any case where middleware fails or user is not found
    return next(new ApiError(401, 'User not authenticated'))
  }
  // Generate unique slug
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
  const publishableKey = `pk_live_${crypto.randomBytes(12).toString('hex')}`

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      ownerId: user.id,
      publishableKey: publishableKey,
      authMode: authMode || 'MANAGED',
    },
  })

  captureServerEvent(req, 'project_created_server', {
    auth_mode: project.authMode,
    has_description:
      typeof req.body?.description === 'string' &&
      req.body.description.trim().length > 0,
    project_id: project.id,
  })

  return res.status(201).json(
    new ApiResponse(201, 'Project Created Successfully', {
      project,
    })
  )
}

const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user
  if (!user) {
    // This will catch any case where middleware fails or user is not found
    return next(new ApiError(401, 'User not authenticated'))
  }

  // Fetch projects where user is owner OR active member
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      members: {
        where: { userId: user.id },
        select: { role: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Flatten response with calculated role field
  const sanitizedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    authMode: p.authMode,
    publishableKey: p.publishableKey,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    branding: p.branding,
    customDomain: p.customDomain,
    allowedOrigins: p.allowedOrigins,
    webhookUrl: p.webhookUrl,
    ownerId: p.ownerId,
    // Calculated role: OWNER if user owns it, otherwise get from membership
    role: p.ownerId === user.id ? 'OWNER' : (p.members[0]?.role || 'EDITOR'),
  }))

  return res.status(200).json(
    new ApiResponse(200, 'Projects fetched Successfully', {
      projects: sanitizedProjects,
    })
  )
}

const getProject = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user
  if (!user) {
    // This will catch any case where middleware fails or user is not found
    return next(new ApiError(401, 'User not authenticated'))
  }

  const { projectId } = req.params
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
    },
  })

  if (!project) {
    return next(new ApiError(400, 'Project not found'))
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, 'Project fetched Successfully', { project: project })
    )
}

const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user
  if (!user) {
    // This will catch any case where middleware fails or user is not found
    return next(new ApiError(401, 'User not authenticated'))
  }

  const { projectId } = req.params
  await prisma.project.delete({
    where: {
      id: projectId,
    },
  })

  return res
    .status(200)
    .json(new ApiResponse(200, 'Project Deleted Successfully', {}))
}

const createApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user
  if (!user) {
    // This will catch any case where middleware fails or user is not found
    return next(new ApiError(401, 'User not authenticated'))
  }

  const { name } = req.body || {}
  const { projectId } = req.params

  if (!projectId) {
    return next(new ApiError(404, 'ProjectId is Missing'))
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

  const apiKeyString = `sk_live_${crypto.randomBytes(32).toString('hex')}`
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKeyString)
    .digest('hex')

  const createdKey = await prisma.apiKey.create({
    data: {
      name: name || 'Default Key',
      key: hashedKey,
      projectId: project.id,
    },
    select: {
      id: true,
      name: true,
      key: true,
      createdAt: true,
      lastUsedAt: true,
      projectId: true,
    },
  })

  return res.status(201).json(
    new ApiResponse(201, 'Api Key generated Successfully', {
      apiKey: apiKeyString,
      key: createdKey,
    })
  )
}

const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = req.project! // From authorizeProjectAccess middleware
  const { projectId } = req.params

  const { name, branding, allowedOrigins, webhookUrl } = req.body

  const dataToUpdate: { [key: string]: any } = {}

  if (name !== undefined) dataToUpdate.name = name
  if (branding !== undefined) dataToUpdate.branding = branding
  if (allowedOrigins !== undefined) dataToUpdate.allowedOrigins = allowedOrigins
  if (webhookUrl !== undefined) dataToUpdate.webhookUrl = webhookUrl

  // Ensure at least one field is being updated
  if (Object.keys(dataToUpdate).length === 0) {
    return next(
      new ApiError(400, 'Please provide at least one field to update.')
    )
  }

  const updatedProject = await prisma.project.update({
    where: {
      id_ownerId: {
        id: projectId,
        ownerId: project.ownerId,
      },
    },
    data: dataToUpdate,
  })

  return res.status(200).json(
    new ApiResponse(200, 'Project updated successfully', {
      project: updatedProject,
    })
  )
}

const getApiKeys = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user
  if (!user) {
    return next(new ApiError(401, 'User not authenticated'))
  }

  const { projectId } = req.params
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: {
      id: true,
      publishableKey: true,
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!project) {
    return next(new ApiError(403, "Forbidden: You don't own this project."))
  }

  const secretKeys = await prisma.apiKey.findMany({
    where: {
      projectId: project.id,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      projectId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return res.status(200).json(
    new ApiResponse(200, 'Api Keys fetched Successfully', {
      secretKeys: secretKeys,
      publishableKey: project.publishableKey,
      owner: {
        name: project.owner?.name,
        email: project.owner?.email,
      },
    })
  )
}

const revokeApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user
  if (!user) {
    return next(new ApiError(401, 'User not authenticated'))
  }

  const { projectId } = req.params
  const { keyId } = req.params

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
    },
  })

  if (!project) {
    return next(new ApiError(403, "Forbidden: You don't own this project."))
  }

  try {
    await prisma.apiKey.delete({
      where: {
        id_projectId: {
          id: keyId,
          projectId: project.id,
        },
      },
    })
  } catch (error) {
    return next(new ApiError(404, 'API key not found for this project'))
  }

  return res
    .status(204)
    .json(new ApiResponse(204, 'Api Key Revoked Successfully', {}))
}

const createEndUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project
    if (!project) {
      return next(new ApiError(401, 'Unauthorized: Project not found.'))
    }

    const { email, externalId, password, name, metadata, status } = req.body
    const endUserStatus = normalizeEndUserStatus(status) || 'ACTIVE'

    if (!END_USER_STATUSES.includes(endUserStatus)) {
      return next(new ApiError(400, 'Status must be either ACTIVE or BANNED.'))
    }

    if (project.authMode === 'MANAGED') {
      if (!email || !password) {
        return next(
          new ApiError(
            400,
            'Email and password are required for managed projects.'
          )
        )
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return next(new ApiError(400, 'Invalid email format'))
      }

      if (String(password).length < 8) {
        return next(
          new ApiError(400, 'Password must be at least 8 characters.')
        )
      }

      const existingEndUser = await prisma.endUser.findUnique({
        where: {
          projectId_email: {
            projectId: project.id,
            email,
          },
        },
      })

      if (existingEndUser) {
        return next(new ApiError(409, 'User already exists in this project'))
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const createdEndUser = await prisma.$transaction(async (tx) => {
        const endUser = await tx.endUser.create({
          data: {
            projectId: project.id,
            email,
            status: endUserStatus,
          },
        })

        await tx.managedUser.create({
          data: {
            endUserId: endUser.id,
            name,
            password: hashedPassword,
          },
        })

        return endUser
      })

      const endUserWithRelations = await prisma.endUser.findUnique({
        where: { id: createdEndUser.id },
        include: {
          managedUser: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              progress: true,
            },
          },
        },
      })

      return res.status(201).json(
        new ApiResponse(201, 'End user created successfully', {
          endUser: endUserWithRelations,
        })
      )
    }

    // Delegated projects
    if (!externalId) {
      return next(
        new ApiError(400, 'externalId is required for delegated projects.')
      )
    }

    const validMetadata =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata
        : undefined

    if (metadata && !validMetadata) {
      return next(new ApiError(400, 'metadata must be an object.'))
    }

    const existingDelegatedUser = await prisma.endUser.findUnique({
      where: {
        projectId_externalId: {
          projectId: project.id,
          externalId,
        },
      },
    })

    if (existingDelegatedUser) {
      return next(new ApiError(409, 'User already exists in this project'))
    }

    const delegatedEndUser = await prisma.endUser.create({
      data: {
        projectId: project.id,
        externalId,
        email,
        status: endUserStatus,
        delegatedUser: {
          create: {
            ...(validMetadata !== undefined && { metadata: validMetadata }),
          },
        },
      },
      include: {
        delegatedUser: true,
        _count: {
          select: {
            enrollments: true,
            progress: true,
          },
        },
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'End user created successfully', {
        endUser: delegatedEndUser,
      })
    )
  } catch (error) {
    console.error('[CREATE_END_USER_ERROR]', error)
    return next(new ApiError(500, 'Failed to create end user'))
  }
}

const getEndUsers = async (req: Request, res: Response, next: NextFunction) => {
  const project = req.project!
  const { page = 1, limit = 20, search } = req.query

  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    projectId: project.id,
    ...(search && {
      OR: [
        { email: { contains: String(search), mode: 'insensitive' as const } },
        {
          externalId: {
            contains: String(search),
            mode: 'insensitive' as const,
          },
        },
      ],
    }),
  }

  const [endUsers, total] = await Promise.all([
    prisma.endUser.findMany({
      where,
      include: {
        managedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        delegatedUser: {
          select: {
            id: true,
            metadata: true,
            lastSeenAt: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            progress: true,
          },
        },
      },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.endUser.count({ where }),
  ])

  return res.status(200).json(
    new ApiResponse(200, 'End users fetched successfully', {
      endUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    })
  )
}

const updateApiKeyName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user
  if (!user) {
    return next(new ApiError(401, 'User not authenticated'))
  }

  const { projectId, keyId } = req.params
  const { name } = req.body || {}

  if (!name || !String(name).trim()) {
    return next(new ApiError(400, 'Key name is required'))
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
  })

  if (!project) {
    return next(new ApiError(403, "Forbidden: You don't own this project."))
  }

  try {
    const apiKey = await prisma.apiKey.update({
      where: {
        id_projectId: {
          id: keyId,
          projectId: project.id,
        },
      },
      data: { name: String(name).trim() },
      select: {
        id: true,
        name: true,
        key: true,
        createdAt: true,
        lastUsedAt: true,
        projectId: true,
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Api Key updated successfully', {
        apiKey,
      })
    )
  } catch (error) {
    return next(new ApiError(404, 'API key not found for this project'))
  }
}

const getEndUser = async (req: Request, res: Response, next: NextFunction) => {
  const project = req.project!
  const { endUserId } = req.params

  const endUser = await prisma.endUser.findFirst({
    where: {
      id: endUserId,
      projectId: project.id,
    },
    include: {
      managedUser: {
        select: {
          id: true,
          name: true,
        },
      },
      delegatedUser: {
        select: {
          metadata: true,
          lastSeenAt: true,
        },
      },
      enrollments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              slug: true,
            },
          },
        },
      },
      progress: {
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          lastWatchedAt: 'desc',
        },
        take: 10,
      },
    },
  })

  if (!endUser) {
    return next(new ApiError(404, 'End user not found'))
  }

  return res.status(200).json(
    new ApiResponse(200, 'End user fetched successfully', {
      endUser,
    })
  )
}

const updateEndUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project!
    const { endUserId } = req.params
    const { status } = req.body

    const normalizedStatus = normalizeEndUserStatus(status)
    if (!normalizedStatus) {
      return next(new ApiError(400, 'Status must be either ACTIVE or BANNED.'))
    }

    const endUser = await prisma.endUser.findFirst({
      where: {
        id: endUserId,
        projectId: project.id,
      },
      include: {
        managedUser: true,
      },
    })

    if (!endUser) {
      return next(new ApiError(404, 'End user not found'))
    }

    const updatedEndUser = await prisma.endUser.update({
      where: { id: endUser.id },
      data: {
        status: normalizedStatus,
      },
      include: {
        managedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        delegatedUser: {
          select: {
            metadata: true,
            lastSeenAt: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            progress: true,
          },
        },
      },
    })

    if (normalizedStatus === 'BANNED' && endUser.managedUser?.id) {
      await prisma.managedUser.update({
        where: { id: endUser.managedUser.id },
        data: { refreshToken: null },
      })
    }

    return res.status(200).json(
      new ApiResponse(200, 'End user status updated successfully', {
        endUser: updatedEndUser,
      })
    )
  } catch (error) {
    console.error('[UPDATE_END_USER_STATUS_ERROR]', error)
    return next(new ApiError(500, 'Failed to update end user status'))
  }
}

const deleteEndUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = req.project!
  const { endUserId } = req.params

  const endUser = await prisma.endUser.findFirst({
    where: {
      id: endUserId,
      projectId: project.id,
    },
  })

  if (!endUser) {
    return next(new ApiError(404, 'End user not found'))
  }

  await prisma.endUser.delete({
    where: { id: endUserId },
  })

  return res
    .status(200)
    .json(new ApiResponse(200, 'End user deleted successfully', {}))
}

// Analytics overview
const getAnalyticsOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = req.project!

  const [
    totalCourses,
    totalEndUsers,
    totalEnrollments,
    activeEnrollments,
    totalApiKeys,
  ] = await Promise.all([
    prisma.course.count({ where: { projectId: project.id } }),
    prisma.endUser.count({ where: { projectId: project.id } }),
    prisma.enrollment.count({
      where: {
        course: { projectId: project.id },
      },
    }),
    prisma.enrollment.count({
      where: {
        course: { projectId: project.id },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
    prisma.apiKey.count({ where: { projectId: project.id } }),
  ])

  return res.status(200).json(
    new ApiResponse(200, 'Analytics fetched successfully', {
      analytics: {
        totalCourses,
        totalEndUsers,
        totalEnrollments,
        activeEnrollments,
        totalApiKeys,
      },
    })
  )
}

// GET Settings (Masked)
export const getPaymentSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project!

    const keys = await prisma.project.findUnique({
      where: { id: project.id },
      select: { razorpayKeyId: true, razorpayKeySecret: true },
    })

    if (!keys) throw new ApiError(404, 'Project not found')

    return res.json(
      new ApiResponse(200, 'Settings fetched', {
        keyId: keys.razorpayKeyId,
        isConfigured: !!keys.razorpayKeySecret, // Returns true/false only
      })
    )
  } catch (error) {
    next(error)
  }
}

// UPDATE Settings (Test & Encrypt)
export const updatePaymentSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project!
    const { keyId, keySecret } = req.body

    if (!keyId || !keySecret) {
      throw new ApiError(400, 'Key ID and Secret are required')
    }

    // 1. 🧪 TEST CREDENTIALS FIRST
    try {
      const testInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })
      await testInstance.orders.all({ count: 1 }) // Lightweight verification call
    } catch (e) {
      throw new ApiError(
        400,
        'Invalid Razorpay Credentials. Please check and try again.'
      )
    }

    // 2. 🔒 ENCRYPT & SAVE
    const encryptedSecret = encrypt(keySecret)

    await prisma.project.update({
      where: { id: project.id },
      data: {
        razorpayKeyId: keyId,
        razorpayKeySecret: encryptedSecret,
      },
    })

    return res.json(
      new ApiResponse(200, 'Payment settings updated successfully', {})
    )
  } catch (error) {
    next(error)
  }
}
export {
  createApiKey,
  createProject,
  createEndUser,
  getProject,
  getProjects,
  deleteProject,
  updateProject,
  revokeApiKey,
  updateApiKeyName,
  getApiKeys,
  getEndUsers,
  getEndUser,
  updateEndUserStatus,
  deleteEndUser,
  getAnalyticsOverview,
}
