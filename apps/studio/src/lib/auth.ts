import { createAuthClient } from 'better-auth/react'

const baseURL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? 'http://localhost:4000/api/auth'

export const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

export const AUTH_CALLBACKS = {
  postSignIn: `${FRONTEND_URL}/projects`,
  emailVerified: `${FRONTEND_URL}/email-verified`,
  passwordReset: `${FRONTEND_URL}/reset-password`,
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
})

export const googleSignIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'google',
    callbackURL: AUTH_CALLBACKS.postSignIn,
  })
  return data
}
export const githubSignIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'github',
    callbackURL: AUTH_CALLBACKS.postSignIn,
  })
  return data
}
