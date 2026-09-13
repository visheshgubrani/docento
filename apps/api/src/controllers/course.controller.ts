import { Request, Response, NextFunction } from 'express'
import { captureServerEvent } from '../lib/posthog'
import ApiError from '../utils/ApiError'
import { prisma } from '../lib/prisma'
import ApiResponse from '../utils/ApiResponse'
import slugify from 'slugify'
import crypto from 'crypto'
import path from 'path'
import { Prisma } from '../generated/prisma'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getR2PublicBaseUrl } from '../lib/r2'
import { getCourseIncludes, getCourseIncludesMap } from '../utils/course-duration'

type CourseInstructorProfile = {
  name: string
  avatar: string | null
  role: string | null
  description: string | null
}

const normalizeOptionalString = (
  value: unknown,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

const normalizeInstructor = (value: unknown): CourseInstructorProfile | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        const normalizedParsed = normalizeInstructor(parsed)
        if (normalizedParsed) return normalizedParsed
      } catch {
        // Ignore parse errors and fall back to treating the string as a name.
      }
    }

    const name = normalizeOptionalString(trimmed, 120)
    if (!name) return null
    return {
      name,
      avatar: null,
      role: null,
      description: null,
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const instructor = value as Record<string, unknown>
  const name = normalizeOptionalString(instructor.name, 120)

  if (!name) return null

  return {
    name,
    avatar: normalizeOptionalString(instructor.avatar, 2048),
    role: normalizeOptionalString(instructor.role, 120),
    description: normalizeOptionalString(instructor.description, 1000),
  }
}

const normalizeInstructors = (value: unknown): CourseInstructorProfile[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => normalizeInstructor(entry))
    .filter((entry): entry is CourseInstructorProfile => Boolean(entry))
}

const withNormalizedInstructors = <T extends { instructors: unknown }>(
  course: T
) => ({
  ...course,
  instructors: normalizeInstructors(course.instructors),
})

const isValidEnrollmentValidityDays = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = req.project

  if (!project) {
    return next(new ApiError(401, 'Invalid API key'))
  }

  const {
    title,
    description,
    thumbnail,
    category,
    instructors,
    isPublished,
    price,
    enrollmentValidityDays,
    certificatesEnabled,
  } = req.body
  if (!title) {
    return next(new ApiError(400, 'Title is required'))
  }

  // Validate price if provided
  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    return next(new ApiError(400, 'Price must be a positive number'))
  }

  if (
    certificatesEnabled !== undefined &&
    typeof certificatesEnabled !== 'boolean'
  ) {
    return next(new ApiError(400, 'certificatesEnabled must be a boolean'))
  }

  if (
    enrollmentValidityDays !== undefined &&
    enrollmentValidityDays !== null &&
    !isValidEnrollmentValidityDays(enrollmentValidityDays)
  ) {
    return next(
      new ApiError(
        400,
        'enrollmentValidityDays must be a positive integer or null'
      )
    )
  }

  const baseSlug = slugify(title, { lower: true, strict: true })

  const randomSuffix = crypto.randomBytes(3).toString('hex')
  const slug = `${baseSlug}-${randomSuffix}`

  const newCourse = await prisma.course.create({
    data: {
      title,
      description,
      slug,
      thumbnail,
      category,
      instructors: normalizeInstructors(instructors),
      isPublished: isPublished ?? false,
      price: price ?? 0,
      enrollmentValidityDays: enrollmentValidityDays ?? null,
      certificatesEnabled: certificatesEnabled ?? true,
      projectId: project.id,
    },
  })

  captureServerEvent(req, 'course_created_server', {
    course_id: newCourse.id,
    has_description: typeof description === 'string' && description.trim().length > 0,
    is_published: newCourse.isPublished,
    project_id: project.id,
  })

  return res
    .status(201)
    .json(
      new ApiResponse(201, 'Course Created Successfully', {
        course: withNormalizedInstructors(newCourse),
      })
    )
}

