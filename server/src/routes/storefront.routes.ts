import { Router } from 'express'
import { requireApiKey } from '../middlewares/auth.middleware'
import {
  markSkipApiKeyRateLimit,
  storefrontRateLimiter,
} from '../middlewares/rate-limit.middleware'
import {
  getStorefrontCatalog,
  getStorefrontCourse,
  getStorefrontLesson,
  getStorefrontLessonVideo,
} from '../controllers/storefront.controller'
import { optionalStudent } from '../middlewares/optionalStudent'

const router = Router()

router.use(markSkipApiKeyRateLimit)
router.use(storefrontRateLimiter)
router.use(requireApiKey)
router.use(optionalStudent)

/**
 * @openapi
 * /storefront/courses:
 *   get:
 *     tags: [Storefront]
 *     summary: List published courses
 *     description: Returns published courses for a project catalog.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Catalog fetched successfully
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
 *                           price:
 *                             type: number
 *                             nullable: true
 *                           slug:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/courses', getStorefrontCatalog)
/**
 * @openapi
 * /storefront/courses/{courseId}:
 *   get:
 *     tags: [Storefront]
 *     summary: Get course catalog details
 *     description: Returns published course details and module/lesson outline.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course syllabus fetched successfully
 *       404:
 *         description: Course not found
 */
router.get('/courses/:courseId', getStorefrontCourse)
/**
 * @openapi
 * /storefront/lessons/{lessonId}:
 *   get:
 *     tags: [Storefront]
 *     summary: Get lesson details
 *     description: Returns public lesson metadata for a published course.
 *     security:
 *       - ApiKeyAuth: []
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
 *       404:
 *         description: Lesson not found
 */
router.get('/lessons/:lessonId', getStorefrontLesson)
/**
 * @openapi
 * /storefront/lessons/{lessonId}/play:
 *   get:
 *     tags: [Storefront]
 *     summary: Get free preview video URL
 *     description: Returns a playable URL for free preview lessons.
 *     security:
 *       - ApiKeyAuth: []
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
 *       403:
 *         description: Lesson is not available as a free preview
 *       404:
 *         description: Lesson not found
 */
router.get('/lessons/:lessonId/play', getStorefrontLessonVideo)

export default router
