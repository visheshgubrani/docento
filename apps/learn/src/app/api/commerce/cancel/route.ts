import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL

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

    const body = (await request.json().catch(() => null)) as {
      orderId?: string
    } | null
    const orderId = body?.orderId?.trim()

    if (!orderId) {
      return NextResponse.json(
        { message: 'orderId is required' },
        { status: 400 },
      )
    }

    const response = await fetch(`${LMS_API_URL}/commerce/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ orderId }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from commerce API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[COMMERCE_CANCEL_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to cancel order' },
      { status: 500 },
    )
  }
}
