// routes/student.routes.ts
import { Router } from 'express'
import { authorizeLessonAccess } from '../middlewares/authorizeLessonAccess'
import { verifyStudent } from '../middlewares/student.middleware'
import * as studentController from '../controllers/student.controller'
import { playableVideoUrl } from '../controllers/video.controller'
import * as studentQuizController from '../controllers/studentQuiz.controller'
import * as assignmentController from '../controllers/assignment.controller'

const router = Router()

router.use(verifyStudent)

// --- Profile Routes ---
/**
 * @openapi
 * /student/me:
 *   patch:
 *     tags: [End Users]
 *     summary: Update profile
 *     description: Updates the authenticated student's profile (managed users only).
 *     security:
 *       - ManagedUserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: A user with this email already exists
 */
router.patch('/me', studentController.updateMyProfile)

// --- Course Routes ---
/**
 * @openapi
 * /student/courses:
 *   get:
 *     tags: [End Users]
 *     summary: List my courses
 *     description: Returns the authenticated student's active enrollments.
 *     security:
 *       - ManagedUserAuth: []
 *     responses:
 *       200:
 *         description: Courses fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     courses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           thumbnail:
 *                             type: string
 *                             nullable: true
 *                           slug:
 *                             type: string
 *                           enrollmentId:
 *                             type: string
 *                           progress:
 *                             type: number
 *                           enrolledAt:
 *                             type: string
 *                             format: date-time
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *       401:
 *         description: Unauthorized
 */
router.get('/courses', studentController.getMyCourses)
/**
 * @openapi
 * /student/courses/{courseId}:
 *   get:
 *     tags: [End Users]
 *     summary: Get course content
 *     description: Returns the course outline and the student's progress for enrolled courses.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course content fetched successfully
 *       403:
 *         description: Not enrolled or access expired
 *       404:
 *         description: Course not found
 */
router.get('/courses/:courseId', studentController.getCourseContent)

// --- Lesson Routes ---
// 2. RESOURCE GUARD: Do you own this?
/**
 * @openapi
 * /student/lessons/{lessonId}:
 *   get:
 *     tags: [End Users]
 *     summary: Get lesson
 *     description: Returns lesson details and progress for playback.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Lesson fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Purchase required
 *       404:
 *         description: Lesson not found
 */
router.get(
  '/lessons/:lessonId',
  authorizeLessonAccess,
  studentController.getLesson
)
/**
 * @openapi
 * /student/lessons/{lessonId}/progress:
 *   post:
 *     tags: [Progress]
 *     summary: Update lesson progress
 *     description: Updates the student's progress for a lesson.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [watchedDuration]
 *             properties:
 *               watchedDuration:
 *                 type: number
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Purchase required
 */
router.post(
  '/lessons/:lessonId/progress',
  authorizeLessonAccess,
  studentController.updateProgress
)

// --- Orders ---
/**
 * @openapi
 * /student/orders:
 *   get:
 *     tags: [Commerce]
 *     summary: List my orders
 *     description: Returns the authenticated student's orders.
 *     security:
 *       - ManagedUserAuth: []
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/orders', studentController.getMyOrders)

// --- Video Playback ---
/**
 * @openapi
 * /student/lessons/{lessonId}/play:
 *   get:
 *     tags: [Lessons]
 *     summary: Get playable video URL
 *     description: Returns a secure playable URL for the lesson video.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Playable URL generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Purchase required
 *       404:
 *         description: Lesson not found
 */
router.get('/lessons/:lessonId/play', authorizeLessonAccess, playableVideoUrl)

// --- Quiz Routes (Secured) ---
// ALL these need authorizeLessonAccess to prevent piracy
/**
 * @openapi
 * /student/lessons/{lessonId}/quiz:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz for lesson
 *     description: Returns quiz details and questions without correct answers.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Quiz fetched successfully
 *       404:
 *         description: This lesson does not have a quiz
 */
router.get(
  '/lessons/:lessonId/quiz',
  authorizeLessonAccess,
  studentQuizController.getQuizForStudent
)

/**
 * @openapi
 * /student/lessons/{lessonId}/quiz/history:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz history
 *     description: Returns the student's quiz attempt history for a lesson.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Quiz history fetched successfully
 *       404:
 *         description: This lesson does not have a quiz
 */
router.get(
  '/lessons/:lessonId/quiz/history',
  authorizeLessonAccess,
  studentQuizController.getQuizHistory
)

/**
 * @openapi
 * /student/lessons/{lessonId}/quiz/attempts:
 *   post:
 *     tags: [Quizzes]
 *     summary: Start quiz attempt
 *     description: Starts a new quiz attempt for the lesson.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       201:
 *         description: Quiz attempt started
 *       403:
 *         description: Max attempts reached
 *       404:
 *         description: This lesson does not have a quiz
 */
