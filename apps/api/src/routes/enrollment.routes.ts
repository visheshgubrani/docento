import { Router } from 'express'
import {
  createEnrollment,
  deleteEnrollment,
  listEnrollments,
  updateEnrollment,
} from '../controllers/enrollment.controller'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'

const router = Router({ mergeParams: true })

router.use(authorizeProjectAccess)
router.use(resolveCourseContext)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/enrollments:
 *   post:
 *     tags: [Enrollments]
 *     summary: Create enrollment
 *     description: Enrolls an end user in a course. Idempotent if already enrolled.
 *     security:
 *       - ApiKeyAuth: []
 *       - SessionAuth: []
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endUserId]
 *             properties:
 *               endUserId:
 *                 type: string
 *               durationInDays:
 *                 type: number
 *                 description: Optional access duration override in days. If omitted, course enrollmentValidityDays is used.
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 *       200:
 *         description: User is already enrolled
 *       400:
 *         description: Validation error
 *       404:
 *         description: End user not found
 */
router.post('/', createEnrollment)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/enrollments:
 *   get:
 *     tags: [Enrollments]
 *     summary: List enrollments
 *     description: Returns enrollments for a course with pagination and optional status filtering.
 *     security:
 *       - ApiKeyAuth: []
 *       - SessionAuth: []
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
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, expired, all]
 *         description: Filter by enrollment status
 *     responses:
 *       200:
 *         description: Enrollments fetched successfully
 */
router.get('/', listEnrollments)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/enrollments/{enrollmentId}:
 *   patch:
 *     tags: [Enrollments]
 *     summary: Update enrollment
 *     description: Extends or sets enrollment expiration.
 *     security:
 *       - ApiKeyAuth: []
 *       - SessionAuth: []
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
 *       - name: enrollmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               durationInDays:
 *                 type: number
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Enrollment updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Enrollment not found
 */
router.patch('/:enrollmentId', updateEnrollment)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/enrollments/{enrollmentId}:
 *   delete:
 *     tags: [Enrollments]
 *     summary: Delete enrollment
 *     description: Revokes an enrollment for a course.
 *     security:
 *       - ApiKeyAuth: []
 *       - SessionAuth: []
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
 *       - name: enrollmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment deleted successfully
 *       404:
 *         description: Enrollment not found
 */
router.delete('/:enrollmentId', deleteEnrollment)

export default router
