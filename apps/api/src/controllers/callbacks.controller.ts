import { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { dispatchWebhook } from '../utils/webhook'
import crypto from 'crypto'
import { logger } from '../utils/logger'
import { computeEnrollmentExpiresAt } from '../utils/enrollment-validity'

export const handleClipmuxWebhook = async (req: Request, res: Response) => {
  try {
    // 3. Parse Clipmux Payload
    // Clipmux format: { id, event, timestamp, data }
    const eventHeader = req.headers['x-webhook-event'] as string
    const webhookPayload = req.body
    const event = webhookPayload.event || eventHeader
    const data = webhookPayload.data || {}

    const { videoId, status, duration, thumbnailUrl, title } = data

    if (!videoId) {
      logger.warn('Clipmux webhook missing videoId')
      return res.status(200).send('OK')
    }

    // 4. Find Lesson by videoId
    const lesson = await prisma.lesson.findFirst({
      where: { videoId: videoId },
      include: {
        module: { include: { course: true } },
      },
    })

    if (!lesson) {
      logger.warn('Clipmux webhook: no lesson found for video', { videoId })
      return res.status(200).send('OK') // Acknowledge to stop retries
    }

    logger.info('Clipmux webhook: found lesson', {
      lessonId: lesson.id,
      event,
      status,
    })

    // 5. Determine Status from event type
    let eventName = ''
    let newStatus = ''

    switch (event) {
      case 'video.ready':
        eventName = 'video.processed'
        newStatus = 'READY'
        break
      case 'video.failed':
        eventName = 'video.failed'
        newStatus = 'FAILED'
        break
      case 'video.processing':
        newStatus = 'PROCESSING'
        break
      case 'video.uploaded':
        newStatus = 'PROCESSING'
        break
      default:
        logger.info('Clipmux webhook: ignoring event', { event })
        return res.status(200).send('Ignored')
    }

    // 6. Update Database & Dispatch Webhook
    if (
      lesson.videoStatus !== newStatus ||
      (newStatus === 'READY' && !lesson.duration)
    ) {
      const durationInt = duration ? Math.round(duration) : 0

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          videoStatus: newStatus,
          ...(newStatus === 'READY' && {
            duration: durationInt,
            thumbnail: thumbnailUrl || lesson.thumbnail,
          }),
        },
      })

      logger.info('Clipmux webhook: updated lesson', {
        lessonId: lesson.id,
        newStatus,
        duration: durationInt,
      })

      // Dispatch to project webhook
      await dispatchWebhook(lesson.module.course.projectId, eventName, {
        lessonId: lesson.id,
        courseId: lesson.module.courseId,
        videoId: videoId,
        status: newStatus,
        duration: durationInt,
        thumbnail: thumbnailUrl,
        errorReason: status === 'failed' ? 'processing_failed' : undefined,
      }).catch((err) => logger.error('Webhook dispatch failed', { err }))
    }

    return res.status(200).send('Webhook Processed')
  } catch (error) {
    logger.error('Clipmux webhook failed', { error })
    return res.status(500).send('Internal Server Error')
  }
}

export const verifyClipmuxWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get Clipmux webhook headers
    const signatureHeader = req.headers['x-webhook-signature'] as string
    const timestampHeader = req.headers['x-webhook-timestamp'] as string
    const eventHeader = req.headers['x-webhook-event'] as string
    const secret = process.env.CLIPMUX_WEBHOOK_SECRET

    // 1. Security Check
    if (!signatureHeader || !secret) {
      logger.warn('Clipmux webhook missing signature/secret')
      return res.status(401).json({ message: 'Missing signature or secret' })
    }

    // 2. Verify signature
    // Clipmux format: X-Webhook-Signature: sha256={signature}
    // Signature computed as: timestamp.body
    const rawBody = Buffer.isBuffer((req as any).rawBody)
      ? (req as any).rawBody.toString('utf-8')
      : JSON.stringify(req.body ?? {})
    const timestamp =
      timestampHeader || Math.floor(Date.now() / 1000).toString()

    const payload = `${timestamp}.${rawBody}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Parse signature header (format: sha256=hexsignature)
    const signatureParts = signatureHeader.split('=')
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      logger.warn('Clipmux webhook invalid signature format', {
        signatureHeader,
      })
      return res.status(401).json({ message: 'Invalid signature format' })
    }

    const receivedSignature = signatureParts[1]

    if (receivedSignature !== expectedSignature) {
      logger.warn('Clipmux webhook invalid signature', {
        received: receivedSignature?.substring(0, 30),
        expected: expectedSignature?.substring(0, 30),
        timestamp,
        bodyLength: rawBody.length,
      })
      return res.status(401).json({ message: 'Invalid signature' })
    }

    logger.info('Clipmux webhook signature verified', {
      event: eventHeader,
      timestamp,
    })
    return next()
  } catch (error) {
    logger.error('Clipmux webhook signature verification failed', { error })
    return res.status(500).send('Internal Server Error')
  }
}

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body?.event
    const paymentEntity = req.body?.payload?.payment?.entity
    const orderEntity = req.body?.payload?.order?.entity
    const providerOrderId = paymentEntity?.order_id ?? orderEntity?.id

    if (!providerOrderId) {
      return res.status(200).send('OK')
    }

    const order = await prisma.order.findFirst({
      where: { providerTxId: providerOrderId },
      include: {
        course: {
          select: {
            enrollmentValidityDays: true,
          },
        },
      },
    })

    if (!order) {
      return res.status(200).send('OK')
    }

    // Already processed
    if (order.status === 'COMPLETED') {
      return res.status(200).send('OK')
    }

    if (event === 'payment.failed') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      })
      return res.status(200).send('OK')
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'COMPLETED',
            receiptUrl: paymentEntity?.receipt ?? null,
          },
        })

        const existingEnrollment = await tx.enrollment.findFirst({
          where: {
            courseId: order.courseId,
            endUserId: order.endUserId,
          },
        })

        if (!existingEnrollment) {
          const enrolledAt = new Date()
          await tx.enrollment.create({
            data: {
              courseId: order.courseId,
              endUserId: order.endUserId,
              enrolledAt,
              expiresAt: computeEnrollmentExpiresAt(
                enrolledAt,
                order.course.enrollmentValidityDays,
              ),
            },
          })
        }
      })
    }

    return res.status(200).send('OK')
  } catch (error) {
    logger.error('Razorpay webhook failed', { error })
    return res.status(500).send('Internal Server Error')
  }
}

export const verifyRazorpayWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    const signature = req.headers['x-razorpay-signature'] as string

    if (!secret) {
      logger.warn('Razorpay webhook secret not configured')
      return res.status(500).send('Webhook secret not configured')
    }

    const rawBody = Buffer.isBuffer((req as any).rawBody)
      ? (req as any).rawBody
      : Buffer.from(JSON.stringify(req.body ?? {}), 'utf-8')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (!signature || expectedSignature !== signature) {
      logger.warn('Razorpay webhook invalid signature')
      return res.status(401).send('Invalid signature')
    }

    return next()
  } catch (error) {
    logger.error('Razorpay webhook signature verification failed', { error })
    return res.status(500).send('Internal Server Error')
  }
}
