import { Router } from 'express'

import {
  authorizeProjectAccess,
  requireProjectOwner,
} from '../middlewares/auth.middleware'
import {
  createCoupon,
  listCoupons,
  updateCouponStatus,
} from '../controllers/coupon.controller'

const router = Router({ mergeParams: true })

router.use(authorizeProjectAccess)
router.use(requireProjectOwner)

/**
 * @openapi
 * /projects/{projectId}/coupons:
 *   get:
 *     tags: [Coupons]
 *     summary: List project coupons
 *     description: Returns all coupons configured for the project.
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
 *         description: Coupons fetched successfully
 */
router.get('/', listCoupons)

/**
 * @openapi
 * /projects/{projectId}/coupons:
 *   post:
 *     tags: [Coupons]
 *     summary: Create a coupon
 *     description: Creates a new coupon for this project.
 *     security:
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
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
 *             required: [code, discountType, discountValue]
 *             properties:
 *               code:
 *                 type: string
 *                 example: SAVE10
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FLAT]
 *               discountValue:
 *                 type: number
 *               appliesToAll:
 *                 type: boolean
 *               courseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               usageLimit:
 *                 type: integer
 *                 nullable: true
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */
router.post('/', createCoupon)

/**
 * @openapi
 * /projects/{projectId}/coupons/{couponId}/status:
 *   patch:
 *     tags: [Coupons]
 *     summary: Update coupon status
 *     description: Toggle coupon between ACTIVE and PAUSED.
 *     security:
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: couponId
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, PAUSED]
 *     responses:
 *       200:
 *         description: Coupon status updated successfully
 */
router.patch('/:couponId/status', updateCouponStatus)

export default router
