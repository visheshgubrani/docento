import { Router } from 'express'
import {
  createSaaSOrder,
  getSubscription,
  verifySaaSPayment,
} from '../controllers/billing.controller'
import { requireAuth } from '../middlewares/auth.middleware' // Your User Auth

const router = Router()

router.post('/create-order', requireAuth, createSaaSOrder)
router.post('/verify-payment', requireAuth, verifySaaSPayment)
router.get('/subscription', requireAuth, getSubscription)

export default router
