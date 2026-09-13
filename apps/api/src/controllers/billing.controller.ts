import { Request, Response, NextFunction } from 'express'
import { razorpay } from '../utils/razorpay'
import { prisma } from '../lib/prisma'
import ApiError from '../utils/ApiError'
import crypto from 'crypto'

// 1. Create an Order (Frontend calls this when user clicks "Pay")
export const createSaaSOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id
    const { planId } = req.body // e.g. "PRO_PLAN_MONTHLY"

    // Define your pricing logic (In production, fetch this from DB or Config)
    const PLANS: Record<string, number> = {
      PRO_PLAN_MONTHLY: 4900, // ₹4900 (in paise) = ₹49
      ENTERPRISE_YEARLY: 49900, // ₹499
    }

    const amount = PLANS[planId]
    if (!amount) return next(new ApiError(400, 'Invalid Plan ID'))

    // Create Order in Razorpay
    const order = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${userId.substring(0, 10)}`,
      notes: {
        userId: userId,
        planId: planId,
      },
    })

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID, // Frontend needs this to open the modal
    })
  } catch (error) {
    next(error)
  }
}

// 2. Verify Payment (Razorpay calls this Webhook OR Frontend sends signature)
// For MVP, Frontend Verification is faster to implement
export const verifySaaSPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body

    // 🔐 Verify Signature (Critical Security Step)
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex')

    if (generated_signature !== razorpay_signature) {
      return next(
        new ApiError(400, 'Payment verification failed. Signature mismatch.'),
      )
    }

    // 1. Find the project for this user

    // 2. Update/Create Subscription
    await prisma.tenantSubscription.upsert({
      where: { userId: userId },
      update: {
        plan: planId, // "PRO_PLAN_MONTHLY"
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 Days
      },
      create: {
        userId: userId,
        plan: planId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return res.json({ success: true, message: 'Plan upgraded successfully' })
  } catch (error) {
    next(error)
  }
}

export const getSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id

    const subscription = await prisma.tenantSubscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    })

    return res.status(200).json({
      success: true,
      subscription: subscription ?? {
        plan: 'FREE',
        status: 'INACTIVE',
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    })
  } catch (error) {
    next(error)
  }
}
