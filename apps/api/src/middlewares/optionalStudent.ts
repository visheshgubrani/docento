import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

interface EndUserJwtPayload {
  userId: string
  projectId: string
  role: string
}

export const optionalStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // extract the token
    const token =
      req.cookies?.authToken ||
      req.headers.authorization?.replace('Bearer ', '')

    // if they dont have token, they are a guest, pass them thorugh
    if (!token) {
      return next()
    }

    // verify signature
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as EndUserJwtPayload

    // find the user
    const endUser = await prisma.endUser.findUnique({
      where: { id: payload.userId },
      include: {
        project: true,
      },
    })

    const apiKeyProjectId = req.project?.id

    // validate user scope
    // If user not found, banned, wrong JWT scope, or mismatched API key project -> treat as guest
    if (
      !endUser ||
      endUser.status === 'BANNED' ||
      endUser.projectId !== payload.projectId ||
      (apiKeyProjectId && endUser.projectId !== apiKeyProjectId)
    ) {
      return next()
    }

    req.endUser = endUser
    next()
  } catch (error) {
    next()
  }
}
