import { Router } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import {
  createVideoUpload,
  deleteVideoFromLesson,
  playableVideoUrl,
  linkVideoToLesson,
  getVideoStatus,
} from '../controllers/video.controller'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'
import { resolveModuleContext } from '../middlewares/resolveModuleContext'
import { resolveLessonContext } from '../middlewares/resolveLessonContext'

const router = Router({ mergeParams: true })

// ADMIN: Create upload session (tenant uploads video)
// POST /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/upload
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/upload:
 *   post:
 *     tags: [Lessons]
 *     summary: Create video upload token
 *     description: Generates an upload token for the Clipmux frontend SDK.
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
 *               title:
 *                 type: string
 *               playbackPolicy:
 *                 type: string
 *                 enum: [public, signed]
 *     responses:
 *       200:
 *         description: Upload token generated
 *       400:
 *         description: Invalid lesson or request
 *       500:
 *         description: Clipmux not configured
 */
router.post(
  '/upload',
  authorizeProjectAccess,
  resolveCourseContext,
  resolveModuleContext,
  resolveLessonContext,
  createVideoUpload
)

// ADMIN: Link uploaded video to lesson
// POST /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/link-video
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/link-video:
 *   post:
 *     tags: [Lessons]
 *     summary: Link uploaded video to lesson
 *     description: Called after frontend upload completes to associate Clipmux video ID with lesson.
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
 *             properties:
 *               videoId:
 *                 type: string
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video linked successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Lesson not found
 */
router.post(
  '/link-video',
  authorizeProjectAccess,
  resolveCourseContext,
  resolveModuleContext,
  resolveLessonContext,
  linkVideoToLesson
)

// ADMIN: Get video status
// GET /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/video-status
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/video-status:
 *   get:
 *     tags: [Lessons]
 *     summary: Get video processing status
 *     description: Fetches current status of the video from Clipmux.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     responses:
 *       200:
 *         description: Video status retrieved
 *       404:
 *         description: No video found
 */
router.get(
  '/video-status',
  authorizeProjectAccess,
  resolveCourseContext,
  resolveModuleContext,
  resolveLessonContext,
  getVideoStatus
)

// ADMIN: Delete video from lesson
// DELETE /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/video
router.delete(
  '/video',
  authorizeProjectAccess,
  resolveCourseContext,
  resolveModuleContext,
  resolveLessonContext,
  deleteVideoFromLesson
)

// ADMIN: Get playable video URL for preview in dashboard
// GET /api/v1/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/play
router.get(
  '/play',
  authorizeProjectAccess,
  resolveCourseContext,
  resolveModuleContext,
  resolveLessonContext,
  playableVideoUrl
)

export default router
