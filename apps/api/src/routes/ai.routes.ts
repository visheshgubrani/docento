import { Router, Request, Response, NextFunction } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'
import { resolveModuleContext } from '../middlewares/resolveModuleContext'
import { resolveLessonContext } from '../middlewares/resolveLessonContext'
import {
  generateTranscription,
  getTranscriptionStatus,
  getTranscription,
  generateSummary,
  generateQuiz,
  chatWithVideo,
  generateCourseOutline,
} from '../controllers/ai.controller'

const router = Router({ mergeParams: true })

// Middleware to extend timeout for long-running AI requests
const extendTimeout = (timeoutMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(timeoutMs)
    res.setTimeout(timeoutMs)
    next()
  }
}

// Lesson-level AI routes require full context chain
const lessonMiddleware = [
  authorizeProjectAccess,
  resolveCourseContext,
  resolveModuleContext,
  resolveLessonContext,
]

// ===== PROJECT-LEVEL AI FEATURES =====

// POST /api/v1/projects/:projectId/.../ai/generate-outline
// Generate course outline from description (no lesson context needed)
// Extended timeout: 2 minutes for GPT-5 processing
/**
 * @openapi
 * /projects/{projectId}/ai/generate-outline:
 *   post:
 *     tags: [AI]
 *     summary: Generate course outline
 *     description: Generates a course outline from a description.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description:
 *                 type: string
 *               targetAudience:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               moduleCount:
 *                 type: number
 *               lessonsPerModule:
 *                 type: number
 *     responses:
 *       200:
 *         description: Course outline generated
 *       400:
 *         description: Validation error
 */
router.post(
  '/generate-outline',
  extendTimeout(120000),
  authorizeProjectAccess,
  generateCourseOutline,
)

// ===== TRANSCRIPTION (Lesson-level) =====

// POST /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/ai/transcribe
// Trigger caption generation for video
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/ai/transcribe:
 *   post:
 *     tags: [AI]
 *     summary: Start transcription
 *     description: Triggers caption generation for a video lesson.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 description: Language code (default "en")
 *     responses:
 *       202:
 *         description: Transcription generation started
 *       400:
 *         description: Validation error
 *       422:
 *         description: Video not ready
 */
router.post('/transcribe', ...lessonMiddleware, generateTranscription)

// GET /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/ai/transcription/status
// Check transcription status
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/ai/transcription/status:
 *   get:
 *     tags: [AI]
 *     summary: Get transcription status
 *     description: Returns the transcription status for a video lesson.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transcription status fetched
 *       404:
 *         description: Lesson not found
 */
router.get('/transcription/status', ...lessonMiddleware, getTranscriptionStatus)

// GET /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/ai/transcription
// Fetch transcription text
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/ai/transcription:
 *   get:
 *     tags: [AI]
 *     summary: Get transcription
 *     description: Returns the transcription text for a video lesson.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: format
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [vtt]
 *         description: Return VTT instead of JSON
 *     responses:
 *       200:
 *         description: Transcription fetched
 *       422:
 *         description: Transcription not ready
 */
router.get('/transcription', ...lessonMiddleware, getTranscription)

// ===== AI FEATURES (Lesson-level) =====

// POST /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/ai/summary
// Generate video summary (60s timeout for GPT-5)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/ai/summary:
 *   post:
 *     tags: [AI]
 *     summary: Generate summary
 *     description: Generates a summary from the lesson transcript.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxLength:
 *                 type: number
 *                 description: Max summary length in characters
 *     responses:
 *       200:
 *         description: Summary generated
 *       422:
 *         description: Transcription not available
 */
router.post(
  '/summary',
  extendTimeout(60000),
  ...lessonMiddleware,
  generateSummary,
)

// POST /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/ai/generate-quiz
// Generate quiz from video content (60s timeout for GPT-5)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/ai/generate-quiz:
 *   post:
 *     tags: [AI]
 *     summary: Generate quiz
 *     description: Generates quiz questions from a provided topic description.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               questionCount:
 *                 type: number
 *               questionTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER]
 *     responses:
 *       200:
 *         description: Quiz questions generated
 *       422:
 *         description: Transcription not available
 */
router.post(
  '/generate-quiz',
  extendTimeout(60000),
  ...lessonMiddleware,
  generateQuiz,
)

// POST /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/ai/chat
// Chat with video content (60s timeout for GPT-5)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Chat with lesson
 *     description: Answers questions based on the lesson transcript and context.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Chat response generated
 *       422:
 *         description: Transcription not available
 */
router.post('/chat', extendTimeout(60000), ...lessonMiddleware, chatWithVideo)

export default router
