import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import jwt from 'jsonwebtoken'

export const delegatedLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Auth Check (Done by previous middleware: authorizeProjectAccess)
    const project = req.project!

    // 2. Input Validation
    const { userId: externalUserId, metadata } = req.body

    if (!externalUserId) {
      throw new ApiError(400, 'Missing userId in body.')
    }

    if (project.authMode !== 'DELEGATED') {
      throw new ApiError(
        403,
        'This project is not configured for delegated auth.',
      )
    }

    const validMetadata =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata
        : undefined

    if (metadata && !validMetadata) {
      throw new ApiError(400, 'metadata must be an object.')
    }

    // 3. Find or Create User (Your Logic Refined)
    // We use a transaction to ensure atomic upsert
    const endUser = await prisma.$transaction(async (tx) => {
      // A. Try to find existing
      const existingUser = await tx.endUser.findUnique({
        where: {
          projectId_externalId: {
            projectId: project.id,
            externalId: externalUserId,
          },
        },
      })

      if (existingUser) {
        if (existingUser.status === 'BANNED') {
          throw new ApiError(403, 'User is banned.')
        }

        // B. Update Metadata
        await tx.delegatedUser.update({
          where: { endUserId: existingUser.id },
          data: {
            metadata: validMetadata || {},
            lastSeenAt: new Date(),
          },
        })

        return existingUser
      }

      // C. Create New User
      return tx.endUser.create({
        data: {
          projectId: project.id,
          externalId: externalUserId,
          // We assume delegated users are auto-verified
          delegatedUser: {
            create: {
              metadata: validMetadata || {},
            },
          },
        },
      })
    })

    // 4. 🔑 GENERATE SESSION TOKEN
    // This is the magic. We verify this token later using 'verifyStudent'
    const token = jwt.sign(
      {
        userId: endUser.id,
        projectId: project.id,
        role: 'STUDENT',
        type: 'DELEGATED',
      },
      process.env.JWT_SECRET!, // Use SAME secret as Managed Users
      { expiresIn: '7d' },
    )

    // 5. Return Token to Client Backend
    return res.status(200).json(
      new ApiResponse(200, 'Handshake successful', {
        accessToken: token,
        user: {
          id: endUser.id,
          externalId: externalUserId,
        },
      }),
    )
  } catch (error) {
    next(error)
  }
}
