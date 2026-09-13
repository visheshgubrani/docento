import { prisma } from '../lib/prisma'

export type CourseIncludes = {
  videoDurationSeconds: number
  videoDurationText: string
  videoLessonsCount: number
  articlesCount: number
  downloadableResourcesCount: number
  quizzesCount: number
  assignmentsCount: number
  assessmentsCount: number
}

const buildEmptyCourseIncludes = (): CourseIncludes => ({
  videoDurationSeconds: 0,
  videoDurationText: '0 min on-demand video',
  videoLessonsCount: 0,
  articlesCount: 0,
  downloadableResourcesCount: 0,
  quizzesCount: 0,
  assignmentsCount: 0,
  assessmentsCount: 0,
})

const formatVideoDuration = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0 min'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) {
    return `${Math.max(1, minutes)} min`
  }

  if (minutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  return `${hours}h ${minutes}m`
}

export const getCourseIncludesMap = async (courseIds: string[]) => {
  const uniqueCourseIds = Array.from(
    new Set(courseIds.filter((courseId) => Boolean(courseId))),
  )

  if (uniqueCourseIds.length === 0) {
    return {} as Record<string, CourseIncludes>
  }

  const includesMap: Record<string, CourseIncludes> = Object.fromEntries(
    uniqueCourseIds.map((courseId) => [courseId, buildEmptyCourseIncludes()]),
  )

  const lessons = await prisma.lesson.findMany({
    where: {
      module: {
        courseId: { in: uniqueCourseIds },
      },
    },
    select: {
      contentType: true,
      duration: true,
      fileUrl: true,
      module: {
        select: {
          courseId: true,
        },
      },
      quiz: {
        select: {
          id: true,
        },
      },
      assignment: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          uploads: true,
        },
      },
    },
  })

  for (const lesson of lessons) {
    const courseId = lesson.module.courseId
    const includes = includesMap[courseId]
    if (!includes) continue

    if (lesson.contentType === 'VIDEO') {
      includes.videoLessonsCount += 1
      includes.videoDurationSeconds += Math.max(0, lesson.duration ?? 0)
    }

    if (lesson.contentType === 'TEXT') {
      includes.articlesCount += 1
    }

    if (lesson.quiz) {
      includes.quizzesCount += 1
    }

    if (lesson.assignment) {
      includes.assignmentsCount += 1
    }

    if (lesson.contentType === 'FILE' && lesson.fileUrl) {
      includes.downloadableResourcesCount += 1
    }

    includes.downloadableResourcesCount += lesson._count.uploads
  }

  for (const courseId of uniqueCourseIds) {
    const includes = includesMap[courseId]
    includes.assessmentsCount =
      includes.quizzesCount + includes.assignmentsCount
    includes.videoDurationText = `${formatVideoDuration(
      includes.videoDurationSeconds,
    )} on-demand video`
  }

  return includesMap
}

export const getCourseIncludes = async (courseId: string) => {
  const includesMap = await getCourseIncludesMap([courseId])
  return includesMap[courseId] ?? buildEmptyCourseIncludes()
}
