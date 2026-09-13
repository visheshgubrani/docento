// controllers/assignment.controller.ts
import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import path from 'path'
import { z } from 'zod'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '../lib/prisma'
import { getR2Client, getR2PublicBaseUrl } from '../lib/r2'
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'

const assignmentUploadSchema = z.object({
  contentType: z.string().trim().min(1, 'contentType is required'),
  fileName: z.string().trim().min(1).max(255).optional(),
})

const allowedAssignmentContentTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
])

const contentTypeToExtension: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'text/plain': '.txt',
  'application/rtf': '.rtf',
  'application/vnd.oasis.opendocument.text': '.odt',
}

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .toLowerCase()

const resolveSubmissionExtension = (
  fileName: string | undefined,
  contentType: string,
) => {
  const extFromName = fileName ? path.extname(sanitizeFileName(fileName)) : ''
  if (extFromName) return extFromName.toLowerCase()
  return contentTypeToExtension[contentType] || ''
}

const buildAssignmentSubmissionKey = (
  assignmentId: string,
  endUserId: string,
  fileName: string | undefined,
  contentType: string,
) => {
  const safeName = fileName ? sanitizeFileName(fileName) : ''
  const extension = resolveSubmissionExtension(fileName, contentType)
  const safeBase = safeName
    ? safeName.slice(0, safeName.length - path.extname(safeName).length)
    : 'submission'
  const uniqueId = crypto.randomUUID()
  return `assignments/${assignmentId}/submissions/${endUserId}/${safeBase}-${uniqueId}${extension}`
}

const isAllowedSubmissionFileUrl = (
  fileUrl: string,
  assignmentId: string,
  endUserId: string,
) => {
  const baseUrl = getR2PublicBaseUrl()
  if (!baseUrl) return true
  return fileUrl.startsWith(
    `${baseUrl}/assignments/${assignmentId}/submissions/${endUserId}/`,
  )
}

const hasSubmissionBeenGraded = (grade: number | null | undefined) =>
  grade !== null && grade !== undefined

// ===== ASSIGNMENT CRUD (One-to-One with Lesson) =====

// Get assignment for a lesson
export const getAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    const assignment = await prisma.assignment.findUnique({
      where: { lessonId: lesson.id },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Assignment fetched successfully', {
        assignment: assignment || null,
      }),
    )
  } catch (error) {
    console.error('[GET_ASSIGNMENT_ERROR]', error)
    next(error)
  }
}

// Get assignment for student lesson view
export const getAssignmentForStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!
    const { lessonId } = req.params

    const assignment = await prisma.assignment.findUnique({
      where: { lessonId },
      select: {
        id: true,
        lessonId: true,
        title: true,
        description: true,
        dueDate: true,
        totalPoints: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!assignment) {
      return next(new ApiError(404, 'No assignment found for this lesson'))
    }

    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_endUserId: {
          assignmentId: assignment.id,
          endUserId: endUser.id,
        },
      },
      select: {
        grade: true,
      },
    })

    const isSubmissionGraded = hasSubmissionBeenGraded(
      existingSubmission?.grade,
    )
    const canResubmit =
      !isSubmissionGraded &&
      (!assignment.dueDate || new Date() <= assignment.dueDate)

    return res.status(200).json(
      new ApiResponse(200, 'Assignment fetched successfully', {
        assignment,
        permissions: {
          canResubmit,
        },
      }),
    )
  } catch (error) {
    console.error('[GET_ASSIGNMENT_FOR_STUDENT_ERROR]', error)
    next(error)
  }
}

// Create assignment for a lesson
export const createAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const { title, description, dueDate, totalPoints } = req.body

    if (!title) {
      return next(new ApiError(400, 'Title is required'))
    }

    // Check if lesson already has an assignment (one-to-one)
    const existing = await prisma.assignment.findUnique({
      where: { lessonId: lesson.id },
    })

    if (existing) {
      return next(
        new ApiError(
          400,
          'This lesson already has an assignment. Use PATCH to update it.',
        ),
      )
    }

    if (totalPoints && totalPoints < 1) {
      return next(new ApiError(400, 'Total points must be at least 1'))
    }

    const assignment = await prisma.assignment.create({
      data: {
        lessonId: lesson.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        totalPoints: totalPoints || 100,
      },
    })

    return res.status(201).json(
      new ApiResponse(201, 'Assignment created successfully', {
        assignment,
      }),
    )
  } catch (error) {
    console.error('[CREATE_ASSIGNMENT_ERROR]', error)
    next(error)
  }
}

