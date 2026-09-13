import { InvitationStatus } from '../generated/prisma'
import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import { sendProjectInvitationEmail } from '../utils/email'

const INVITATION_EXPIRY_DAYS = 7
const INVITABLE_ROLES = ['EDITOR'] as const
type InvitableRole = (typeof INVITABLE_ROLES)[number]

const expirePendingInvitation = async (invitationId: string) => {
  const now = new Date()
  await prisma.projectInvitation.updateMany({
    where: {
      id: invitationId,
      status: InvitationStatus.PENDING,
    },
    data: {
      status: InvitationStatus.EXPIRED,
      respondedAt: now,
    },
  })
}

/**
 * Invite a user to a project.
 * Always creates or refreshes a pending invitation, even for existing accounts.
 */
export const inviteToProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!
    const inviter = req.user!
    const { email, role = 'EDITOR' } = req.body

    if (!email) {
      return next(new ApiError(400, 'Email is required'))
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return next(new ApiError(400, 'Invalid email format'))
    }

    const normalizedRole = String(role).toUpperCase() as InvitableRole
    if (!INVITABLE_ROLES.includes(normalizedRole)) {
      return next(
        new ApiError(400, 'Only EDITOR role is supported for invitations'),
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const projectOwner = await prisma.user.findUnique({
      where: { id: project.ownerId },
      select: { email: true },
    })

    if (projectOwner && projectOwner.email.toLowerCase() === normalizedEmail) {
      return next(new ApiError(400, 'Cannot invite the project owner'))
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    })

    if (existingUser) {
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: existingUser.id,
          },
        },
      })

      if (existingMember) {
        return next(
          new ApiError(409, 'User is already a member of this project'),
        )
      }
    }

    const existingInvitation = await prisma.projectInvitation.findUnique({
      where: {
        projectId_email: {
          projectId: project.id,
          email: normalizedEmail,
        },
      },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

    const invitation = existingInvitation
      ? await prisma.projectInvitation.update({
          where: { id: existingInvitation.id },
          data: {
            token,
            role: normalizedRole,
            status: InvitationStatus.PENDING,
            expiresAt,
            respondedAt: null,
            acceptedAt: null,
            rejectedAt: null,
            revokedAt: null,
          },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        })
      : await prisma.projectInvitation.create({
          data: {
            email: normalizedEmail,
            projectId: project.id,
            role: normalizedRole,
            status: InvitationStatus.PENDING,
            token,
            expiresAt,
          },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        })

    await sendProjectInvitationEmail({
      email: normalizedEmail,
      projectName: project.name,
      inviterName: inviter.name || inviter.email,
      role: normalizedRole,
      token,
      expiresAt,
      accountExists: !!existingUser,
    })

    const statusCode = existingInvitation ? 200 : 201
    const message = existingInvitation
      ? 'Invitation re-sent successfully'
      : 'Invitation sent successfully'

    return res.status(statusCode).json(
      new ApiResponse(statusCode, message, {
        invitation,
        type: 'invitation',
      }),
    )
  } catch (error) {
    console.error('[INVITE_TO_PROJECT_ERROR]', error)
    return next(new ApiError(500, 'Failed to send invitation'))
  }
}

/**
 * Accept a project invitation using secure token.
 * Requires authenticated dashboard user and matching invitation email.
 */
export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user!
    const { token } = req.body || {}

    if (!token || typeof token !== 'string') {
      return next(new ApiError(400, 'Invitation token is required'))
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token: token.trim() },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    })

    if (!invitation) {
      return next(new ApiError(404, 'Invitation is invalid or does not exist'))
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      return next(new ApiError(410, 'Invitation has been revoked'))
    }

    if (invitation.status === InvitationStatus.REJECTED) {
      return next(new ApiError(409, 'Invitation has already been rejected'))
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      return next(new ApiError(409, 'Invitation has already been accepted'))
    }

    if (invitation.status === InvitationStatus.EXPIRED) {
      return next(new ApiError(410, 'Invitation has expired'))
    }

    if (invitation.expiresAt <= new Date()) {
      await expirePendingInvitation(invitation.id)
      return next(new ApiError(410, 'Invitation has expired'))
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return next(
        new ApiError(403, 'This invitation is for a different email address'),
      )
    }

    if (invitation.project.ownerId === user.id) {
      const now = new Date()
      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          respondedAt: now,
          acceptedAt: now,
          rejectedAt: null,
          revokedAt: null,
        },
      })

      return res.status(200).json(
        new ApiResponse(200, 'You already own this project', {
          role: 'OWNER',
          projectId: invitation.project.id,
        }),
      )
    }

    const member = await prisma.$transaction(async (tx) => {
      const existingMember = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId: user.id,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      const memberRecord =
        existingMember ||
        (await tx.projectMember.create({
          data: {
            projectId: invitation.projectId,
            userId: user.id,
            role: invitation.role,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        }))

      const now = new Date()
      await tx.projectInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          respondedAt: now,
          acceptedAt: now,
          rejectedAt: null,
          revokedAt: null,
        },
      })

      return memberRecord
    })

    return res.status(200).json(
      new ApiResponse(200, 'Invitation accepted successfully', {
        member,
        project: {
          id: invitation.project.id,
          name: invitation.project.name,
        },
      }),
    )
  } catch (error) {
    console.error('[ACCEPT_INVITATION_ERROR]', error)
    return next(new ApiError(500, 'Failed to accept invitation'))
  }
}

