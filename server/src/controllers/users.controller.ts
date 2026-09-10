import { Request, Response, NextFunction } from 'express'
import type { CookieOptions } from 'express'
import ApiError from '../utils/ApiError'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import ApiResponse from '../utils/ApiResponse'
import crypto from 'crypto'

const isProduction = process.env.NODE_ENV === 'production'
const cookieSameSite: CookieOptions['sameSite'] = isProduction ? 'none' : 'lax'
const buildCookieOptions = (overrides: CookieOptions = {}): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite,
  path: '/',
  ...overrides,
})

const signupManagedUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = req.project
  if (!project) {
    return next(new ApiError(401, 'API key did not resolve to a project.'))
  }

  if (project.authMode !== 'MANAGED') {
    return next(
      new ApiError(
        403, // 403 Forbidden is the correct code here.
        'This project is configured for delegated authentication and cannot create managed users.'
      )
    )
  }
  const { email, password, name } = req.body

  if (!email || !password) {
    return next(new ApiError(404, 'Email and Password are required'))
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return next(new ApiError(400, 'Invalid email format'))
  }

  if (password.length < 8) {
    return next(new ApiError(400, 'Password must be at least 8 characters'))
  }

  const existingEndUser = await prisma.endUser.findUnique({
    where: {
      projectId_email: {
        projectId: project.id,
        email: email,
      },
    },
  })

  if (existingEndUser)
    return next(new ApiError(409, 'User already exists in this project'))

  const hashedPasword = await bcrypt.hash(password, 10)

  const newEndUser = await prisma.$transaction(async (tx) => {
    const endUser = await tx.endUser.create({
      data: {
        projectId: project.id,
        email: email,
      },
    })

    await tx.managedUser.create({
      data: {
        name: name,
        password: hashedPasword,
        endUserId: endUser.id,
      },
    })
    return endUser
  })

  const token = jwt.sign(
    { userId: newEndUser.id, projectId: project.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  res.cookie(
    'authToken',
    token,
    buildCookieOptions({
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    })
  )

  return res.status(201).json(
    new ApiResponse(201, 'User registered successfully', {
      user: {
        id: newEndUser.id,
        email: newEndUser.email,
        projectId: newEndUser.projectId,
      },
      token: token,
    })
  )
}

const loginManagedUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = req.project
  if (!project) {
    return next(new ApiError(401, 'API key did not resolve to a project.'))
  }

  if (project.authMode !== 'MANAGED') {
    return next(
      new ApiError(
        403, // 403 Forbidden is the correct code here.
        'This project is configured for delegated authentication and cannot create managed users.'
      )
    )
  }

  const { email, password } = req.body
  if (!email || !password) {
    return next(new ApiError(404, 'Email and Password are required to login'))
  }

  const endUser = await prisma.endUser.findUnique({
    where: {
      projectId_email: {
        projectId: project.id,
        email: email,
      },
    },
    include: {
      managedUser: true,
    },
  })

  if (!endUser || !endUser.managedUser) {
    return next(new ApiError(401, 'Invalid email or password.'))
  }

  if (endUser.status === 'BANNED') {
    return next(
      new ApiError(
        403,
        'This account has been banned. Please contact support for help.'
      )
    )
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    endUser.managedUser.password
  )

  if (!isPasswordCorrect) {
    return next(new ApiError(400, 'Wrong Password'))
  }

  const accessToken = jwt.sign(
    { userId: endUser.id, projectId: project.id, role: 'EndUser' },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  )

  const refreshToken = jwt.sign(
    { userId: endUser.id },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: '7d' }
  )

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10)
  await prisma.managedUser.update({
    where: {
      id: endUser.managedUser.id,
    },
    data: {
      refreshToken: hashedRefreshToken,
    },
  })

  res
    .cookie(
      'authToken',
      accessToken,
      buildCookieOptions({
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      })
    )
    .cookie(
      'refreshToken',
      refreshToken,
      buildCookieOptions({
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
    )

  return res.status(200).json(
    new ApiResponse(200, 'User loggedIn Sucessfully', {
      user: {
        id: endUser.id,
        email: endUser.email,
        name: endUser.managedUser.name,
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
    })
  )
}

const signOutManagedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const cookieName = 'authToken'
  res.clearCookie(cookieName, buildCookieOptions())
  res.clearCookie('refreshToken', buildCookieOptions())

  return res
    .status(200)
    .json(new ApiResponse(200, 'Successfully signed out', {}))
}

const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    return next(new ApiError(401, 'Unauthorized: Refresh token is missing.'))
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET!
  ) as jwt.JwtPayload

  const managedUser = await prisma.managedUser.findFirst({
    where: { endUserId: decodedToken.userId },
    include: {
      endUser: true,
    },
  })

  if (!managedUser || !managedUser.refreshToken || !managedUser.endUser) {
    return next(new ApiError(401, 'Unauthorized: Invalid refresh token.'))
  }

  const isTokenValid = await bcrypt.compare(
    incomingRefreshToken,
    managedUser.refreshToken
  )
  if (!isTokenValid) {
    return next(new ApiError(401, 'Unauthorized: Invalid refresh token.'))
  }

  if (managedUser.endUser.status === 'BANNED') {
    return next(
      new ApiError(
        403,
        'This account has been banned. Please contact support for help.'
      )
    )
  }

  const newAccessToken = jwt.sign(
    {
      userId: managedUser.endUserId,
      projectId: managedUser.endUser.projectId,
      role: 'EndUser',
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  )

  res.cookie(
    'authToken',
    newAccessToken,
    buildCookieOptions({
      maxAge: 15 * 60 * 1000,
    })
  )

  return res.status(200).json(
    new ApiResponse(200, 'Access token refreshed successfully.', {
      accessToken: newAccessToken,
    })
  )
}

