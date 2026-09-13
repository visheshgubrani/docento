import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { getRazorpayForProject } from '../utils/razorpayFactory'
import { decrypt } from '../utils/encryption' // Needed for verification
import ApiError from '../utils/ApiError'
import ApiResponse from '../utils/ApiResponse'
import crypto from 'crypto'
import { z } from 'zod'
import { logger } from '../utils/logger'
import { computeEnrollmentExpiresAt } from '../utils/enrollment-validity'

type CouponEvaluationResult = {
  coupon: {
    id: string
    code: string
    discountType: 'PERCENTAGE' | 'FLAT'
    discountValue: number
  }
  discountAmount: number
  totalAmount: number
}

const roundCurrency = (value: number) =>
  Math.max(0, Number.parseFloat(value.toFixed(2)))

const normalizeCouponCode = (value: unknown) => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '')
  return normalized || null
}

const evaluateCouponForCourse = async ({
  projectId,
  courseId,
  courseAmount,
  couponCode,
}: {
  projectId: string
  courseId: string
  courseAmount: number
  couponCode: string
}): Promise<CouponEvaluationResult> => {
  const now = new Date()
  const coupon = await prisma.coupon.findFirst({
    where: {
      projectId,
      code: couponCode,
      status: 'ACTIVE',
      AND: [
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        {
          OR: [{ appliesToAll: true }, { couponCourses: { some: { courseId } } }],
        },
      ],
    },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      usageLimit: true,
      usageCount: true,
    },
  })

  if (!coupon) {
    throw new ApiError(400, 'Invalid or inactive coupon code.')
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new ApiError(400, 'Coupon usage limit has been reached.')
  }

  const rawDiscount =
    coupon.discountType === 'PERCENTAGE'
      ? (courseAmount * coupon.discountValue) / 100
      : coupon.discountValue

  const discountAmount = roundCurrency(Math.min(rawDiscount, courseAmount))
  const totalAmount = roundCurrency(Math.max(courseAmount - discountAmount, 0))

  return {
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType as 'PERCENTAGE' | 'FLAT',
      discountValue: coupon.discountValue,
    },
    discountAmount,
    totalAmount,
  }
}

