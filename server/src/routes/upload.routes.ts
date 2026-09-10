import { Router } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'
import { resolveModuleContext } from '../middlewares/resolveModuleContext'
import { resolveLessonContext } from '../middlewares/resolveLessonContext'
import {
  createUpload,
  deleteUpload,
  getUploads,
} from '../controllers/upload.controller'

const router = Router({ mergeParams: true })

router.use(authorizeProjectAccess)
router.use(resolveCourseContext)
router.use(resolveModuleContext)
router.use(resolveLessonContext)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/uploads:
 *   get:
 *     tags: [Lessons]
 *     summary: List lesson uploads
 *     description: Returns uploads attached to a lesson.
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
 *         description: Uploads fetched successfully
 */
router.get('/', getUploads)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/uploads/presign:
 *   post:
 *     tags: [Lessons]
 *     summary: Create upload session
 *     description: Creates a presigned URL for lesson file upload.
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
 *             required: [title, type]
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 description: MIME type
 *               fileName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Upload session created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Storage not configured
 */
router.post('/presign', createUpload)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/uploads/{uploadId}:
 *   delete:
 *     tags: [Lessons]
 *     summary: Delete upload
 *     description: Deletes a lesson upload and its storage object.
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
 *       - name: uploadId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Upload deleted
 *       404:
 *         description: Upload not found
 */
router.delete('/:uploadId', deleteUpload)

export default router
