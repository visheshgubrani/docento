import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
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

    const { courseId } = await context.params
    if (!courseId?.trim()) {
      return NextResponse.json(
        { message: 'courseId is required' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${LMS_API_URL}/student/courses/${courseId}/certificate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        cache: 'no-store',
      }
    )

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from certificate API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[STUDENT_CERTIFICATE_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to issue certificate' },
      { status: 500 }
    )
  }
}