// Step 1: Request password reset (managed users only)
const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = req.project
    const { email } = req.body

    if (!project) {
      return next(new ApiError(401, 'API key did not resolve to a project.'))
    }

    if (project.authMode !== 'MANAGED') {
      return next(
        new ApiError(
          403,
          'Password reset is only available for managed auth projects.'
        )
      )
    }

    if (!email) {
      return next(new ApiError(400, 'Email is required'))
    }

    const endUser = await prisma.endUser.findUnique({
      where: {
        projectId_email: {
          projectId: project.id,
          email,
        },
      },
      include: { managedUser: true },
    })

    // Do not leak whether the email exists
    if (!endUser || !endUser.managedUser) {
      return res.status(200).json(
        new ApiResponse(200, 'If the account exists, a reset link was created', {
          resetToken: isProduction ? undefined : null,
        })
      )
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const identifier = `password-reset:${endUser.id}`
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await prisma.$transaction(async (tx) => {
      await tx.verification.deleteMany({ where: { identifier } })
      await tx.verification.create({
        data: {
          id: crypto.randomUUID
            ? crypto.randomUUID()
            : crypto.randomBytes(16).toString('hex'),
          identifier,
          value: tokenHash,
          expiresAt,
        },
      })
    })

    return res.status(200).json(
      new ApiResponse(200, 'Password reset token created', {
        // Return token for MVP/dev testing; in production you would email it
        resetToken: isProduction ? undefined : rawToken,
        expiresAt,
      })
    )
  } catch (error) {
    console.error('[REQUEST_PASSWORD_RESET_ERROR]', error)
    next(error)
  }
}

// Step 2: Reset password using token
const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return next(new ApiError(400, 'Token and newPassword are required'))
    }

    if (newPassword.length < 8) {
      return next(
        new ApiError(400, 'Password must be at least 8 characters long')
      )
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const verification = await prisma.verification.findFirst({
      where: {
        value: tokenHash,
        expiresAt: { gt: new Date() },
      },
    })

    if (!verification) {
      return next(new ApiError(400, 'Invalid or expired reset token'))
    }

    const [, endUserId] = verification.identifier.split(':')
    if (!endUserId) {
      return next(new ApiError(400, 'Invalid reset token payload'))
    }

    const managedUser = await prisma.managedUser.findUnique({
      where: { endUserId },
      include: { endUser: true },
    })

    if (!managedUser || !managedUser.endUser) {
      return next(new ApiError(400, 'User not found for this token'))
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.$transaction(async (tx) => {
      await tx.managedUser.update({
        where: { endUserId },
        data: { password: hashedPassword, refreshToken: null },
      })

      await tx.verification.deleteMany({
        where: { identifier: verification.identifier },
      })
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Password has been reset successfully', {}))
  } catch (error) {
    console.error('[RESET_PASSWORD_ERROR]', error)
    next(error)
  }
}

const handleDelegatedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
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
          'Forbidden: This project is not configured for delegated authentication.'
        )
      )
    }

    const userMetadata = req.body.metadata || {}

    if (userMetadata && typeof userMetadata !== 'object') {
      return next(new ApiError(400, 'metadata must be an object.'))
    }

    const existingEndUser = await prisma.endUser.findUnique({
      where: {
        projectId_externalId: {
          projectId: project.id,
          externalId: externalUserId,
        },
      },
      include: { delegatedUser: true },
    })

    if (existingEndUser?.status === 'BANNED') {
      return next(
        new ApiError(
          403,
          'This user is banned from accessing this project.'
        )
      )
    }

    const endUser = await prisma.$transaction(async (tx) => {
      if (existingEndUser) {
        if (existingEndUser.delegatedUser) {
          await tx.delegatedUser.update({
            where: { id: existingEndUser.delegatedUser.id },
            data: { metadata: userMetadata, lastSeenAt: new Date() },
          })
        } else {
          await tx.delegatedUser.create({
            data: {
              endUserId: existingEndUser.id,
              metadata: userMetadata,
            },
          })
        }

        return tx.endUser.findUnique({
          where: { id: existingEndUser.id },
          include: { delegatedUser: true },
        })
      }

      return tx.endUser.create({
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
    })

    if (!endUser) {
      return next(new ApiError(500, 'Unable to resolve delegated user'))
    }

    req.endUser = endUser
    next()
  } catch (error) {
    console.error('[DELEGATED_USER_ERROR]', error)
    return next(new ApiError(500, 'Internal server error'))
  }
}

const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.endUser!
  const userProfile = await prisma.endUser.findFirst({
    where: {
      id: user.id,
    },
    include: {
      managedUser: {
        select: {
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
        orderBy: {
          enrolledAt: 'desc',
        },
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
    },
  })

  if (!userProfile) {
    return next(new ApiError(404, 'User profile not found.'))
  }

  return res.status(200).json(
    new ApiResponse(200, 'User Fetched Successfully', {
      profile: userProfile,
    })
  )
}

export {
  signupManagedUsers,
  handleDelegatedUser,
  loginManagedUsers,
  signOutManagedUser,
  refreshAccessToken,
  getProfile,
  requestPasswordReset,
  resetPassword,
}
