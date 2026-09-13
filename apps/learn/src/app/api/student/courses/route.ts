import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL

export async function GET(request: NextRequest) {
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

    const response = await fetch(`${LMS_API_URL}/student/courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({
      message: 'Unexpected response from student API',
    }))

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('[STUDENT_COURSES_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to fetch enrolled courses' },
      { status: 500 }
    )
  }
}
