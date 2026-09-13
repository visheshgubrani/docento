'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { APIError, fetchAPI } from '@/lib/fetch-api'
import type {
  AuthResponse,
  ProfileResponse,
  RefreshTokenResponse,
  PasswordResetRequestResponse,
  UpdateProfileResponse,
} from '@/types/auth'

const isProduction = process.env.NODE_ENV === 'production'

const setAuthCookies = async (accessToken: string, refreshToken: string) => {
  const cookieStore = await cookies()

  cookieStore.set('auth_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  })

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

const clearAuthCookies = async () => {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  cookieStore.delete('refresh_token')
}

const canIgnoreCookieMutationError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes('Cookies can only be modified in a Server Action or Route Handler')

const clearAuthCookiesSafely = async () => {
  try {
    await clearAuthCookies()
  } catch (error) {
    if (canIgnoreCookieMutationError(error)) {
      return
    }
    throw error
  }
}

export async function signUp(formData: {
  email: string
  password: string
  name?: string
}) {
  try {
    const response = await fetchAPI<AuthResponse>('/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify(formData),
    })

    if (response.data.token) {
      const cookieStore = await cookies()
      cookieStore.set('auth_token', response.data.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
    }

    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign up failed',
    }
  }
}

export async function signIn(formData: {
  email: string
  password: string
}) {
  try {
    const response = await fetchAPI<AuthResponse>('/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify(formData),
    })

    if (response.data.accessToken && response.data.refreshToken) {
      await setAuthCookies(response.data.accessToken, response.data.refreshToken)
    }

    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign in failed',
    }
  }
}

export async function signOut() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth_token')?.value

    if (authToken) {
      await fetchAPI('/auth/sign-out', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    }
  } catch (error) {
    console.error('Sign out error:', error)
  } finally {
    await clearAuthCookies()
    redirect('/login')
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (!refreshToken) {
      return null
    }

    const response = await fetchAPI<RefreshTokenResponse>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })

    if (response.data.accessToken) {
      try {
        cookieStore.set('auth_token', response.data.accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 1 day
          path: '/',
        })
      } catch (error) {
        if (!canIgnoreCookieMutationError(error)) {
          throw error
        }
      }

      return response.data.accessToken
    }

    return null
  } catch (error) {
    if (!canIgnoreCookieMutationError(error)) {
      console.error('Token refresh failed:', error)
    }
    return null
  }
}

export async function getProfile(): Promise<ProfileResponse['data'] | null> {
  const fetchProfile = async (authToken?: string) => {
    const response = await fetchAPI<ProfileResponse>('/auth/me', {
      requireAuth: true,
      authToken,
    })
    return response.data
  }

  try {
    return await fetchProfile()
  } catch (error) {
    if (error instanceof APIError && error.status === 401) {
      const refreshedAccessToken = await refreshAccessToken()
      if (refreshedAccessToken) {
        try {
          return await fetchProfile(refreshedAccessToken)
        } catch (retryError) {
          if (retryError instanceof APIError && retryError.status === 401) {
            await clearAuthCookiesSafely()
            return null
          }
          console.error('Get profile retry error:', retryError)
          return null
        }
      }

      await clearAuthCookiesSafely()
      return null
    }

    console.error('Get profile error:', error)
    return null
  }
}

export async function updateMyProfile(formData: { name?: string; email?: string }) {
  try {
    const response = await fetchAPI<UpdateProfileResponse>('/student/me', {
      method: 'PATCH',
      requireAuth: true,
      body: JSON.stringify(formData),
    })

    return { success: true as const, data: response.data.profile }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Profile update failed',
    }
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const response = await fetchAPI<PasswordResetRequestResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password reset request failed',
    }
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    await fetchAPI('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password reset failed',
    }
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  return !!authToken
}
