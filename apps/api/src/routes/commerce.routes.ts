import { Router } from 'express'
import {
  createCheckoutSession,
  cancelPendingOrder,
  validateCoupon,
  verifyCheckout,
  getOrderReceipt,
  getOrderInvoice,
  getOrderReceiptPdf,
  getOrderInvoicePdf,
} from '../controllers/commerce.controller'
import { verifyStudent } from '../middlewares/student.middleware'

const router = Router()

// 1. Create Order
// POST /api/v1/storefront/commerce/checkout
// Body: { courseId: "..." }
/**
 * @openapi
 * /commerce/checkout:
 *   post:
 *     tags: [Commerce]
 *     summary: Create checkout session
 *     description: Creates a checkout order for a course (or enrolls immediately for free courses).
 *     security:
 *       - ManagedUserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId]
 *             properties:
 *               courseId:
 *                 type: string
 *               couponCode:
 *                 type: string
 *                 description: Optional coupon code to apply discount
 *     responses:
 *       200:
 *         description: Order created or free enrollment completed
 *       400:
 *         description: Validation error or already enrolled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post('/checkout', verifyStudent, createCheckoutSession)

// Cancel a pending order (client abandoned)
/**
 * @openapi
 * /commerce/cancel:
 *   post:
 *     tags: [Commerce]
 *     summary: Cancel pending order
 *     description: Cancels a pending order for the authenticated student.
 *     security:
 *       - ManagedUserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Only pending orders can be cancelled
 *       404:
 *         description: Order not found
 */
router.post('/cancel', verifyStudent, cancelPendingOrder)

/**
 * @openapi
 * /commerce/coupon/validate:
 *   post:
 *     tags: [Commerce]
 *     summary: Validate coupon for checkout
 *     description: Validates a coupon against a course and returns discount-adjusted totals.
 *     security:
 *       - ManagedUserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId, couponCode]
 *             properties:
 *               courseId:
 *                 type: string
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Invalid/expired coupon
 *       404:
 *         description: Course not found
 */
router.post('/coupon/validate', verifyStudent, validateCoupon)

// 2. Verify Payment
// POST /api/v1/storefront/commerce/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
/**
 * @openapi
 * /commerce/verify:
 *   post:
 *     tags: [Commerce]
 *     summary: Verify checkout
 *     description: Verifies payment and enrolls the student.
 *     security:
 *       - ManagedUserAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and enrollment completed
 *       400:
 *         description: Verification failed or invalid payload
 *       404:
 *         description: Order not found
 */
router.post('/verify', verifyStudent, verifyCheckout)

/**
 * @openapi
 * /commerce/orders/{orderId}/receipt:
 *   get:
 *     tags: [Commerce]
 *     summary: Get order receipt
 *     description: Retrieves receipt details for an order to generate a PDF or view.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receipt details fetched successfully
 *       404:
 *         description: Order not found
 */
router.get('/orders/:orderId/receipt', verifyStudent, getOrderReceipt)
router.get('/orders/:orderId/receipt/pdf', verifyStudent, getOrderReceiptPdf)

/**
 * @openapi
 * /commerce/orders/{orderId}/invoice:
 *   get:
 *     tags: [Commerce]
 *     summary: Get order invoice
 *     description: Retrieves invoice details for an order to generate a PDF or view.
 *     security:
 *       - ManagedUserAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice details fetched successfully
 *       404:
 *         description: Order not found
 */
router.get('/orders/:orderId/invoice', verifyStudent, getOrderInvoice)
router.get('/orders/:orderId/invoice/pdf', verifyStudent, getOrderInvoicePdf)

export default router