// Update assignment
export const updateAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const { title, description, dueDate, totalPoints } = req.body

    if (!title && !description && dueDate === undefined && !totalPoints) {
      return next(new ApiError(400, 'At least one field is required to update'))
    }

    const assignment = await prisma.assignment.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!assignment) {
      return next(new ApiError(404, 'No assignment found for this lesson'))
    }

    if (totalPoints && totalPoints < 1) {
      return next(new ApiError(400, 'Total points must be at least 1'))
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(totalPoints && { totalPoints }),
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Assignment updated successfully', {
        assignment: updated,
      }),
    )
  } catch (error) {
    console.error('[UPDATE_ASSIGNMENT_ERROR]', error)
    next(error)
  }
}

// Delete assignment
export const deleteAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!

    const assignment = await prisma.assignment.findUnique({
      where: { lessonId: lesson.id },
    })

    if (!assignment) {
      return next(new ApiError(404, 'No assignment found for this lesson'))
    }

    await prisma.assignment.delete({
      where: { id: assignment.id },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Assignment deleted successfully', {
        deleted: true,
      }),
    )
  } catch (error) {
    console.error('[DELETE_ASSIGNMENT_ERROR]', error)
    next(error)
  }
}

// ===== SUBMISSION MANAGEMENT =====

// Student gets a presigned URL for assignment upload
export const createAssignmentUploadPresign = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!
    const { lessonId } = req.params
    const parsed = assignmentUploadSchema.safeParse(req.body ?? {})

    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { contentType, fileName } = parsed.data
    if (!allowedAssignmentContentTypes.has(contentType)) {
      return next(
        new ApiError(
          400,
          'Unsupported contentType. Allowed: pdf, doc, docx, zip, txt, rtf, odt',
        ),
      )
    }

    const assignment = await prisma.assignment.findUnique({
      where: { lessonId },
    })

    if (!assignment) {
      return next(new ApiError(404, 'No assignment found for this lesson'))
    }

    if (assignment.dueDate && new Date() > assignment.dueDate) {
      return next(new ApiError(400, 'Submission deadline has passed'))
    }

    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_endUserId: {
          assignmentId: assignment.id,
          endUserId: endUser.id,
        },
      },
      select: {
        grade: true,
      },
    })

    if (hasSubmissionBeenGraded(existingSubmission?.grade)) {
      return next(
        new ApiError(
          409,
          'This assignment has already been graded and cannot be updated',
        ),
      )
    }

    const r2Client = getR2Client()
    const bucket = process.env.R2_BUCKET
    const publicBaseUrl = getR2PublicBaseUrl()

    if (!r2Client || !bucket) {
      return next(new ApiError(500, 'R2 storage is not configured'))
    }

    if (!publicBaseUrl) {
      return next(new ApiError(500, 'R2_PUBLIC_URL is not configured'))
    }

    const key = buildAssignmentSubmissionKey(
      assignment.id,
      endUser.id,
      fileName,
      contentType,
    )
    const fileUrl = `${publicBaseUrl}/${key}`

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        assignmentid: assignment.id,
        enduserid: endUser.id,
      },
    })

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 15 * 60,
    })

    return res.status(200).json(
      new ApiResponse(200, 'Assignment upload URL created', {
        presignedUrl,
        fileUrl,
        key,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        expiresIn: 900,
      }),
    )
  } catch (error) {
    console.error('[CREATE_ASSIGNMENT_UPLOAD_PRESIGN_ERROR]', error)
    next(error)
  }
}

