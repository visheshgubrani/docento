import { Router } from 'express'
import {
  requireSecretApiKey,
  verifyManagedUser,
} from '../middlewares/auth.middleware'
import {
  markSkipApiKeyRateLimit,
  passwordResetConfirmRateLimiter,
  passwordResetRequestRateLimiter,
  signInRateLimiter,
  signUpRateLimiter,
} from '../middlewares/rate-limit.middleware'
import {
  getProfile,
  loginManagedUsers,
  refreshAccessToken,
  signOutManagedUser,
  signupManagedUsers,
  requestPasswordReset,
  resetPassword,
} from '../controllers/users.controller'

const router = Router()

router.use(markSkipApiKeyRateLimit)

/**
 * @openapi
 * /auth/sign-up:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign up managed user
 *     description: Creates a managed end-user account for a MANAGED project.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         projectId:
 *                           type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Project is not configured for managed authentication
 *       409:
 *         description: User already exists
 */
router
  .route('/sign-up')
  .post(signUpRateLimiter, requireSecretApiKey, signupManagedUsers)
/**
 * @openapi
 * /auth/sign-in:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in managed user
 *     description: Authenticates a managed end-user for a MANAGED project.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: User logged in successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                           nullable: true
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Project is not configured for managed authentication
 */
router
  .route('/sign-in')
  .post(signInRateLimiter, requireSecretApiKey, loginManagedUsers)
/**
 * @openapi
 * /auth/sign-out:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign out managed user
 *     description: Signs out the currently authenticated managed user.
 *     security:
 *       - ManagedUserAuth: []
 *     responses:
 *       200:
 *         description: Successfully signed out
 *       401:
 *         description: Unauthorized
 */
router.route('/sign-out').post(verifyManagedUser, signOutManagedUser)
/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Issues a new access token using a refresh token (from cookie or request body).
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
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
 *       401:
 *         description: Unauthorized
 */
router.route('/refresh-token').post(refreshAccessToken)
router
  .route('/forgot-password')
  /**
   * @openapi
   * /auth/forgot-password:
   *   post:
   *     tags: [Authentication]
   *     summary: Request password reset
   *     description: Creates a password reset token for managed users (MANAGED projects only).
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: If the account exists, a reset token is created
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Project is not configured for managed authentication
   */
  .post(
    passwordResetRequestRateLimiter,
    requireSecretApiKey,
    requestPasswordReset
  )
/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password
 *     description: Resets a managed user's password using a reset token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *       400:
 *         description: Invalid or expired reset token
 */
router
  .route('/reset-password')
  .post(passwordResetConfirmRateLimiter, resetPassword)

// Profile
/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Returns the authenticated managed user's profile and enrollments.
 *     security:
 *       - ManagedUserAuth: []
 *     responses:
 *       200:
 *         description: User fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.route('/me').get(verifyManagedUser, getProfile)

export default router
