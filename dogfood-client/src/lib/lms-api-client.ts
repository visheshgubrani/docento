export type StorefrontInstructor = {
  name: string
  avatar?: string | null
  role?: string | null
  description?: string | null
}

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

export type StorefrontCourse = {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  price?: number | null
  category?: string[]
  instructors?: StorefrontInstructor[]
  studentsEnrolled?: number
  lessonsCount?: number
  slug?: string
  updatedAt?: string
  includes?: CourseIncludes
}

export type StorefrontLesson = {
  id: string
  title: string
  description?: string | null
  order: number
  duration?: number | null
  isFree: boolean
  contentType: string
  thumbnail?: string | null
}

export type StorefrontLessonResource = {
  id: string
  title: string
  fileUrl: string
  type?: string | null
  createdAt?: string
}

export type StorefrontLessonDetail = {
  id: string
  title: string
  description?: string | null
  duration?: number | null
  order: number
  contentType: string
  isFree: boolean
  textContent?: string | null
  videoUrl?: string | null
  fileUrl?: string | null
  canAccess?: boolean
  resources?: StorefrontLessonResource[]
  module: {
    id: string
    title: string
    courseId: string
    course?: {
      id: string
      title: string
    }
  }
}

export type StorefrontLessonViewer = {
  isAuthenticated: boolean
  isEnrolled: boolean
  canAccess: boolean
}

export type StorefrontModule = {
  id: string
  title: string
  description?: string | null
  order: number
  lessons: StorefrontLesson[]
}

export type StorefrontCourseDetail = {
  id: string
  title: string
  description?: string | null
  price?: number | null
  enrollmentValidityDays?: number | null
  thumbnail?: string | null
  createdAt?: string
  slug?: string
  category?: string[]
  categories?: string[]
  studentsEnrolled?: number
  instructors?: StorefrontInstructor[]
  includes?: CourseIncludes
  modules: StorefrontModule[]
}

export type StorefrontCourseViewer = {
  isAuthenticated: boolean
  isEnrolled: boolean
  enrollment?: {
    id: string
    progress: number
    completedAt?: string | null
    expiresAt?: string | null
  } | null
}

export type StudentCourse = {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  slug?: string
  enrollmentId: string
  progress: number
  enrolledAt: string
  completedAt?: string | null
  expiresAt?: string | null
  includes?: CourseIncludes
}

export type StudentCourseContent = {
  course: StorefrontCourseDetail
  enrollment: {
    id: string
    progress: number
    completedAt?: string | null
    expiresAt?: string | null
  }
  progressMap: Record<
    string,
    {
      watchedDuration: number
      isCompleted: boolean
      completedAt?: string | null
      lastWatchedAt?: string
    }
  >
}

export type StudentCourseCertificate = {
  id: string
  enrollmentId: string
  courseId: string
  courseTitle: string
  courseSlug?: string | null
  recipientId: string
  recipientName: string
  recipientEmail?: string | null
  issuedAt?: string | null
}

export type StudentLessonDetails = {
  lesson: {
    id: string
    title?: string
    textContent?: string | null
    duration?: number | null
    isFree: boolean
    videoUrl?: string | null
    videoStatus?: string | null
    videoId?: string | null
    contentType?: string | null
    module?: { courseId: string }
  }
  progress?: {
    watchedDuration: number
    isCompleted: boolean
    completedAt?: string | null
    lastWatchedAt?: string
  }
  enrollment?: {
    id: string
    progress: number
    completedAt?: string | null
  }
}

export type LessonPlayback = {
  type: 'clipmux' | string
  videoId: string
  token?: string
  url?: string | null
  subtitleUrl?: string | null
  chapters?: Array<{
    startTime: number
    endTime: number
    title: string
  }> | null
  expiresAt?: number
}

export type StudentQuizQuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | string

export type StudentQuizQuestion = {
  id: string
  questionText: string
  questionType: StudentQuizQuestionType
  options?: unknown
  points?: number
  order: number
}

export type StudentQuizAttemptSummary = {
  id: string
  attemptNumber: number
  score: number
  passed: boolean
  startedAt: string
  completedAt?: string | null
  timeSpent?: number | null
}

export type StudentLessonQuiz = {
  quiz: {
    id: string
    title: string
    description?: string | null
    passingScore: number
    maxAttempts?: number | null
    timeLimit?: number | null
    totalQuestions: number
    totalPoints: number
  }
  questions: StudentQuizQuestion[]
  previousAttempts: StudentQuizAttemptSummary[]
  canTakeQuiz: boolean
  attemptsRemaining?: number | null
}

export type StudentQuizAttempt = {
  id: string
  quizId: string
  endUserId: string
  attemptNumber: number
  score: number
  totalPoints: number
  passed: boolean
  startedAt: string
  completedAt?: string | null
  timeSpent?: number | null
}

export type StudentQuizSubmitAnswer = {
  questionId: string
  questionText: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  pointsEarned: number
  pointsPossible: number
  explanation?: string | null
}

export type StudentQuizSubmitResult = {
  attempt: StudentQuizAttempt
  answers: StudentQuizSubmitAnswer[]
  summary: {
    totalQuestions: number
    totalPoints: number
    pointsEarned: number
    score: number
    passed: boolean
    passingScore: number
    timeSpent?: number
  }
}

export type StudentAssignment = {
  id: string
  lessonId: string
  title: string
  description?: string | null
  dueDate?: string | null
  totalPoints: number
  createdAt?: string
  updatedAt?: string
}

