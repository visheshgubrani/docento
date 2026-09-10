import { Router } from 'express'

import {
  authorizeProjectAccess,
  authorizeProjectMember,
  requireAuth,
  requireProjectOwner,
} from '../middlewares/auth.middleware'
import * as projectController from '../controllers/projects.controller'
import * as webhookController from '../controllers/webhook.controller'
import * as inviteController from '../controllers/invite.controller'
import analyticsRoutes from './analytics.routes'

const router = Router()

// ===== PROJECT CRUD =====

/**
 * @openapi
 * /projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     description: Creates a new project/tenant for the authenticated user. Projects are the top-level container for all LMS resources (courses, users, etc.).
 *     security:
 *       - OwnerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Learning Platform
 *                 description: Name of the project
 *               authMode:
 *                 type: string
 *                 enum: [MANAGED, DELEGATED]
 *                 default: MANAGED
 *                 description: Authentication mode for end-users
 *     responses:
 *       201:
 *         description: Project created successfully
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
 *                   example: Project Created Successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     project:
 *                       $ref: '#/components/schemas/Project'
 *       401:
 *         description: User not authenticated
 */
router.post('/', requireAuth, projectController.createProject)

/**
 * @openapi
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects
 *     description: Retrieves all projects owned by the authenticated user.
 *     security:
 *       - OwnerAuth: []
 *     responses:
 *       200:
 *         description: Projects fetched successfully
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
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Project'
 *       401:
 *         description: User not authenticated
 */
router.get('/', requireAuth, projectController.getProjects)

// ===== API KEYS (Owner Authenticated) =====

/**
 * @openapi
 * /projects/{projectId}/api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new API key
 *     description: Generates a new secret API key for programmatic access to project resources. The raw key is only returned once.
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Production Key
 *                 description: A friendly name for the API key
 *     responses:
 *       201:
 *         description: API Key generated successfully
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
 *                     apiKey:
 *                       type: string
 *                       example: sk_live_xxxxxxxxxxxxxxxx
 *                       description: Raw API key (shown only once)
 *                     key:
 *                       $ref: '#/components/schemas/ApiKey'
 *       403:
 *         description: "Forbidden: You don't own this project"
 */
router.post('/:projectId/api-keys', requireAuth, projectController.createApiKey)

/**
 * @openapi
 * /projects/{projectId}/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List all API keys
 *     description: Retrieves all API keys for the project. Secret keys are not returned, only metadata.
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
 *         description: API Keys fetched successfully
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
 *                     secretKeys:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ApiKey'
 *                     publishableKey:
 *                       type: string
 *                       example: pk_live_xxxxxxxx
 *                     owner:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                           format: email
 *       403:
 *         description: "Forbidden: You don't own this project"
 */
router.get('/:projectId/api-keys', requireAuth, projectController.getApiKeys)

/**
 * @openapi
 * /projects/{projectId}/api-keys/{keyId}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke an API key
 *     description: Permanently revokes/deletes an API key. This action cannot be undone.
 *     security:
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: keyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *     responses:
 *       204:
 *         description: API Key revoked successfully
 *       403:
 *         description: "Forbidden: You don't own this project"
 *       404:
 *         description: API key not found for this project
 */
router.delete(
  '/:projectId/api-keys/:keyId',
  requireAuth,
  projectController.revokeApiKey
)

/**
 * @openapi
 * /projects/{projectId}/api-keys/{keyId}:
 *   patch:
 *     tags: [API Keys]
 *     summary: Update API key name
 *     description: Updates the friendly name of an existing API key.
 *     security:
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: keyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Staging Key
 *                 description: New name for the API key
 *     responses:
 *       200:
 *         description: API Key updated successfully
 *       400:
 *         description: Key name is required
 *       403:
 *         description: "Forbidden: You don't own this project"
 *       404:
 *         description: API key not found for this project
 */
router.patch(
  '/:projectId/api-keys/:keyId',
  requireAuth,
  projectController.updateApiKeyName
)

// ===== WEBHOOKS (Owner Authenticated) =====

/**
 * @openapi
 * /projects/{projectId}/webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get webhook configuration
 *     description: Retrieves the current webhook configuration for the project, including supported events.
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
 *         description: Webhook config retrieved
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
 *                   $ref: '#/components/schemas/WebhookConfig'
 *       404:
 *         description: Project not found
 */
router.get('/:projectId/webhooks', requireAuth, webhookController.getWebhook)

/**
 * @openapi
 * /projects/{projectId}/webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Configure webhook
 *     description: Sets up or updates the webhook endpoint for receiving event notifications. A secret is auto-generated if not provided.
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
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://yoursite.com/webhooks
 *                 description: Webhook endpoint URL
 *               secret:
 *                 type: string
 *                 description: Optional signing secret. Auto-generated if not provided.
 *     responses:
 *       201:
 *         description: Webhook configured successfully
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
 *                     webhook:
 *                       $ref: '#/components/schemas/WebhookConfig'
 *       400:
 *         description: A valid webhook URL is required
 *       403:
 *         description: "Forbidden: You don't own this project"
 */
