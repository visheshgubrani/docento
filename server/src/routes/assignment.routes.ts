// routes/assignment.routes.ts
import { Router } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'
import { resolveModuleContext } from '../middlewares/resolveModuleContext'
import { resolveLessonContext } from '../middlewares/resolveLessonContext'
import * as assignmentController from '../controllers/assignment.controller'

const router = Router({ mergeParams: true })

// Middleware chain: Project -> Course -> Module -> Lesson
router.use(authorizeProjectAccess)
router.use(resolveCourseContext)
router.use(resolveModuleContext)
router.use(resolveLessonContext)

// ===== ASSIGNMENT ROUTES (One-to-One with Lesson) =====

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/assignments:
 *   get:
 *     tags: [Assignments]
 *     summary: Get assignment
 *     description: Returns the assignment for a lesson (or null if not created).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment fetched successfully
 */
router.get('/', assignmentController.getAssignment)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/assignments:
 *   post:
 *     tags: [Assignments]
 *     summary: Create assignment
 *     description: Creates an assignment for a lesson (one assignment per lesson).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               totalPoints:
 *                 type: number
 *                 default: 100
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Validation error or assignment already exists
 */
router.post('/', assignmentController.createAssignment)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/assignments:
 *   patch:
 *     tags: [Assignments]
 *     summary: Update assignment
 *     description: Updates assignment settings for a lesson.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               totalPoints:
 *                 type: number
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       400:
 *         description: At least one field is required to update
 *       404:
 *         description: Assignment not found
 */
router.patch('/', assignmentController.updateAssignment)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/assignments:
 *   delete:
 *     tags: [Assignments]
 *     summary: Delete assignment
 *     description: Deletes the assignment for a lesson and all its submissions.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *       404:
 *         description: Assignment not found
 */
router.delete('/', assignmentController.deleteAssignment)

// ===== SUBMISSION MANAGEMENT (Teacher endpoints) =====

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/assignments/submissions:
 *   get:
 *     tags: [Assignments]
 *     summary: List submissions
 *     description: Lists all student submissions for this assignment. Supports filtering by grading status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [graded, ungraded]
 *         description: Filter by grading status
 *     responses:
 *       200:
 *         description: Submissions fetched successfully
 *       404:
 *         description: No assignment found for this lesson
 */
router.get('/submissions', assignmentController.listSubmissions)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/assignments/submissions/{submissionId}/grade:
 *   post:
 *     tags: [Assignments]
 *     summary: Grade submission
 *     description: Grades a student's assignment submission with a score and optional feedback.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grade
 *             properties:
 *               grade:
 *                 type: number
 *                 description: Score (0 to totalPoints)
 *               feedback:
 *                 type: string
 *                 description: Optional text feedback
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *       400:
 *         description: Invalid grade value
 *       404:
 *         description: Submission not found
 */
router.post(
  '/submissions/:submissionId/grade',
  assignmentController.gradeSubmission
)

export default router