// 1. CREATE ORDER
// 1. CREATE ORDER
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const bodySchema = z.object({
      courseId: z.string().min(1, 'courseId is required'),
      couponCode: z.string().trim().min(1).optional(),
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }
    const { courseId, couponCode } = parsed.data

    // Fetch Course
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        isPublished: true,
        projectId: endUser.projectId,
      },
      include: {
        project: { select: { razorpayKeyId: true, razorpayKeySecret: true } },
      },
    })

    if (!course) return next(new ApiError(404, 'Course not found'))

    // 1. CHECK FOR EXISTING ENROLLMENT (Prevent Double Pay)
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { courseId: course.id, endUserId: endUser.id },
    })

    if (existingEnrollment) {
      return next(new ApiError(400, 'You are already enrolled in this course.'))
    }

    const courseAmount = course.price && course.price > 0 ? course.price : 0
    const normalizedCouponCode = normalizeCouponCode(couponCode)
    const couponEvaluation = normalizedCouponCode
      ? await evaluateCouponForCourse({
          projectId: course.projectId,
          courseId: course.id,
          courseAmount,
          couponCode: normalizedCouponCode,
        })
      : null

    const payableAmount = couponEvaluation?.totalAmount ?? courseAmount
    const amountInPaise = Math.round(payableAmount * 100)

    // 2. HANDLE FREE COURSES OR 100% DISCOUNT COUPONS (Bypass Razorpay)
    if (amountInPaise <= 0) {
      const enrolledAt = new Date()
      await prisma.$transaction(async (tx) => {
        await tx.enrollment.create({
          data: {
            courseId: course.id,
            endUserId: endUser.id,
            enrolledAt,
            expiresAt: computeEnrollmentExpiresAt(
              enrolledAt,
              course.enrollmentValidityDays
            ),
          },
        })

        if (couponEvaluation) {
          await tx.coupon.update({
            where: { id: couponEvaluation.coupon.id },
            data: { usageCount: { increment: 1 } },
          })
        }
      })

      return res
        .status(200)
        .json(
          new ApiResponse(200, 'Enrolled successfully', {
            pricing: {
              courseAmount,
              discountAmount: couponEvaluation?.discountAmount ?? 0,
              totalAmount: 0,
              couponCode: couponEvaluation?.coupon.code ?? null,
            },
          })
        )
    }

    if (amountInPaise < 100) {
      return next(
        new ApiError(
          400,
          'Payable amount is below minimum allowed value. Try a different coupon.'
        )
      )
    }

    // Initialize Razorpay
    const razorpay = getRazorpayForProject(
      course.project.razorpayKeyId,
      course.project.razorpayKeySecret
    )

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${endUser.id.substring(0, 4)}_${Date.now()}`,
      notes: { courseId: course.id, studentId: endUser.id },
    }

    const razorpayOrder = await razorpay.orders.create(options)

    // Save Order to DB
    await prisma.order.create({
      data: {
        projectId: course.projectId,
        endUserId: endUser.id,
        courseId: course.id,
        amount: amountInPaise,
        currency: 'INR',
        provider: 'RAZORPAY',
        providerTxId: razorpayOrder.id, // Good naming change
        status: 'PENDING',
        metadata: couponEvaluation
          ? {
              couponId: couponEvaluation.coupon.id,
              couponCode: couponEvaluation.coupon.code,
              discountType: couponEvaluation.coupon.discountType,
              discountValue: couponEvaluation.coupon.discountValue,
              discountAmount: Math.round(couponEvaluation.discountAmount * 100),
              originalAmount: Math.round(courseAmount * 100),
              finalAmount: amountInPaise,
            }
          : undefined,
      },
    })

    logger.info('Checkout session created', {
      endUserId: endUser.id,
      courseId: course.id,
      orderId: razorpayOrder.id,
    })

    return res.status(200).json(
      new ApiResponse(200, 'Order created', {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: course.project.razorpayKeyId,
        courseName: course.title,
        description: `Enrollment for ${course.title}`,
        pricing: {
          courseAmount,
          discountAmount: couponEvaluation?.discountAmount ?? 0,
          totalAmount: payableAmount,
          couponCode: couponEvaluation?.coupon.code ?? null,
        },
      })
    )
  } catch (error) {
    next(error)
  }
}

// Cancel a pending order (client drop-off or abandoned checkout)
export const cancelPendingOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const bodySchema = z.object({
      orderId: z.string().min(1, 'orderId is required'),
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }
    const { orderId } = parsed.data

    const order = await prisma.order.findFirst({
      where: { id: orderId, endUserId: endUser.id },
    })

    if (!order) {
      return next(new ApiError(404, 'Order not found'))
    }

    if (order.status !== 'PENDING') {
      return next(
        new ApiError(400, 'Only pending orders can be cancelled by the user.')
      )
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Order cancelled', { order: updated }))
  } catch (error) {
    next(error)
  }
}

// 2. VERIFY PAYMENT
export const verifyCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const bodySchema = z.object({
      razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
      razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
      razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      parsed.data

    // A. Find the Order to see WHICH Project it belongs to
    const order = await prisma.order.findFirst({
      where: {
        providerTxId: razorpay_order_id,
        provider: 'RAZORPAY',
        endUserId: endUser.id,
      },
      include: {
        course: {
          include: {
            project: { select: { razorpayKeySecret: true } }, // Fetch the encrypted secret
          },
        },
      },
    })

    if (!order) return next(new ApiError(404, 'Order not found'))
    if (order.status === 'COMPLETED')
      return res.status(200).json(new ApiResponse(200, 'Already processed', {}))

    // B. Get the Real Secret for Verification
    const encryptedSecret = order.course.project.razorpayKeySecret
    if (!encryptedSecret)
      return next(new ApiError(400, 'Project payment config missing'))

    const secret = decrypt(encryptedSecret) // 🔓 Decrypt for HMAC check

    // C. Verify Signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', secret) // Use DAVE'S secret, not yours
      .update(body.toString())
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return next(
        new ApiError(400, 'Payment verification failed. Invalid signature.')
      )
    }

    // D. Fulfill Order
    await prisma.$transaction(async (tx) => {
      // 1. Update Order with PAYMENT ID (Crucial for Refunds)
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          // Assuming you have a metadata JSON field, or add a 'paymentId' column
          // If you don't have a column, store it in metadata:
          metadata: {
            ...((order.metadata as object) || {}),
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
          },
        },
      })

      const orderMetadata =
        order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
          ? (order.metadata as Record<string, unknown>)
          : null
      const couponId =
        orderMetadata && typeof orderMetadata.couponId === 'string'
          ? orderMetadata.couponId
          : null
      if (couponId) {
        await tx.coupon.updateMany({
          where: {
            id: couponId,
            projectId: order.projectId,
          },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        })
      }

      // 2. Safe Enrollment (Prevent Crashes)
      // upsert ensures we don't crash if they are already enrolled
      const enrolledAt = new Date()
      await tx.enrollment.upsert({
        where: {
          courseId_endUserId: {
            // Ensure your Prisma schema has this composite unique key
            courseId: order.courseId,
            endUserId: endUser.id,
          },
        },
        create: {
          courseId: order.courseId,
          endUserId: endUser.id,
          enrolledAt,
          expiresAt: computeEnrollmentExpiresAt(
            enrolledAt,
            order.course.enrollmentValidityDays
          ),
        },
        update: {}, // If exists, do nothing
      })
    })

    return res
      .status(200)
      .json(new ApiResponse(200, 'Payment verified & Course Enrolled!', {}))
  } catch (error) {
    logger.error('Verify checkout failed', { error })
    next(error)
  }
}

export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const endUser = req.endUser!
    const bodySchema = z.object({
      courseId: z.string().min(1, 'courseId is required'),
      couponCode: z.string().min(1, 'couponCode is required'),
    })
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.issues[0].message))
    }

    const { courseId, couponCode } = parsed.data

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        isPublished: true,
        projectId: endUser.projectId,
      },
      select: {
        id: true,
        projectId: true,
        price: true,
      },
    })

    if (!course) {
      return next(new ApiError(404, 'Course not found'))
    }

    const courseAmount = course.price && course.price > 0 ? course.price : 0
    const normalizedCouponCode = normalizeCouponCode(couponCode)
    if (!normalizedCouponCode) {
      return next(new ApiError(400, 'couponCode is required'))
    }

    const couponEvaluation = await evaluateCouponForCourse({
      projectId: course.projectId,
      courseId: course.id,
      courseAmount,
      couponCode: normalizedCouponCode,
    })

    return res.status(200).json(
      new ApiResponse(200, 'Coupon applied successfully', {
        valid: true,
        coupon: couponEvaluation.coupon,
        pricing: {
          courseAmount,
          discountAmount: couponEvaluation.discountAmount,
          totalAmount: couponEvaluation.totalAmount,
        },
      })
    )
  } catch (error) {
    next(error)
  }
}

type OrderDocumentData = {
  order: {
    id: string
    providerTxId: string | null
    amount: number
    currency: string
    status: string
    provider: string
    createdAt: Date
    metadata: unknown
  }
  course: {
    title: string
  }
  tenant: {
    name: string
    branding: unknown
  }
  student: {
    name: string
    email: string | null
  }
}

const FREE_ENROLLMENT_PREFIX = 'free-enrollment-'

const parseQueryParamString = (value: unknown) => {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

const formatMinorAmount = (amount: number, currency: string) => {
  const major = amount / 100
  return `${currency || 'INR'} ${major.toFixed(2)}`
}

const normalizePdfText = (value: string) =>
  value
    .replace(/[\r\n\t]+/g, ' ')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .trim()

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const wrapPdfText = (text: string, maxLength = 88) => {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxLength && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

const createPdfBuffer = (title: string, bodyLines: string[]) => {
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const safeTitle = escapePdfText(normalizePdfText(title))
  const flattenedLines = bodyLines.flatMap((line) =>
    wrapPdfText(normalizePdfText(line))
  )

  let y = 770
  const contentCommands: string[] = [
    `BT /F1 20 Tf 1 0 0 1 50 ${y} Tm (${safeTitle}) Tj ET`,
  ]

  y -= 28
  contentCommands.push(
    `BT /F1 10 Tf 1 0 0 1 50 ${y} Tm (${escapePdfText(`Generated: ${generatedAt} UTC`)}) Tj ET`
  )
  y -= 24

  for (const line of flattenedLines) {
    if (y < 40) break
    contentCommands.push(
      `BT /F1 12 Tf 1 0 0 1 50 ${y} Tm (${escapePdfText(line)}) Tj ET`
    )
    y -= 16
  }

  const content = contentCommands.join('\n')

  const objects: string[] = []
  const addObject = (objectBody: string) => {
    objects.push(objectBody)
    return objects.length
  }

  addObject('<< /Type /Catalog /Pages 2 0 R >>')
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  addObject(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>'
  )
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  addObject(
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`
  )

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((objectBody, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

const buildDocumentPdf = (
  kind: 'receipt' | 'invoice',
  document: OrderDocumentData
) => {
  const issueDate = document.order.createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const amount = formatMinorAmount(document.order.amount, document.order.currency)
  const referenceId = document.order.providerTxId || document.order.id
  const metadata =
    document.order.metadata &&
    typeof document.order.metadata === 'object' &&
    !Array.isArray(document.order.metadata)
      ? (document.order.metadata as Record<string, unknown>)
      : null
  const originalAmount =
    metadata && typeof metadata.originalAmount === 'number'
      ? metadata.originalAmount
      : document.order.amount
  const discountAmount =
    metadata && typeof metadata.discountAmount === 'number'
      ? metadata.discountAmount
      : 0

  if (kind === 'receipt') {
    const receiptNumber = `RCPT-${document.order.id.slice(0, 8).toUpperCase()}`
    return createPdfBuffer('COURSE PURCHASE RECEIPT', [
      `Receipt Number: ${receiptNumber}`,
      `Receipt Date: ${issueDate}`,
      '',
      `Tenant: ${document.tenant.name}`,
      `Student Name: ${document.student.name}`,
      `Student Email: ${document.student.email || '-'}`,
      '',
      `Course: ${document.course.title}`,
      `Amount Paid: ${amount}`,
      `Currency: ${document.order.currency}`,
      `Status: ${document.order.status}`,
      `Payment Method: ${document.order.provider}`,
      `Reference ID: ${referenceId}`,
    ])
  }

  const invoiceNumber = `INV-${document.order.id.slice(0, 8).toUpperCase()}`
  return createPdfBuffer('COURSE PURCHASE INVOICE', [
    `Invoice Number: ${invoiceNumber}`,
    `Issue Date: ${issueDate}`,
    '',
    `Billed By: ${document.tenant.name}`,
    `Billed To: ${document.student.name} (${document.student.email || '-'})`,
    '',
    `Line Item: ${document.course.title}`,
    `Original Amount: ${formatMinorAmount(originalAmount, document.order.currency)}`,
    `Discount: ${formatMinorAmount(discountAmount, document.order.currency)}`,
    `Total: ${amount}`,
    '',
    `Payment Status: ${document.order.status}`,
    `Payment Method: ${document.order.provider}`,
    `Transaction Reference: ${referenceId}`,
  ])
}

const resolveOrderDocumentData = async (
  endUserId: string,
  orderId: string
): Promise<OrderDocumentData | null> => {
  if (orderId.startsWith(FREE_ENROLLMENT_PREFIX)) {
    const enrollmentId = orderId.slice(FREE_ENROLLMENT_PREFIX.length)
    if (!enrollmentId) return null

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        endUserId,
      },
      include: {
        course: {
          select: {
            title: true,
            project: {
              select: {
                name: true,
                branding: true,
              },
            },
          },
        },
        endUser: {
          select: {
            email: true,
            managedUser: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!enrollment) return null

    return {
      order: {
        id: `${FREE_ENROLLMENT_PREFIX}${enrollment.id}`,
        providerTxId: null,
        amount: 0,
        currency: 'INR',
        status: 'COMPLETED',
        provider: 'FREE_ENROLLMENT',
        createdAt: enrollment.enrolledAt,
        metadata: null,
      },
      course: {
        title: enrollment.course.title,
      },
      tenant: {
        name: enrollment.course.project.name,
        branding: enrollment.course.project.branding,
      },
      student: {
        name: enrollment.endUser.managedUser?.name || 'Student',
        email: enrollment.endUser.email,
      },
    }
  }

  const order = await prisma.order.findFirst({
    where: {
      endUserId,
      OR: [{ id: orderId }, { providerTxId: orderId }],
    },
    include: {
      course: {
        select: {
          title: true,
        },
      },
      project: {
        select: {
          name: true,
          branding: true,
        },
      },
      endUser: {
        select: {
          email: true,
          managedUser: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  if (!order) return null

  return {
    order: {
      id: order.id,
      providerTxId: order.providerTxId,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      provider: order.provider,
      createdAt: order.createdAt,
      metadata: order.metadata,
    },
    course: {
      title: order.course.title,
    },
    tenant: {
      name: order.project.name,
      branding: order.project.branding,
    },
    student: {
      name: order.endUser.managedUser?.name || 'Student',
      email: order.endUser.email,
    },
  }
}

const handleOrderDocumentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
  kind: 'receipt' | 'invoice',
  forcePdf = false
) => {
  try {
    const endUser = req.endUser!
    const orderId = req.params.orderId

    if (!orderId) {
      return next(new ApiError(400, 'Order ID is required'))
    }

    const documentData = await resolveOrderDocumentData(endUser.id, orderId)
    if (!documentData) {
      return next(new ApiError(404, 'Order not found'))
    }

    const format = parseQueryParamString(req.query.format).toLowerCase()
    const shouldReturnPdf = forcePdf || format === 'pdf'

    if (shouldReturnPdf) {
      const fileType = kind === 'receipt' ? 'receipt' : 'invoice'
      const fileName = `${fileType}-${documentData.order.id}.pdf`
      const pdfBuffer = buildDocumentPdf(kind, documentData)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=\"${fileName}\"`)
      res.setHeader('Content-Length', pdfBuffer.length.toString())
      return res.status(200).send(pdfBuffer)
    }

    const successMessage =
      kind === 'receipt'
        ? 'Receipt details fetched successfully'
        : 'Invoice details fetched successfully'

    return res.status(200).json(new ApiResponse(200, successMessage, documentData))
  } catch (error) {
    next(error)
  }
}

// 3. RETRIEVE RECEIPT AND INVOICE DATA
export const getOrderReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => handleOrderDocumentRequest(req, res, next, 'receipt')

export const getOrderInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => handleOrderDocumentRequest(req, res, next, 'invoice')

export const getOrderReceiptPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
) => handleOrderDocumentRequest(req, res, next, 'receipt', true)

export const getOrderInvoicePdf = async (
  req: Request,
  res: Response,
  next: NextFunction
) => handleOrderDocumentRequest(req, res, next, 'invoice', true)
