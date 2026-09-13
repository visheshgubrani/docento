import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> },
) {
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

    const { lessonId } = await context.params
    if (!lessonId?.trim()) {
      return NextResponse.json(
        { message: 'lessonId is required' },
        { status: 400 },
      )
    }

    const response = await fetch(
      `${LMS_API_URL}/student/lessons/${lessonId}/assignment`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        cache: 'no-store',
      },
    )

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from student assignment API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[STUDENT_ASSIGNMENT_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to fetch assignment' },
      { status: 500 },
    )
  }
}
