import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import ApiResponse from '../utils/ApiResponse'
import ApiError from '../utils/ApiError'
import { playableVideoUrl } from './video.controller'
import { getSignedThumbnailUrl } from '../utils/clipmux'
import {
  getCourseIncludes,
  getCourseIncludesMap,
} from '../utils/course-duration'

type StorefrontInstructor = {
  name: string
  avatar: string | null
  role: string | null
  description: string | null
}

const normalizeOptionalString = (
  value: unknown,
  maxLength: number,
): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

const normalizeInstructor = (value: unknown): StorefrontInstructor | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        const normalizedParsed = normalizeInstructor(parsed)
        if (normalizedParsed) return normalizedParsed
      } catch {
        // Ignore parse errors and fall back to plain instructor name.
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

const normalizeInstructors = (value: unknown): StorefrontInstructor[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => normalizeInstructor(entry))
    .filter((entry): entry is StorefrontInstructor => Boolean(entry))
}

const ensureProjectContext = (req: Request) => {
  const project = req.project
  if (!project) {
    throw new ApiError(401, 'Project context missing. Provide a valid key.')
  }
  return project
}

const getStorefrontCatalog = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = ensureProjectContext(req)

    const courses = await prisma.course.findMany({
      where: {
        projectId: project.id,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        price: true,
        category: true,
        instructors: true,
        slug: true,
        updatedAt: true,
        modules: {
          select: {
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    const includesMap = await getCourseIncludesMap(
      courses.map((course) => course.id),
    )

    const catalogCourses = courses.map((course) => {
      const lessonsCount = course.modules.reduce(
        (sum, module) => sum + (module._count?.lessons ?? 0),
        0,
      )

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        price: course.price,
        category: course.category,
        instructors: normalizeInstructors(course.instructors),
        slug: course.slug,
        updatedAt: course.updatedAt,
        studentsEnrolled: course._count.enrollments,
        lessonsCount,
        includes: includesMap[course.id],
      }
    })

    return res.status(200).json(
      new ApiResponse(200, 'Catalog fetched successfully', {
        courses: catalogCourses,
      }),
    )
  } catch (error) {
    next(error)
  }
}

const getStorefrontCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = ensureProjectContext(req)
    const { courseId } = req.params

    const rawCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
        projectId: project.id,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        enrollmentValidityDays: true,
        thumbnail: true, // Course cover (usually public)
        createdAt: true,
        category: true,
        instructors: true,
        slug: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
        modules: {
          orderBy: {
            order: 'asc',
          },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            lessons: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                duration: true,
                isFree: true,
                contentType: true,
                thumbnail: true, // ✅ Select the raw URL (true)
                videoId: true, // ✅ Select the videoId (true) so we can use it for signing
              },
            },
          },
        },
      },
    })

    if (!rawCourse) {
      return next(new ApiError(404, 'Course not found'))
    }

    const includes = await getCourseIncludes(rawCourse.id)

    let viewerEnrollment: {
      id: string
      progress: number
      completedAt: Date | null
      expiresAt: Date | null
    } | null = null

    if (req.endUser) {
      viewerEnrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: rawCourse.id,
          endUserId: req.endUser.id,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          progress: true,
          completedAt: true,
          expiresAt: true,
        },
      })
    }

    const signedCourse = {
      id: rawCourse.id,
      title: rawCourse.title,
      description: rawCourse.description,
      price: rawCourse.price,
      enrollmentValidityDays: rawCourse.enrollmentValidityDays,
      thumbnail: rawCourse.thumbnail,
      createdAt: rawCourse.createdAt,
      category: rawCourse.category,
      instructors: normalizeInstructors(rawCourse.instructors),
      slug: rawCourse.slug,
      studentsEnrolled: rawCourse._count.enrollments,
      includes,
      modules: rawCourse.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((lesson) => ({
          ...lesson,
          // ✍️ Apply the signature logic here
          thumbnail: getSignedThumbnailUrl(lesson.thumbnail, lesson.videoId),
          // Optional: Hide videoId from public API if you want to be extra clean
          videoId: undefined,
        })),
      })),
    }

    return res.status(200).json(
      new ApiResponse(200, 'Course syllabus fetched successfully', {
        course: signedCourse,
        viewer: {
          isAuthenticated: Boolean(req.endUser),
          isEnrolled: Boolean(viewerEnrollment),
          enrollment: viewerEnrollment,
        },
      }),
    )
  } catch (error) {
    next(error)
  }
}

const getStorefrontLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = ensureProjectContext(req)
    const { lessonId } = req.params

    const rawLesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        module: {
          course: {
            projectId: project.id,
            isPublished: true,
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        order: true,
        contentType: true,
        isFree: true,
        textContent: true,
        videoUrl: true,
        fileUrl: true,
        uploads: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            fileUrl: true,
            type: true,
            createdAt: true,
          },
        },
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    if (!rawLesson) {
      return next(new ApiError(404, 'Lesson not found'))
    }

    let viewerEnrollment: {
      id: string
      progress: number
      completedAt: Date | null
      expiresAt: Date | null
    } | null = null

    if (req.endUser) {
      viewerEnrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: rawLesson.module.courseId,
          endUserId: req.endUser.id,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          progress: true,
          completedAt: true,
          expiresAt: true,
        },
      })
    }

    const canAccess = rawLesson.isFree || Boolean(viewerEnrollment)
    const lesson = {
      id: rawLesson.id,
      title: rawLesson.title,
      description: rawLesson.description,
      duration: rawLesson.duration,
      order: rawLesson.order,
      contentType: rawLesson.contentType,
      isFree: rawLesson.isFree,
      textContent: canAccess ? rawLesson.textContent : null,
      videoUrl: canAccess ? rawLesson.videoUrl : null,
      fileUrl: canAccess ? rawLesson.fileUrl : null,
      canAccess,
      resources: canAccess ? rawLesson.uploads : [],
      module: rawLesson.module,
    }

    return res.status(200).json(
      new ApiResponse(200, 'Lesson fetched successfully', {
        lesson,
        viewer: {
          isAuthenticated: Boolean(req.endUser),
          isEnrolled: Boolean(viewerEnrollment),
          canAccess,
        },
      }),
    )
  } catch (error) {
    next(error)
  }
}

const getStorefrontLessonVideo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = ensureProjectContext(req)
    const { lessonId } = req.params

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        module: {
          course: {
            projectId: project.id,
            isPublished: true,
          },
        },
      },
      select: {
        id: true,
        isFree: true,
        videoUrl: true,
        videoId: true,
        videoStatus: true,
        duration: true,
      },
    })

    if (!lesson) {
      return next(new ApiError(404, 'Lesson not found'))
    }

    if (!lesson.isFree) {
      return next(
        new ApiError(403, 'Lesson is not available as a free preview.'),
      )
    }

    req.lesson = lesson
    return playableVideoUrl(req, res, next)
  } catch (error) {
    next(error)
  }
}

export {
  getStorefrontCatalog,
  getStorefrontCourse,
  getStorefrontLesson,
  getStorefrontLessonVideo,
}
