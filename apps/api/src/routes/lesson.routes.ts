import { Router } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import * as lessonController from '../controllers/lesson.controller'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'
import { resolveModuleContext } from '../middlewares/resolveModuleContext'
import { resolveLessonContext } from '../middlewares/resolveLessonContext'
const router = Router({ mergeParams: true })

router.use(authorizeProjectAccess)
router.use(resolveCourseContext)
router.use(resolveModuleContext)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons:
 *   get:
 *     tags: [Lessons]
 *     summary: List lessons
 *     description: Retrieves lessons for a module in order.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Lessons fetched successfully
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
 *                     lessons:
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
 *                           contentType:
 *                             type: string
 *                             enum: [VIDEO, TEXT, QUIZ, FILE, ASSIGNMENT, MOCK_TEST, YOUTUBE]
 *                           videoUrl:
 *                             type: string
 *                             nullable: true
 *                           textContent:
 *                             type: string
 *                             nullable: true
 *                           fileUrl:
 *                             type: string
 *                             nullable: true
 *                           duration:
 *                             type: number
 *                             nullable: true
 *                           thumbnail:
 *                             type: string
 *                             nullable: true
 *                           isFree:
 *                             type: boolean
 *                           order:
 *                             type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/', lessonController.getLessons)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons:
 *   post:
 *     tags: [Lessons]
 *     summary: Create lesson
 *     description: Creates a new lesson in the module.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, contentType]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               contentType:
 *                 type: string
 *                 enum: [VIDEO, TEXT, QUIZ, FILE, ASSIGNMENT, MOCK_TEST, YOUTUBE]
 *               textContent:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *               isFree:
 *                 type: boolean
 *               duration:
 *                 type: number
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     lesson:
 *                       type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', lessonController.createLesson)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}:
 *   get:
 *     tags: [Lessons]
 *     summary: Get lesson
 *     description: Retrieves a lesson with module and course context.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
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
router.get('/:lessonId', resolveLessonContext, lessonController.getLesson)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}:
 *   patch:
 *     tags: [Lessons]
 *     summary: Update lesson
 *     description: Updates lesson fields such as title, content, or order.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               contentType:
 *                 type: string
 *                 enum: [VIDEO, TEXT, QUIZ, FILE, ASSIGNMENT, MOCK_TEST, YOUTUBE]
 *               videoUrl:
 *                 type: string
 *               textContent:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               duration:
 *                 type: number
 *               isFree:
 *                 type: boolean
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *       400:
 *         description: At least one field is required to update
 *       404:
 *         description: Lesson not found
 */
router.patch('/:lessonId', resolveLessonContext, lessonController.updateLesson)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}:
 *   delete:
 *     tags: [Lessons]
 *     summary: Delete lesson
 *     description: Permanently deletes a lesson.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *       404:
 *         description: Lesson not found
 */
router.delete('/:lessonId', resolveLessonContext, lessonController.deleteLesson)

// Thumbnail
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/thumbnail/upload:
 *   post:
 *     tags: [Lessons]
 *     summary: Create thumbnail upload URL
 *     description: Generates a presigned URL for uploading a lesson thumbnail.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
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
 *             required: [contentType]
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp, image/gif]
 *               fileName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thumbnail upload URL created
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
 *                     presignedUrl:
 *                       type: string
 *                     thumbnailUrl:
 *                       type: string
 *                     key:
 *                       type: string
 *                     method:
 *                       type: string
 *                       example: PUT
 *                     headers:
 *                       type: object
 *                     expiresIn:
 *                       type: number
 *       400:
 *         description: Invalid contentType
 *       500:
 *         description: Storage provider is not configured
 */
router.post(
  '/:lessonId/thumbnail/upload',
  resolveLessonContext,
  lessonController.createThumbnailUpload,
)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/thumbnail:
 *   patch:
 *     tags: [Lessons]
 *     summary: Update lesson thumbnail
 *     description: Updates the lesson thumbnail URL after upload or with an external URL.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
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
 *             required: [thumbnail]
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Thumbnail updated successfully
 *       400:
 *         description: Invalid thumbnail URL
 *       404:
 *         description: Lesson not found
 */
router.patch(
  '/:lessonId/thumbnail',
  resolveLessonContext,
  lessonController.updateThumbnail,
)

// PDF
router.post(
  '/:lessonId/pdf/presign',
  resolveLessonContext,
  lessonController.createPdfUpload,
)
router.delete(
  '/:lessonId/pdf',
  resolveLessonContext,
  lessonController.deletePdf,
)

// Reorder
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/reorder:
 *   post:
 *     tags: [Lessons]
 *     summary: Reorder lessons
 *     description: Reorders lessons within a module.
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
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonOrders]
 *             properties:
 *               lessonOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: number
 *     responses:
 *       200:
 *         description: Lessons reordered successfully
 *       400:
 *         description: Invalid lessonOrders payload
 */
router.post('/reorder', lessonController.reorderLessons)

export default router
