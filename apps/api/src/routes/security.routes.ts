import { Router } from 'express'

import { requireAuth } from '../middlewares/auth.middleware'
import * as securityController from '../controllers/security.controller'

const router = Router({ mergeParams: true })

router.get(
  '/:projectId/allowed-origins',
  requireAuth,
  securityController.getAllowedOrigins,
)

/**
 * @openapi
 * /projects/{projectId}/allowed-origins:
 *   get:
 *     tags: [Security]
 *     summary: List allowed origins
 *     description: Returns the allowed origins for a project.
 *     security:
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
 *         description: Allowed origins fetched
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/:projectId/allowed-origins',
  requireAuth,
  securityController.addAllowedOrigin,
)

/**
 * @openapi
 * /projects/{projectId}/allowed-origins:
 *   post:
 *     tags: [Security]
 *     summary: Add allowed origin
 *     description: Adds an origin to the project's allowlist.
 *     security:
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
 *             required: [origin]
 *             properties:
 *               origin:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Origin added
 *       200:
 *         description: Origin already allowed
 *       400:
 *         description: Invalid origin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete(
  '/:projectId/allowed-origins',
  requireAuth,
  securityController.deleteAllowedOrigin,
)

/**
 * @openapi
 * /projects/{projectId}/allowed-origins:
 *   delete:
 *     tags: [Security]
 *     summary: Remove allowed origin
 *     description: Removes an origin from the project's allowlist.
 *     security:
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
 *             required: [origin]
 *             properties:
 *               origin:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Origin removed
 *       400:
 *         description: Invalid origin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export default router