router.post(
  '/:projectId/webhooks',
  requireAuth,
  webhookController.createWebhook
)

/**
 * @openapi
 * /projects/{projectId}/webhooks/test:
 *   post:
 *     tags: [Webhooks]
 *     summary: Test webhook
 *     description: Sends a test event to the configured webhook endpoint to verify it is working correctly.
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [enrollment.created, lesson.completed, quiz.attempt_completed, course.completed, video.processed, video.failed]
 *                 default: enrollment.created
 *                 description: Event type to simulate
 *     responses:
 *       200:
 *         description: Test webhook dispatched
 *       400:
 *         description: Webhook is not configured for this project
 *       404:
 *         description: Project not found
 */
router.post(
  '/:projectId/webhooks/test',
  requireAuth,
  webhookController.testWebhook
)

/**
 * @openapi
 * /projects/{projectId}/webhooks:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Delete webhook
 *     description: Removes the webhook configuration from the project. No more events will be sent.
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
 *         description: Webhook deleted successfully
 *       403:
 *         description: "Forbidden: You don't own this project"
 */
router.delete(
  '/:projectId/webhooks',
  requireAuth,
  webhookController.deleteWebhook
)

// ===== PROJECT MEMBERS & INVITATIONS =====

/**
 * @openapi
 * /projects/{projectId}/invite:
 *   post:
 *     tags: [Project Members]
 *     summary: Invite a user to the project
 *     description: Sends an invitation email to join the project. Existing and new users both must accept or reject the invitation.
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
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of the user to invite
 *               role:
 *                 type: string
 *                 enum: [EDITOR]
 *                 default: EDITOR
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       200:
 *         description: Invitation re-sent successfully
 *       400:
 *         description: Invalid email or cannot invite project owner
 *       409:
 *         description: User is already a member
 */
router.post(
  '/:projectId/invite',
  requireAuth,
  authorizeProjectMember,
  requireProjectOwner,
  inviteController.inviteToProject
)

/**
 * @openapi
 * /projects/{projectId}/members:
 *   get:
 *     tags: [Project Members]
 *     summary: List project members
 *     description: Get all members and pending invitations for a project.
 *     security:
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Members fetched successfully
 */
router.get(
  '/:projectId/members',
  requireAuth,
  authorizeProjectMember,
  requireProjectOwner,
  inviteController.getProjectMembers
)

/**
 * @openapi
 * /projects/{projectId}/members/{memberId}:
 *   delete:
 *     tags: [Project Members]
 *     summary: Remove a member from the project
 *     security:
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: memberId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       404:
 *         description: Member not found
 */
router.delete(
  '/:projectId/members/:memberId',
  requireAuth,
  authorizeProjectMember,
  requireProjectOwner,
  inviteController.removeMember
)

/**
 * @openapi
 * /projects/{projectId}/invitations/{invitationId}:
 *   delete:
 *     tags: [Project Members]
 *     summary: Revoke a pending invitation
 *     security:
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: invitationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation revoked successfully
 *       404:
 *         description: Invitation not found
 */
router.delete(
  '/:projectId/invitations/:invitationId',
  requireAuth,
  authorizeProjectMember,
  requireProjectOwner,
  inviteController.revokeInvitation
)

/**
 * @openapi
 * /projects/invitations/accept:
 *   post:
 *     tags: [Project Members]
 *     summary: Accept a project invitation
 *     description: Accepts an invitation using the invitation token. The authenticated user's email must match the invitation email.
 *     security:
 *       - OwnerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *       403:
 *         description: Token does not belong to this user
 *       404:
 *         description: Invalid invitation token
 *       410:
 *         description: Invitation expired
 */
router.post(
  '/invitations/accept',
  requireAuth,
  inviteController.acceptInvitation
)

/**
 * @openapi
 * /projects/invitations/reject:
 *   post:
 *     tags: [Project Members]
 *     summary: Reject a project invitation
 *     description: Rejects an invitation using the invitation token. The authenticated user's email must match the invitation email.
 *     security:
 *       - OwnerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation rejected successfully
 *       403:
 *         description: Token does not belong to this user
 *       404:
 *         description: Invalid invitation token
 *       410:
 *         description: Invitation expired
 */
router.post(
  '/invitations/reject',
  requireAuth,
  inviteController.rejectInvitation
)

/**
 * @openapi
 * /projects/{projectId}/payments:
 *   post:
 *     tags: [Payment Settings]
 *     summary: Update payment settings
 *     description: Configures Razorpay credentials for the project. Credentials are validated before saving.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [keyId, keySecret]
 *             properties:
 *               keyId:
 *                 type: string
 *                 example: rzp_live_xxxxxxxx
 *                 description: Razorpay Key ID
 *               keySecret:
 *                 type: string
 *                 description: Razorpay Key Secret
 *     responses:
 *       200:
 *         description: Payment settings updated successfully
 *       400:
 *         description: Invalid Razorpay Credentials
 */
