import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LMS_API_URL = process.env.LMS_API_URL
const LMS_SECRET_API_KEY = process.env.LMS_SECRET_API_KEY

const protectedRoutes = ['/dashboard', '/checkout']
const authRoutes = ['/login', '/signup']

const getDashboardCourseId = (pathname: string) => {
  const match = pathname.match(/^\/dashboard\/courses\/([^/]+)(?:\/.*)?$/)
  return match?.[1] ?? null
}

const redirectToPublicCourse = (request: NextRequest, courseId: string) =>
  NextResponse.redirect(new URL(`/courses/${courseId}`, request.url))

const refreshAuthToken = async (refreshToken: string) => {
  if (!LMS_API_URL) {
    return null
  }

  try {
    const refreshResponse = await fetch(`${LMS_API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LMS_SECRET_API_KEY || '',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!refreshResponse.ok) {
      return null
    }

    const data = await refreshResponse.json()
    return data.data?.accessToken ?? null
  } catch (error) {
    console.error('Token refresh failed in middleware:', error)
    return null
  }
}

const validateAuthToken = async (authToken: string) => {
  if (!LMS_API_URL) {
    return false
  }

  try {
    const profileResponse = await fetch(`${LMS_API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LMS_SECRET_API_KEY || '',
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
    })

    return profileResponse.ok
  } catch (error) {
    console.error('Token validation failed in middleware:', error)
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const dashboardCourseId = getDashboardCourseId(pathname)

  let authToken = request.cookies.get('auth_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // If accessing auth routes while authenticated, redirect to dashboard.
  // Validate token first so stale cookies do not cause login/dashboard redirect loops.
  if (isAuthRoute && authToken) {
    const hasValidToken = await validateAuthToken(authToken)

    if (hasValidToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (refreshToken) {
      const refreshedAccessToken = await refreshAuthToken(refreshToken)

      if (refreshedAccessToken) {
        const refreshedTokenIsValid = await validateAuthToken(refreshedAccessToken)

        if (refreshedTokenIsValid) {
          const response = NextResponse.redirect(new URL('/dashboard', request.url))
          response.cookies.set('auth_token', refreshedAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
          })
          return response
        }
      }
    }

    const response = NextResponse.next()
    response.cookies.delete('auth_token')
    response.cookies.delete('refresh_token')
    return response
  }

  // If accessing protected routes without auth token, try to refresh
  if (isProtectedRoute) {
    if (!authToken && refreshToken) {
      const refreshedAccessToken = await refreshAuthToken(refreshToken)

      if (refreshedAccessToken) {
        const refreshedTokenIsValid = await validateAuthToken(refreshedAccessToken)
        if (!refreshedTokenIsValid) {
          const response = NextResponse.redirect(
            new URL(dashboardCourseId ? `/courses/${dashboardCourseId}` : '/login', request.url)
          )
          response.cookies.delete('auth_token')
          response.cookies.delete('refresh_token')
          return response
        }

        // Create response with the original URL
        const response = NextResponse.next()
        authToken = refreshedAccessToken

        // Set the new auth token cookie
        response.cookies.set('auth_token', refreshedAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 1 day
          path: '/',
        })

        if (dashboardCourseId && LMS_API_URL) {
          const enrollmentResponse = await fetch(
            `${LMS_API_URL}/student/courses/${dashboardCourseId}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${refreshedAccessToken}`,
              },
              cache: 'no-store',
            }
          )

          if (!enrollmentResponse.ok) {
            return redirectToPublicCourse(request, dashboardCourseId)
          }
        }

        return response
      }

      // If refresh failed, redirect to login
      const response = NextResponse.redirect(
        new URL(dashboardCourseId ? `/courses/${dashboardCourseId}` : '/login', request.url)
      )
      response.cookies.delete('auth_token')
      response.cookies.delete('refresh_token')
      return response
    }

    // No auth token and no refresh token, redirect to login/public course page
    if (!authToken && !refreshToken) {
      if (dashboardCourseId) {
        return redirectToPublicCourse(request, dashboardCourseId)
      }

      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (authToken && dashboardCourseId && LMS_API_URL) {
      try {
        const enrollmentResponse = await fetch(
          `${LMS_API_URL}/student/courses/${dashboardCourseId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            cache: 'no-store',
          }
        )

        if (!enrollmentResponse.ok) {
          return redirectToPublicCourse(request, dashboardCourseId)
        }
      } catch (error) {
        console.error('Enrollment check failed in middleware:', error)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/checkout/:path*',
    '/login',
    '/signup',
  ],
}
