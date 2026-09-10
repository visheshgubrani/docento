import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL

export async function POST(request: NextRequest) {
  try {
    if (!LMS_API_URL) {
      return NextResponse.json(
        { message: 'LMS_API_URL is not configured' },
        { status: 500 }
      )
    }

    const authToken = request.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.json(
        { message: 'Unauthorized: Please login first.' },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => null)) as
      | {
          courseId?: string
          couponCode?: string
          customer?: {
            name?: string
            email?: string
            mobile?: string
            state?: string
          }
        }
      | null
    const courseId = body?.courseId?.trim()
    const couponCode = body?.couponCode?.trim()
    const customerName = body?.customer?.name?.trim()
    const customerEmail = body?.customer?.email?.trim()
    const customerMobile = body?.customer?.mobile?.trim()
    const customerState = body?.customer?.state?.trim()

    if (!courseId) {
      return NextResponse.json(
        { message: 'courseId is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${LMS_API_URL}/commerce/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        courseId,
        ...(couponCode ? { couponCode } : {}),
        ...(customerName || customerEmail || customerMobile || customerState
          ? {
              customer: {
                ...(customerName ? { name: customerName } : {}),
                ...(customerEmail ? { email: customerEmail } : {}),
                ...(customerMobile ? { mobile: customerMobile } : {}),
                ...(customerState ? { state: customerState } : {}),
              },
            }
          : {}),
      }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from commerce API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[COMMERCE_CHECKOUT_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
