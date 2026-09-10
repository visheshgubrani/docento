import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma'
import { admin } from 'better-auth/plugins'
import {
  sendAuthPasswordResetEmail,
  sendAuthVerificationEmail,
} from '../utils/email'
import { logger } from '../utils/logger'

const isProduction = process.env.NODE_ENV === 'production'
const isBetterAuthRateLimitEnabled =
  isProduction || process.env.BETTER_AUTH_RATE_LIMIT_ENABLED === 'true'
const clientURL = (process.env.CLIENT_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
)

const ensureCallbackURL = (url: string, callbackURL: string) => {
  try {
    const parsedUrl = new URL(url)
    if (!parsedUrl.searchParams.get('callbackURL')) {
      parsedUrl.searchParams.set('callbackURL', callbackURL)
    }
    return parsedUrl.toString()
  } catch {
    return url
  }
}

const getAuthBaseURL = () => {
  const fallback = 'http://localhost:4000/api/auth'
  const rawValue = process.env.BETTER_AUTH_URL?.trim() || fallback

  try {
    const url = new URL(rawValue)
    const pathname = url.pathname.replace(/\/$/, '')

    if (!pathname || pathname === '') {
      url.pathname = '/api/auth'
    } else if (!pathname.endsWith('/api/auth')) {
      url.pathname = `${pathname}/api/auth`
    }

    return url.toString().replace(/\/$/, '')
  } catch (error) {
    logger.warn(
      'Invalid BETTER_AUTH_URL. Falling back to default auth base URL',
      {
        rawValue,
        error,
      },
    )
    return fallback
  }
}

const authBaseURL = getAuthBaseURL()
const emailVerificationCallbackURL = `${clientURL}/email-verified`
const passwordResetCallbackURL = `${clientURL}/reset-password`

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'],
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const resetUrl = ensureCallbackURL(url, passwordResetCallbackURL)

      void sendAuthPasswordResetEmail({
        email: user.email,
        resetUrl,
      }).catch((error) => {
        logger.error('Failed to send password reset email', {
          userId: user.id,
          email: user.email,
          error,
        })
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const verificationUrl = ensureCallbackURL(
        url,
        emailVerificationCallbackURL,
      )

      void sendAuthVerificationEmail({
        email: user.email,
        verificationUrl,
      }).catch((error) => {
        logger.error('Failed to send verification email', {
          userId: user.id,
          email: user.email,
          error,
        })
      })
    },
    async afterEmailVerification(user) {
      logger.info('User email verified', {
        userId: user.id,
        email: user.email,
      })
    },
  },
  rateLimit: {
    enabled: isBetterAuthRateLimitEnabled,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': {
        window: 15 * 60,
        max: 10,
      },
      '/sign-up/email': {
        window: 15 * 60,
        max: 10,
      },
      '/request-password-reset': {
        window: 60 * 60,
        max: 3,
      },
      '/reset-password': {
        window: 60 * 60,
        max: 3,
      },
    },
  },

  trustedOrigins: [process.env.CLIENT_URL, 'http://localhost:3000'].filter(
    Boolean,
  ) as string[],

  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  plugins: [admin()],
  baseURL: authBaseURL,
})
