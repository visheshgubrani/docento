export interface User {
  id: string
  email: string
  name?: string
  projectId?: string
}

export interface AuthResponse {
  status: number
  message: string
  data: {
    user?: User
    token?: string
    accessToken?: string
    refreshToken?: string
  }
}

export interface ProfileResponse {
  status: number
  message: string
  data: {
    profile: {
      id: string
      email: string
      status: string
      managedUser?: {
        name: string | null
      }
      delegatedUser?: {
        metadata: Record<string, unknown> | null
        lastSeenAt: string | null
      }
      enrollments: Array<{
        id: string
        status: string
        enrolledAt: string
        course: {
          id: string
          title: string
          thumbnail: string | null
          slug: string
        }
      }>
    }
  }
}

export interface RefreshTokenResponse {
  status: number
  message: string
  data: {
    accessToken: string
  }
}

export interface PasswordResetRequestResponse {
  status: number
  message: string
  data: {
    resetToken?: string
    expiresAt?: string
  }
}

export interface UpdateProfileResponse {
  status: number
  message: string
  data: {
    profile: {
      id: string
      email: string
      name: string | null
      projectId: string
    }
  }
}

export interface ApiError {
  error: string
  message: string
}