router.post(
  '/:projectId/payments',
  authorizeProjectAccess,
  requireProjectOwner,
  projectController.updatePaymentSettings
)

/**
 * @openapi
 * /projects/{projectId}/payments:
 *   get:
 *     tags: [Payment Settings]
 *     summary: Get payment settings
 *     description: Retrieves masked payment settings (only shows if configured, not the actual secret).
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
 *         description: Settings fetched
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
 *                     keyId:
 *                       type: string
 *                       nullable: true
 *                     isConfigured:
 *                       type: boolean
 *                       description: Whether Razorpay is configured
 */
router.get(
  '/:projectId/payments',
  authorizeProjectAccess,
  requireProjectOwner,
  projectController.getPaymentSettings
)

// ===== PROJECT OPERATIONS (Requires Project Ownership) =====
// All routes below require project ownership (session OR API key)
router.use('/:projectId', authorizeProjectAccess)
router.use('/:projectId/analytics', analyticsRoutes)

/**
 * @openapi
 * /projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project details
 *     description: Retrieves full details for a specific project.
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
 *         description: Project fetched successfully
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
 *                     project:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: Project not found
 */
router.get('/:projectId', projectController.getProject)

/**
 * @openapi
 * /projects/{projectId}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update project
 *     description: Updates project settings like name, branding, allowed origins, and webhook URL.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Project name
 *               branding:
 *                 type: object
 *                 description: Custom branding options
 *               allowedOrigins:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: CORS allowed origins
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 description: Webhook URL
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Please provide at least one field to update
 */
router.patch('/:projectId', requireProjectOwner, projectController.updateProject)

/**
 * @openapi
 * /projects/{projectId}:
 *   delete:
 *     tags: [Projects]
 *     summary: Delete project
 *     description: Permanently deletes a project and all associated data. This action cannot be undone.
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
 *         description: Project deleted successfully
 */
router.delete('/:projectId', requireAuth, authorizeProjectMember, requireProjectOwner, projectController.deleteProject)

// ===== END USERS =====

/**
 * @openapi
 * /projects/{projectId}/end-users:
 *   post:
 *     tags: [End Users]
 *     summary: Create an end user
 *     description: Creates a new end user in the project. For MANAGED projects, email and password are required. For DELEGATED projects, externalId is required.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Required for MANAGED projects
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Required for MANAGED projects
 *               externalId:
 *                 type: string
 *                 description: Required for DELEGATED projects
 *               name:
 *                 type: string
 *                 description: User display name
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, BANNED]
 *                 default: ACTIVE
 *               metadata:
 *                 type: object
 *                 description: Custom metadata for delegated users
 *     responses:
 *       201:
 *         description: End user created successfully
 *       400:
 *         description: Validation error (missing required fields)
 *       409:
 *         description: User already exists in this project
 */
router.post('/:projectId/end-users', projectController.createEndUser)

/**
 * @openapi
 * /projects/{projectId}/end-users:
 *   get:
 *     tags: [End Users]
 *     summary: List end users
 *     description: Retrieves a paginated list of end users in the project with optional search.
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
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by email or externalId
 *     responses:
 *       200:
 *         description: End users fetched successfully
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
 *                     endUsers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EndUser'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/:projectId/end-users', projectController.getEndUsers)

/**
 * @openapi
 * /projects/{projectId}/end-users/{endUserId}:
 *   get:
 *     tags: [End Users]
 *     summary: Get end user details
 *     description: Retrieves detailed information about a specific end user including their enrollments and recent progress.
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
 *       - name: endUserId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: End User ID
 *     responses:
 *       200:
 *         description: End user fetched successfully
 *       404:
 *         description: End user not found
 */
router.get('/:projectId/end-users/:endUserId', projectController.getEndUser)

/**
 * @openapi
 * /projects/{projectId}/end-users/{endUserId}/status:
 *   patch:
 *     tags: [End Users]
 *     summary: Update end user status
 *     description: Updates the status of an end user (ACTIVE or BANNED). Banning a managed user invalidates their refresh token.
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
 *       - name: endUserId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: End User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, BANNED]
 *                 description: New status for the user
 *     responses:
 *       200:
 *         description: End user status updated successfully
 *       400:
 *         description: Status must be either ACTIVE or BANNED
 *       404:
 *         description: End user not found
 */
router.patch(
  '/:projectId/end-users/:endUserId/status',
  projectController.updateEndUserStatus
)

/**
 * @openapi
 * /projects/{projectId}/end-users/{endUserId}:
 *   delete:
 *     tags: [End Users]
 *     summary: Delete end user
 *     description: Permanently deletes an end user and all their associated data (enrollments, progress, etc.).
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
 *       - name: endUserId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: End User ID
 *     responses:
 *       200:
 *         description: End user deleted successfully
 *       404:
 *         description: End user not found
 */
router.delete(
  '/:projectId/end-users/:endUserId',
  projectController.deleteEndUser
)

export default router
