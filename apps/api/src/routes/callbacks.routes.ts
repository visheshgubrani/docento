import { Router } from 'express'
import {
  handleClipmuxWebhook,
  handleRazorpayWebhook,
  verifyClipmuxWebhookSignature,
  verifyRazorpayWebhookSignature,
} from '../controllers/callbacks.controller'
import { webhookRateLimiter } from '../middlewares/rate-limit.middleware'

const router = Router({ mergeParams: true })

// Clipmux webhook handler for video status updates
router.post(
  '/clipmux',
  verifyClipmuxWebhookSignature,
  webhookRateLimiter,
  handleClipmuxWebhook
)

// Razorpay webhook handler for payment updates
router.post(
  '/razorpay',
  verifyRazorpayWebhookSignature,
  webhookRateLimiter,
  handleRazorpayWebhook
)

// TODO: PUBLISH ROUTE
export default router
