import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL

type VerifyPayload = {
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!LMS_API_URL) {
      return NextResponse.json(
        { message: 'LMS_API_URL is not configured' },
        { status: 500 },
      )
    }

    const authToken = request.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.json(
        { message: 'Unauthorized: Please login first.' },
        { status: 401 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as VerifyPayload | null

    if (
      !body?.razorpay_order_id?.trim() ||
      !body?.razorpay_payment_id?.trim() ||
      !body?.razorpay_signature?.trim()
    ) {
      return NextResponse.json(
        {
          message:
            'razorpay_order_id, razorpay_payment_id and razorpay_signature are required',
        },
        { status: 400 },
      )
    }

    const response = await fetch(`${LMS_API_URL}/commerce/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from commerce API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[COMMERCE_VERIFY_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to verify checkout' },
      { status: 500 },
    )
  }
}
