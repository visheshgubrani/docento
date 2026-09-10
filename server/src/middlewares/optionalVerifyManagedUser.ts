// middleware/optionalVerifyManagedUser.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

interface EndUserJwtPayload extends jwt.JwtPayload {
  userId: string
  projectId: string
}

export const optionalVerifyManagedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies?.authToken ||
      req.headers.authorization?.replace('Bearer ', '')

    // 1. IF NO TOKEN: Just continue as "Guest"
    if (!token) {
      req.endUser = undefined // Explicitly set to undefined
      return next()
    }

    // 2. IF TOKEN EXISTS: Try to verify it
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as EndUserJwtPayload

    const endUser = await prisma.endUser.findUnique({
      where: { id: payload.userId },
      include: { project: true }, // We might not need managedUser for just playing video
    })

    if (endUser && endUser.projectId === payload.projectId) {
      req.endUser = endUser
      req.project = endUser.project
    }

    // Even if token is invalid or user not found, we continue.
    // The next middleware (authorizeLessonAccess) will decide if that's a problem.
    next()
  } catch (error) {
    // If token is expired/invalid, just treat them as a guest
    req.endUser = undefined
    next()
  }
}
