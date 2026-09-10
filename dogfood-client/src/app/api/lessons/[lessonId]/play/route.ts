import { NextRequest, NextResponse } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL
const LMS_SECRET_API_KEY = process.env.LMS_SECRET_API_KEY

const parsePayload = async (response: Response, fallbackMessage: string) =>
  response.json().catch(() => ({ message: fallbackMessage }))

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

    const proxyHeaders: Record<string, string> = {}

    const xForwardedFor = request.headers.get('x-forwarded-for')
    if (xForwardedFor) proxyHeaders['x-forwarded-for'] = xForwardedFor

    const xRealIp = request.headers.get('x-real-ip')
    if (xRealIp) proxyHeaders['x-real-ip'] = xRealIp

    const userAgent = request.headers.get('user-agent')
    if (userAgent) proxyHeaders['user-agent'] = userAgent

    const authToken = request.cookies.get('auth_token')?.value

    if (authToken) {
      const studentResponse = await fetch(
        `${LMS_API_URL}/student/lessons/${lessonId}/play`,
        {
          method: 'GET',
          headers: {
            ...proxyHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          cache: 'no-store',
        }
      )

      const studentPayload = await parsePayload(
        studentResponse,
        'Unexpected response from student API'
      )

      if (studentResponse.ok) {
        return NextResponse.json(studentPayload, { status: studentResponse.status })
      }
    }

    const storefrontResponse = await fetch(
      `${LMS_API_URL}/storefront/lessons/${lessonId}/play`,
      {
        method: 'GET',
        headers: {
          ...proxyHeaders,
          'Content-Type': 'application/json',
          'X-API-Key': LMS_SECRET_API_KEY,
        },
        cache: 'no-store',
      }
    )

    const storefrontPayload = await parsePayload(
      storefrontResponse,
      'Unexpected response from storefront API'
    )

    return NextResponse.json(storefrontPayload, { status: storefrontResponse.status })
  } catch (error) {
    console.error('[LESSON_PLAY_PROXY_ERROR]', error)
    return NextResponse.json(
      { message: 'Failed to authorize lesson playback' },
      { status: 500 }
    )
  }
}