// Student submits assignment
export const submitAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!
    const { lessonId } = req.params
    const { content, fileUrl } = req.body
    const normalizedContent =
      typeof content === 'string' && content.trim().length > 0
        ? content.trim()
        : null
    const normalizedFileUrl =
      typeof fileUrl === 'string' && fileUrl.trim().length > 0
        ? fileUrl.trim()
        : null

    if (
      fileUrl !== undefined &&
      fileUrl !== null &&
      typeof fileUrl !== 'string'
    ) {
      return next(new ApiError(400, 'fileUrl must be a string'))
    }

    if (!normalizedContent && !normalizedFileUrl) {
      return next(
        new ApiError(400, 'Either content (text) or fileUrl is required'),
      )
    }

    // Find the assignment for this lesson
    const assignment = await prisma.assignment.findUnique({
      where: { lessonId },
    })

    if (!assignment) {
      return next(new ApiError(404, 'No assignment found for this lesson'))
    }

    // Check due date
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      return next(new ApiError(400, 'Submission deadline has passed'))
    }

    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_endUserId: {
          assignmentId: assignment.id,
          endUserId: endUser.id,
        },
      },
    })

    if (hasSubmissionBeenGraded(existingSubmission?.grade)) {
      return next(
        new ApiError(
          409,
          'This assignment has already been graded and cannot be updated',
        ),
      )
    }

    if (normalizedFileUrl) {
      try {
        new URL(normalizedFileUrl)
      } catch {
        return next(new ApiError(400, 'fileUrl must be a valid URL'))
      }

      if (
        !isAllowedSubmissionFileUrl(
          normalizedFileUrl,
          assignment.id,
          endUser.id,
        )
      ) {
        return next(
          new ApiError(
            400,
            'fileUrl is not a valid assignment upload URL for this student',
          ),
        )
      }
    }

    const submission = existingSubmission
      ? await prisma.assignmentSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            content: normalizedContent,
            fileUrl: normalizedFileUrl,
            grade: null,
            feedback: null,
            gradedAt: null,
            gradedById: null,
          },
        })
      : await prisma.assignmentSubmission.create({
          data: {
            assignmentId: assignment.id,
            endUserId: endUser.id,
            content: normalizedContent,
            fileUrl: normalizedFileUrl,
          },
        })

    return res.status(201).json(
      new ApiResponse(201, 'Assignment submitted successfully', {
        submission,
      }),
    )
  } catch (error) {
    console.error('[SUBMIT_ASSIGNMENT_ERROR]', error)
    next(error)
  }
}

// Get student's own submission
export const getMySubmission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const endUser = req.endUser!
    const { lessonId } = req.params

    const assignment = await prisma.assignment.findUnique({
      where: { lessonId },
    })

    if (!assignment) {
      return next(new ApiError(404, 'No assignment found for this lesson'))
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_endUserId: {
          assignmentId: assignment.id,
          endUserId: endUser.id,
        },
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Submission fetched successfully', {
        submission: submission || null,
      }),
    )
  } catch (error) {
    console.error('[GET_MY_SUBMISSION_ERROR]', error)
    next(error)
  }
}

// Teacher lists all submissions for an assignment
export const listSubmissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lesson = req.lesson!
    const status =
      typeof req.query.status === 'string' ? req.query.status : undefined

    const assignment = await prisma.assignment.findUnique({
      where: { lessonId: lesson.id },
      select: {
        id: true,
        lessonId: true,
        title: true,
        dueDate: true,
        totalPoints: true,
      },
    })

    if (!assignment) {
      return next(new ApiError(404, 'No assignment found for this lesson'))
    }

    const where: any = { assignmentId: assignment.id }
    if (status === 'graded') {
      where.grade = { not: null }
    } else if (status === 'ungraded') {
      where.grade = null
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where,
      include: {
        endUser: {
          select: {
            id: true,
            email: true,
            externalId: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Submissions fetched successfully', {
        submissions,
        total: submissions.length,
        assignment,
      }),
    )
  } catch (error) {
    console.error('[LIST_SUBMISSIONS_ERROR]', error)
    next(error)
  }
}

// Teacher grades a submission
export const gradeSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { submissionId } = req.params
    const { grade, feedback } = req.body
    const user = req.user // Project owner/team member doing the grading

    if (grade === undefined || grade === null) {
      return next(new ApiError(400, 'Grade is required'))
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
      },
    })

    if (!submission) {
      return next(new ApiError(404, 'Submission not found'))
    }

    if (grade < 0 || grade > submission.assignment.totalPoints) {
      return next(
        new ApiError(
          400,
          `Grade must be between 0 and ${submission.assignment.totalPoints}`,
        ),
      )
    }

    const graded = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: feedback || null,
        gradedAt: new Date(),
        gradedById: user?.id || null,
      },
    })

    // Mark lesson as completed if graded
    await prisma.progress.upsert({
      where: {
        lessonId_endUserId: {
          lessonId: submission.assignment.lessonId,
          endUserId: submission.endUserId,
        },
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
      },
      create: {
        lessonId: submission.assignment.lessonId,
        endUserId: submission.endUserId,
        isCompleted: true,
        completedAt: new Date(),
      },
    })

    return res.status(200).json(
      new ApiResponse(200, 'Submission graded successfully', {
        submission: graded,
      }),
    )
  } catch (error) {
    console.error('[GRADE_SUBMISSION_ERROR]', error)
    next(error)
  }
}