router.post(
  '/lessons/:lessonId/quiz/attempts',
  authorizeLessonAccess,
  studentQuizController.startQuizAttempt
)

/**
 * @openapi
 * /student/lessons/{lessonId}/quiz/attempts/{attemptId}/submit:
 *   post:
 *     tags: [Quizzes]
 *     summary: Submit quiz attempt
 *     description: Submits answers for a quiz attempt and returns grading results.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *       - name: attemptId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Attempt ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [questionId]
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     userAnswer:
 *                       type: string
 *                       description: For single-answer types (MULTIPLE_CHOICE, TRUE_FALSE, INTEGER, SHORT_ANSWER)
 *                     userAnswers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: For MULTI_SELECT - array of selected options
 *               timeSpent:
 *                 type: number
 *                 description: Time spent in seconds
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *       400:
 *         description: Invalid attempt or payload
 *       404:
 *         description: Quiz attempt not found
 */
router.post(
  '/lessons/:lessonId/quiz/attempts/:attemptId/submit',
  authorizeLessonAccess,
  studentQuizController.submitQuizAttempt
)

/**
 * @openapi
 * /student/lessons/{lessonId}/quiz/attempts/{attemptId}/results:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz results
 *     description: Returns results for a completed quiz attempt.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *       - name: attemptId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Attempt ID
 *     responses:
 *       200:
 *         description: Quiz results fetched successfully
 *       400:
 *         description: Attempt not completed
 *       404:
 *         description: Quiz attempt not found
 */
router.get(
  '/lessons/:lessonId/quiz/attempts/:attemptId/results',
  authorizeLessonAccess,
  studentQuizController.getQuizResults
)

// --- Assignment Routes (Secured) ---
/**
 * @openapi
 * /student/lessons/{lessonId}/assignment:
 *   get:
 *     tags: [Assignments]
 *     summary: Get assignment details
 *     description: Returns assignment details for the lesson including title, instructions, points, due date, and submission permissions. Once a submission is graded, resubmission is no longer allowed.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Assignment fetched successfully
 *       404:
 *         description: No assignment for this lesson
 */
router.get(
  '/lessons/:lessonId/assignment',
  authorizeLessonAccess,
  assignmentController.getAssignmentForStudent
)

/**
 * @openapi
 * /student/lessons/{lessonId}/assignment/upload/presign:
 *   post:
 *     tags: [Assignments]
 *     summary: Create assignment upload URL
 *     description: Returns a presigned URL for uploading assignment files (pdf/doc/docx/zip/txt/rtf/odt) to R2. Graded submissions cannot request a new upload URL.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentType
 *             properties:
 *               contentType:
 *                 type: string
 *                 description: MIME type for the assignment file.
 *               fileName:
 *                 type: string
 *                 description: Optional original file name.
 *     responses:
 *       200:
 *         description: Assignment upload URL created
 *       400:
 *         description: Invalid payload, file type, or deadline passed
 *       409:
 *         description: Submission has already been graded
 *       404:
 *         description: No assignment for this lesson
 */
router.post(
  '/lessons/:lessonId/assignment/upload/presign',
  authorizeLessonAccess,
  assignmentController.createAssignmentUploadPresign
)

/**
 * @openapi
 * /student/lessons/{lessonId}/assignment/submit:
 *   post:
 *     tags: [Assignments]
 *     summary: Submit assignment
 *     description: Submits text or file for a lesson's assignment. Re-submission overwrites a pending submission, but graded submissions cannot be updated.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Text submission
 *               fileUrl:
 *                 type: string
 *                 description: File URL returned by assignment upload presign endpoint
 *     responses:
 *       201:
 *         description: Assignment submitted successfully
 *       400:
 *         description: Content or fileUrl required, or deadline passed
 *       409:
 *         description: Submission has already been graded
 *       404:
 *         description: No assignment for this lesson
 */
router.post(
  '/lessons/:lessonId/assignment/submit',
  authorizeLessonAccess,
  assignmentController.submitAssignment
)

/**
 * @openapi
 * /student/lessons/{lessonId}/assignment/submission:
 *   get:
 *     tags: [Assignments]
 *     summary: Get my submission
 *     description: Returns the authenticated student's submission for this assignment.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Submission fetched successfully
 *       404:
 *         description: No assignment for this lesson
 */
router.get(
  '/lessons/:lessonId/assignment/submission',
  authorizeLessonAccess,
  assignmentController.getMySubmission
)

export default router
