import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL
const LMS_SECRET_API_KEY = process.env.LMS_SECRET_API_KEY

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    if (!LMS_API_URL || !LMS_SECRET_API_KEY) {
      return NextResponse.json(
        { message: 'LMS_API_URL or LMS_SECRET_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const { lessonId } = await context.params
    if (!lessonId?.trim()) {
      return NextResponse.json(
        { message: 'lessonId is required' },
        { status: 400 }
      )
    }

    const authToken = request.cookies.get('auth_token')?.value

    const response = await fetch(`${LMS_API_URL}/storefront/lessons/${lessonId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LMS_SECRET_API_KEY,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from storefront API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[STOREFRONT_LESSON_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to fetch storefront lesson' },
      { status: 500 }
    )
  }
}