/**
 * Reject a project invitation using secure token.
 * Requires authenticated dashboard user and matching invitation email.
 */
export const rejectInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user!
    const { token } = req.body || {}

    if (!token || typeof token !== 'string') {
      return next(new ApiError(400, 'Invitation token is required'))
    }

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token: token.trim() },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      return next(new ApiError(404, 'Invitation is invalid or does not exist'))
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      return next(new ApiError(409, 'Invitation has already been accepted'))
    }

    if (invitation.status === InvitationStatus.REJECTED) {
      return res.status(200).json(
        new ApiResponse(200, 'Invitation already rejected', {
          project: {
            id: invitation.project.id,
            name: invitation.project.name,
          },
        }),
      )
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      return next(new ApiError(410, 'Invitation has been revoked'))
    }

    if (invitation.status === InvitationStatus.EXPIRED) {
      return next(new ApiError(410, 'Invitation has expired'))
    }

    if (invitation.expiresAt <= new Date()) {
      await expirePendingInvitation(invitation.id)
      return next(new ApiError(410, 'Invitation has expired'))
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return next(
        new ApiError(403, 'This invitation is for a different email address'),
      )
    }

    const now = new Date()
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: now,
        acceptedAt: null,
        rejectedAt: now,
        revokedAt: null,
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Invitation rejected successfully', {
        project: {
          id: invitation.project.id,
          name: invitation.project.name,
        },
      }),
    )
  } catch (error) {
    console.error('[REJECT_INVITATION_ERROR]', error)
    return next(new ApiError(500, 'Failed to reject invitation'))
  }
}

/**
 * Get all members and pending invitations for a project.
 */
export const getProjectMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!
    const now = new Date()

    await prisma.projectInvitation.updateMany({
      where: {
        projectId: project.id,
        status: InvitationStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: {
        status: InvitationStatus.EXPIRED,
        respondedAt: now,
      },
    })

    const [members, invitations] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId: project.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.projectInvitation.findMany({
        where: {
          projectId: project.id,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: now },
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const owner = await prisma.user.findUnique({
      where: { id: project.ownerId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Project members fetched successfully', {
        owner: { ...owner, role: 'OWNER' },
        members,
        invitations,
      }),
    )
  } catch (error) {
    console.error('[GET_PROJECT_MEMBERS_ERROR]', error)
    return next(new ApiError(500, 'Failed to fetch project members'))
  }
}

/**
 * Remove a member from a project.
 */
export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!
    const { memberId } = req.params

    const member = await prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId: project.id,
      },
    })

    if (!member) {
      return next(new ApiError(404, 'Member not found'))
    }

    await prisma.projectMember.delete({
      where: { id: memberId },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Member removed successfully', {}))
  } catch (error) {
    console.error('[REMOVE_MEMBER_ERROR]', error)
    return next(new ApiError(500, 'Failed to remove member'))
  }
}

/**
 * Revoke a pending invitation.
 */
export const revokeInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = req.project!
    const { invitationId } = req.params

    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        id: invitationId,
        projectId: project.id,
      },
    })

    if (!invitation) {
      return next(new ApiError(404, 'Invitation not found'))
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      return res
        .status(200)
        .json(new ApiResponse(200, 'Invitation already revoked', {}))
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return next(new ApiError(409, 'Only pending invitations can be revoked'))
    }

    if (invitation.expiresAt <= new Date()) {
      await expirePendingInvitation(invitation.id)
      return next(new ApiError(410, 'Invitation has expired'))
    }

    const now = new Date()
    await prisma.projectInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REVOKED,
        respondedAt: now,
        acceptedAt: null,
        rejectedAt: null,
        revokedAt: now,
      },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Invitation revoked successfully', {}))
  } catch (error) {
    console.error('[REVOKE_INVITATION_ERROR]', error)
    return next(new ApiError(500, 'Failed to revoke invitation'))
  }
}
