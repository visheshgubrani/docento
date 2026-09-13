import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL

type ValidateCouponRequest = {
  courseId?: string
  couponCode?: string
}

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
      | ValidateCouponRequest
      | null
    const courseId = body?.courseId?.trim()
    const couponCode = body?.couponCode?.trim()

    if (!courseId || !couponCode) {
      return NextResponse.json(
        { message: 'courseId and couponCode are required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${LMS_API_URL}/commerce/coupon/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ courseId, couponCode }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from commerce API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[COMMERCE_COUPON_VALIDATE_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
