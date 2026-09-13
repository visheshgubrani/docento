import type { User, Session } from 'better-auth'
import type {
  Project,
  ProjectMember,
  DelegatedUser,
  ManagedUser,
  EndUser,
  Lesson,
  Enrollment,
  Quiz,
  Module,
  Course,
  Assignment,
} from '../../generated/prisma'

export type SafeManagedUser = Omit<ManagedUser, 'password'>

type StudentLessonContext = Pick<Lesson, 'id' | 'duration' | 'isFree'> & {
  // Explicitly pick required fields
  videoUrl?: string | null
  videoStatus?: string | null
  videoId?: string | null
  contentType?: string | null
  textContent?: string | null
  title?: string | null
  transcriptionStatus?: string | null
  transcriptionLanguage?: string | null
  module?: { courseId: string }
}

// FullLessonContext for the admin middleware
type FullLessonContext = Lesson & {
  module: Module & {
    course: Course & { collectionId: string | null }
  }
}

type ApiKeyAuthContext = {
  type: 'secret' | 'publishable'
  keyId?: string
}

declare global {
  namespace Express {
    export interface Request {
      user?: User
      endUser?: EndUser
      auth?: Session
      project?: Project
      delegatedUser?: DelegatedUser
      managedUser?: SafeManagedUser
      membership?: ProjectMember // For RBAC - attached by authorizeProjectMember

      // For end user routes
      lesson?: StudentLessonContext | FullLessonContext
      enrollment?: Enrollment
      quiz?: Quiz
      course?: Course
      module?: Module
      assignment?: Assignment
      apiKeyAuth?: ApiKeyAuthContext
      skipApiKeyRateLimit?: boolean
      requestId?: string
    }
  }
}
