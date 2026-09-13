import { Router } from 'express'
import {
  getOverview,
  getRecentSales,
  getCourseInsights,
  getStudentsProgress,
  getEngagementInsights,
} from '../controllers/analytics.controller'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'

const router = Router({ mergeParams: true })
router.use(authorizeProjectAccess)

// Overview + legacy root support
/**
 * @openapi
 * /projects/{projectId}/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Analytics overview
 *     description: Returns high-level KPIs for a project.
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
 *     responses:
 *       200:
 *         description: Analytics overview fetched
 *       401:
 *         description: Unauthorized
 */
router.get('/overview', getOverview)

/**
 * @openapi
 * /projects/{projectId}/analytics/recent-sales:
 *   get:
 *     tags: [Analytics]
 *     summary: Recent sales
 *     description: Returns the most recent transactions for a project.
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
 *     responses:
 *       200:
 *         description: Recent transactions fetched
 */
router.get('/recent-sales', getRecentSales)
/**
 * @openapi
 * /projects/{projectId}/analytics/courses/{courseId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Course insights
 *     description: Returns enrollment and revenue metrics for a course.
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
 *     responses:
 *       200:
 *         description: Course insights fetched
 *       404:
 *         description: Course not found
 */
router.get('/courses/:courseId', getCourseInsights)
/**
 * @openapi
 * /projects/{projectId}/analytics/students:
 *   get:
 *     tags: [Analytics]
 *     summary: Student progress
 *     description: Returns rollup analytics for students in a project.
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
 *     responses:
 *       200:
 *         description: Student analytics fetched
 */
router.get('/students', getStudentsProgress)
/**
 * @openapi
 * /projects/{projectId}/analytics/engagement:
 *   get:
 *     tags: [Analytics]
 *     summary: Engagement insights
 *     description: Returns 7-day engagement metrics.
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
 *     responses:
 *       200:
 *         description: Engagement insights fetched
 */
router.get('/engagement', getEngagementInsights)

export default router
