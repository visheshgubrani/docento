import { Router } from 'express'
import { delegatedLogin } from '../controllers/delegatedUser.controller'
import {
  authorizeProjectAccess,
  requireSecretApiKey,
} from '../middlewares/auth.middleware'
import {
  delegatedLoginRateLimiter,
  markSkipApiKeyRateLimit,
} from '../middlewares/rate-limit.middleware'

const router = Router()

router.use(markSkipApiKeyRateLimit)

/**
 * @openapi
 * /delegated/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Delegated login
 *     description: Creates or updates a delegated end-user and returns a student access token.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: External user id from your system
 *               metadata:
 *                 type: object
 *                 description: Optional user metadata
 *     responses:
 *       200:
 *         description: Handshake successful
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
 *                     accessToken:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         externalId:
 *                           type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Project is not configured for delegated auth
 */
// Endpoint: POST /api/v1/delegated/login
// Headers: x-api-key: <PROJECT_SECRET>
// Body: { "userId": "unique_123", "metadata": { "name": "Alice" } }
router.post(
  '/login',
  delegatedLoginRateLimiter,
  requireSecretApiKey,
  authorizeProjectAccess,
  delegatedLogin
)

export default router
