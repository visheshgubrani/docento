import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'

// Interface for your JWT (ensure this matches your login controller)
interface EndUserJwtPayload {
  userId: string
  projectId: string
  role: string
  // type: 'MANAGED' | 'DELEGATED' // Optional: if you track this
}

export const verifyStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract Token
    const token =
      req.cookies?.authToken ||
      req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new ApiError(401, 'Unauthorized: Please login first.'))
    }

    // 2. Verify Signature
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as EndUserJwtPayload

    // 3. Find Generic EndUser (Don't care about Managed vs Delegated here)
    const endUser = await prisma.endUser.findUnique({
      where: { id: payload.userId },
      include: {
        project: true,
      },
    })

    if (!endUser) {
      return next(new ApiError(401, 'Unauthorized: User does not exist.'))
    }

    // 4. Check Ban Status
    if (endUser.status === 'BANNED') {
      return next(new ApiError(403, 'Your account has been suspended.'))
    }

    // 5. Check Project Scope (Security)
    // Ensures a student from Project A can't buy courses in Project B with the same token
    if (endUser.projectId !== payload.projectId) {
      return next(new ApiError(401, 'Unauthorized: Invalid project scope.'))
    }

    // 6. Attach to Request
    req.endUser = endUser
    req.project = endUser.project

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError)
      return next(new ApiError(401, 'Session expired.'))
    if (error instanceof jwt.JsonWebTokenError)
      return next(new ApiError(401, 'Invalid token.'))
    next(error)
  }
}
