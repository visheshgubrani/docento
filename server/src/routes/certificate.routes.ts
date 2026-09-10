import { Router } from 'express'
import { verifyStudent } from '../middlewares/student.middleware'
import { issueCertificate } from '../controllers/certificate.controller'

const router = Router()

router.use(verifyStudent)

/**
 * @openapi
 * /student/courses/{courseId}/certificate:
 *   post:
 *     tags: [Certificates]
 *     summary: Issue course certificate
 *     description: Issues a certificate for a completed course for the authenticated student.
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
 *         description: Certificate issued
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
 *                     certificate:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         enrollmentId:
 *                           type: string
 *                         courseId:
 *                           type: string
 *                         courseTitle:
 *                           type: string
 *                         courseSlug:
 *                           type: string
 *                         recipientId:
 *                           type: string
 *                         recipientName:
 *                           type: string
 *                         recipientEmail:
 *                           type: string
 *                           nullable: true
 *                         issuedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid courseId
 *       403:
 *         description: Course not completed
 *       404:
 *         description: Enrollment not found
 */
router.post('/courses/:courseId/certificate', issueCertificate)

export default router