export type StudentAssignmentPermissions = {
  canResubmit: boolean
}

export type StudentLessonAssignment = {
  assignment: StudentAssignment
  permissions?: StudentAssignmentPermissions
}

export type StudentAssignmentSubmission = {
  id: string
  assignmentId: string
  endUserId: string
  content?: string | null
  fileUrl?: string | null
  grade?: number | null
  feedback?: string | null
  gradedAt?: string | null
  gradedById?: string | null
  submittedAt: string
  updatedAt?: string
}

export type StudentAssignmentUploadPresign = {
  presignedUrl: string
  fileUrl: string
  key: string
  method?: string
  headers?: Record<string, string>
  expiresIn?: number
}

type ApiEnvelope<T> = {
  status?: number
  message?: string
  data?: T
}

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    throw new ApiRequestError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status
    )
  }

  if (!payload?.data) {
    throw new ApiRequestError('Missing response data', response.status)
  }

  return payload.data
}

async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    throw new ApiRequestError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status
    )
  }

  if (!payload?.data) {
    throw new ApiRequestError('Missing response data', response.status)
  }

  return payload.data
}

export async function fetchStorefrontCourses() {
  const data = await apiGet<{ courses?: StorefrontCourse[] }>('/api/storefront/courses')
  return data.courses ?? []
}

export async function fetchStorefrontCourse(courseId: string) {
  return apiGet<{ course: StorefrontCourseDetail; viewer?: StorefrontCourseViewer }>(
    `/api/storefront/courses/${courseId}`
  )
}

export async function fetchStorefrontLesson(lessonId: string) {
  return apiGet<{ lesson: StorefrontLessonDetail; viewer?: StorefrontLessonViewer }>(
    `/api/storefront/lessons/${lessonId}`
  )
}

export async function fetchStudentCourses() {
  const data = await apiGet<{ courses?: StudentCourse[] }>('/api/student/courses')
  return data.courses ?? []
}

export async function fetchStudentCourseContent(courseId: string) {
  return apiGet<StudentCourseContent>(`/api/student/courses/${courseId}`)
}

export async function issueStudentCourseCertificate(courseId: string) {
  const data = await apiPost<{ certificate?: StudentCourseCertificate }>(
    `/api/student/courses/${courseId}/certificate`,
    {}
  )

  if (!data.certificate) {
    throw new ApiRequestError('Missing certificate in response', 500)
  }

  return data.certificate
}

export async function fetchStudentLesson(lessonId: string) {
  return apiGet<StudentLessonDetails>(`/api/student/lessons/${lessonId}`)
}

export async function fetchLessonPlayback(lessonId: string) {
  const payload = await apiGet<{
    type: 'clipmux' | string
    videoId: string
    token?: string
    url?: string | null
    subtitle_url?: string | null
    subtitleUrl?: string | null
    chapters?: Array<{
      startTime: number
      endTime: number
      title: string
    }> | null
    expiresAt?: number
  }>(`/api/lessons/${lessonId}/play`)

  return {
    type: payload.type,
    videoId: payload.videoId,
    token: payload.token,
    url: payload.url ?? null,
    subtitleUrl: payload.subtitleUrl ?? payload.subtitle_url ?? null,
    chapters: payload.chapters ?? null,
    expiresAt: payload.expiresAt,
  } satisfies LessonPlayback
}

export async function updateStudentLessonProgress(
  lessonId: string,
  payload: {
    watchedDuration: number
    isCompleted?: boolean
  }
) {
  return apiPost<{ progress: StudentCourseContent['progressMap'][string] }>(
    `/api/student/lessons/${lessonId}/progress`,
    payload
  )
}

export async function fetchStudentLessonQuiz(lessonId: string) {
  return apiGet<StudentLessonQuiz>(`/api/student/lessons/${lessonId}/quiz`)
}

export async function startStudentQuizAttempt(lessonId: string) {
  return apiPost<{
    attempt: StudentQuizAttempt
    timeLimit?: number | null
    remainingSeconds?: number | null
  }>(`/api/student/lessons/${lessonId}/quiz/attempts`, {})
}

export async function submitStudentQuizAttempt(
  lessonId: string,
  attemptId: string,
  payload: {
    answers: Array<{
      questionId: string
      userAnswer: string
    }>
    timeSpent?: number
  }
) {
  return apiPost<StudentQuizSubmitResult>(
    `/api/student/lessons/${lessonId}/quiz/attempts/${attemptId}/submit`,
    payload
  )
}

export async function fetchStudentLessonAssignment(lessonId: string) {
  return apiGet<StudentLessonAssignment>(`/api/student/lessons/${lessonId}/assignment`)
}

export async function fetchStudentAssignmentSubmission(lessonId: string) {
  const data = await apiGet<{ submission: StudentAssignmentSubmission | null }>(
    `/api/student/lessons/${lessonId}/assignment/submission`
  )
  return data.submission ?? null
}

export async function createStudentAssignmentUploadPresign(
  lessonId: string,
  payload: {
    contentType: string
    fileName?: string
  }
) {
  return apiPost<StudentAssignmentUploadPresign>(
    `/api/student/lessons/${lessonId}/assignment/upload/presign`,
    payload
  )
}

export async function submitStudentAssignment(
  lessonId: string,
  payload: {
    content?: string
    fileUrl?: string
  }
) {
  return apiPost<{ submission: StudentAssignmentSubmission }>(
    `/api/student/lessons/${lessonId}/assignment/submit`,
    payload
  )
}