const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  const project = req.project!
  const { isPublished } = req.query

  const where: Prisma.CourseWhereInput = {
    projectId: project.id,
  }

  if (isPublished !== undefined) {
    // Ensure the query parameter is treated as a boolean
    where.isPublished = isPublished === 'true'
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      modules: {
        include: {
          _count: {
            select: {
              lessons: true,
            },
          },
        },
      },
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const includesMap = await getCourseIncludesMap(courses.map((course) => course.id))

  // Calculate total lessons for each course
  const coursesWithLessonsCount = courses.map((course) => {
    const totalLessons = course.modules.reduce(
      (sum, module) => sum + (module._count?.lessons ?? 0),
      0
    )
    return {
      ...course,
      instructors: normalizeInstructors(course.instructors),
      _count: {
        ...course._count,
        lessons: totalLessons,
      },
      includes: includesMap[course.id],
    }
  })

  return res.status(200).json(
    new ApiResponse(200, 'Courses fetched successfully', {
      courses: coursesWithLessonsCount,
    })
  )
}

const getCourse = async (req: Request, res: Response, next: NextFunction) => {
  const course = req.course! // From resolveCourseContext middleware

  const courseWithDetails = await prisma.course.findUnique({
    where: { id: course.id },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              contentType: true,
              videoUrl: true,
              videoId: true,
              videoStatus: true,
              textContent: true,
              fileUrl: true,
              duration: true,
              isFree: true,
              order: true,
            },
          },
          _count: {
            select: {
              lessons: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  })

  const includes = courseWithDetails
    ? await getCourseIncludes(courseWithDetails.id)
    : null

  return res.status(200).json(
    new ApiResponse(200, 'Course fetched successfully', {
      course:
        courseWithDetails && includes
          ? {
              ...withNormalizedInstructors(courseWithDetails),
              includes,
            }
          : courseWithDetails,
    })
  )
}

const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const course = req.course!

  await prisma.course.delete({
    where: {
      id: course.id,
    },
  })

  return res
    .status(200)
    .json(new ApiResponse(204, 'Course Deleted Successfully', {}))
}

const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = req.project!
  const { courseId } = req.params

  const {
    title,
    description,
    price,
    enrollmentValidityDays,
    thumbnail,
    category,
    instructors,
    isPublished,
    certificatesEnabled,
  } = req.body

  const dataToUpdate: { [key: string]: any } = {}
  if (title !== undefined) dataToUpdate.title = title
  if (description !== undefined) dataToUpdate.description = description
  if (price !== undefined) dataToUpdate.price = price
  if (
    enrollmentValidityDays !== undefined &&
    enrollmentValidityDays !== null &&
    !isValidEnrollmentValidityDays(enrollmentValidityDays)
  ) {
    return next(
      new ApiError(
        400,
        'enrollmentValidityDays must be a positive integer or null'
      )
    )
  }
  if (enrollmentValidityDays !== undefined) {
    dataToUpdate.enrollmentValidityDays = enrollmentValidityDays
  }
  if (thumbnail !== undefined) dataToUpdate.thumbnail = thumbnail
  if (category !== undefined) dataToUpdate.category = category
  if (instructors !== undefined) {
    dataToUpdate.instructors = normalizeInstructors(instructors)
  }
  if (isPublished !== undefined) dataToUpdate.isPublished = isPublished
  if (certificatesEnabled !== undefined) dataToUpdate.certificatesEnabled = certificatesEnabled

  if (Object.keys(dataToUpdate).length === 0) {
    return next(
      new ApiError(400, 'Please provide at least one field to update.')
    )
  }

  const updatedCourse = await prisma.course.update({
    where: {
      id_projectId: {
        id: courseId,
        projectId: project.id,
      },
    },
    data: dataToUpdate,
  })

  return res.status(200).json(
    new ApiResponse(200, 'Course Updated Successfully', {
      course: withNormalizedInstructors(updatedCourse),
    })
  )
}

const togglePublishCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const course = req.course!
  const updated = await prisma.course.update({
    where: { id: course.id },
    data: {
      isPublished: !course.isPublished,
    },
  })

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        `Course ${updated.isPublished ? 'published' : 'unpublished'
        } successfully`,
        { course: withNormalizedInstructors(updated) }
      )
    )
}

// Helper to build R2 object key for thumbnails
const buildThumbnailKey = (courseId: string, fileName: string) => {
  const sanitized = fileName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .toLowerCase()
  const extension = path.extname(sanitized) || '.jpg'
  const unique = crypto.randomUUID()
  return `courses/${courseId}/thumbnail-${unique}${extension}`
}

const buildInstructorAvatarKey = (courseId: string, fileName: string) => {
  const sanitized = fileName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .toLowerCase()
  const extension = path.extname(sanitized) || '.jpg'
  const unique = crypto.randomUUID()
  return `courses/${courseId}/instructors/avatar-${unique}${extension}`
}

// Helper to resolve public URL
const resolvePublicUrl = (key: string) => {
  const baseUrl = getR2PublicBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/${key}`
}

const createThumbnailUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const course = req.course!
    const { fileName, contentType } = req.body

    if (!fileName) {
      return next(new ApiError(400, 'fileName is required'))
    }

    const r2Client = getR2Client()
    const bucket = process.env.R2_BUCKET

    if (!r2Client || !bucket) {
      return next(new ApiError(500, 'Cloudflare R2 is not configured.'))
    }

    const key = buildThumbnailKey(course.id, fileName)
    const fileUrl = resolvePublicUrl(key)

    if (!fileUrl) {
      return next(
        new ApiError(
          500,
          'Missing R2_PUBLIC_URL or R2_PUBLIC_BASE_URL in environment.'
        )
      )
    }

    await prisma.course.update({
      where: {
        id_projectId: {
          id: course.id,
          projectId: course.projectId,
        },
      },
      data: {
        thumbnail: fileUrl,
      },
    })

    // Generate presigned URL for direct upload
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || 'image/jpeg',
    })

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 15 * 60, // 15 minutes
    })

    return res.status(200).json(
      new ApiResponse(200, 'Thumbnail upload URL generated.', {
        presignedUrl,
        fileUrl,
        key,
        method: 'PUT',
        headers: {
          'Content-Type': contentType || 'image/jpeg',
        },
      })
    )
  } catch (error) {
    return next(error)
  }
}

const createInstructorAvatarUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const course = req.course!
    const { fileName, contentType } = req.body

    if (!fileName) {
      return next(new ApiError(400, 'fileName is required'))
    }

    const r2Client = getR2Client()
    const bucket = process.env.R2_BUCKET

    if (!r2Client || !bucket) {
      return next(new ApiError(500, 'Cloudflare R2 is not configured.'))
    }

    const key = buildInstructorAvatarKey(course.id, fileName)
    const fileUrl = resolvePublicUrl(key)

    if (!fileUrl) {
      return next(
        new ApiError(
          500,
          'Missing R2_PUBLIC_URL or R2_PUBLIC_BASE_URL in environment.'
        )
      )
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || 'image/jpeg',
    })

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 15 * 60, // 15 minutes
    })

    return res.status(200).json(
      new ApiResponse(200, 'Instructor avatar upload URL generated.', {
        presignedUrl,
        fileUrl,
        key,
        method: 'PUT',
        headers: {
          'Content-Type': contentType || 'image/jpeg',
        },
      })
    )
  } catch (error) {
    return next(error)
  }
}

export {
  createCourse,
  getCourses,
  getCourse,
  deleteCourse,
  updateCourse,
  togglePublishCourse,
  createThumbnailUpload,
  createInstructorAvatarUpload,
}
