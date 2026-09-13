'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiUser } from 'react-icons/hi'

import {
  AUTH_CALLBACKS,
  authClient,
  githubSignIn,
  googleSignIn,
} from '@/lib/auth'
import {
  captureClientException,
  captureEvent,
  identifyUser,
} from '@/lib/posthog'
import { GridPattern } from '@/components/GridPattern'

const getEmailDomain = (value: string) => value.split('@')[1] || null

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const invitedEmail = searchParams.get('email')
    if (invitedEmail && !email) {
      setEmail(invitedEmail)
    }
  }, [searchParams, email])

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    captureEvent('auth_social_login_started', {
      entrypoint: 'signup',
      provider,
    })

    try {
      if (provider === 'google') {
        await googleSignIn()
        return
      }

      await githubSignIn()
    } catch (error) {
      setError(`Unable to continue with ${provider}. Please try again.`)
      captureClientException(error, {
        context: 'social_signup_start',
        provider,
      })
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNameError(null)
    setEmailError(null)
    setPasswordError(null)

    // Basic validation
    let hasError = false
    if (!name) {
      setNameError('Full name is required')
      hasError = true
    }
    if (!email) {
      setEmailError('Email is required')
      hasError = true
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email')
      hasError = true
    }
    if (!password) {
      setPasswordError('Password is required')
      hasError = true
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      hasError = true
    }

    if (hasError) return

    setIsLoading(true)
    const { error } = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: AUTH_CALLBACKS.emailVerified,
    })
    setIsLoading(false)
    if (error) {
      setError(error.message || 'Signup failed. Please try again.')
      captureEvent('auth_signup_failed', {
        email_domain: getEmailDomain(email),
        has_name: Boolean(name.trim()),
        invited_signup: Boolean(searchParams.get('email')),
        method: 'email',
        status: error.status ?? null,
      })
      captureClientException(error, {
        context: 'signup_submit',
        method: 'email',
      })
      return
    }

    identifyUser({ email, name })
    captureEvent('auth_signup_succeeded', {
      email_domain: getEmailDomain(email),
      has_name: Boolean(name.trim()),
      invited_signup: Boolean(searchParams.get('email')),
      method: 'email',
    })

    router.replace(
      `/login?email=${encodeURIComponent(email)}&verification=sent`,
    )
  }

  return (
    <>
      <div className="relative z-0 bg-gradient-to-b from-accent-400 to-accent-50/80 flex flex-col items-center justify-center w-full mx-auto overflow-hidden min-h-screen">
        {/* Grid Pattern Background */}
        <div className="absolute -z-[1] inset-0 overflow-hidden pointer-events-none">
          <GridPattern
            className="absolute inset-0 h-full w-full fill-accent-100/20 stroke-neutral-300/50"
            style={{
              maskImage:
                'linear-gradient(to bottom left, white 40%, transparent 50%)',
              WebkitMaskImage:
                'linear-gradient(to bottom left, white 40%, transparent 50%)',
            }}
            yOffset={-330}
          />
        </div>
        <Link
          href="/"
          className="group absolute top-0 left-0 hidden md:flex gap-0.5 items-center p-6 font-semibold "
        >
          <MdKeyboardArrowLeft className="text-foreground/80 group-hover:-translate-x-1 transition-all duration-200 ease-in-out" />
          <span className="text-foreground/80 group-hover:underline">Home</span>
        </Link>
        <div className="flex items-center w-full flex-col justify-center px-4 py-4 sm:py-6 sm:px-6">
          <div className="max-w-lg w-full mx-auto">
            <div className="mx-auto bg-gradient-to-b from-accent-200 to-white sm:p-6 p-4 md:py-10 md:px-8 border border-neutral-300  shadow-lg shadow-accent-300 rounded-3xl w-full">
              <div className="text-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center"
                >
                  <span className="relative shrink-0 size-10">
                    <Image
                      src="/docento-logo.svg"
                      alt="Docento Logo"
                      fill
                      priority
                      className="object-contain"
                    />
                  </span>
                </Link>
                <h2 className="mt-4 font-noto text-2xl/9 font-semibold tracking-tight text-gray-900">
                  Create a new account
                </h2>
                <p className="mt-2 text-sm/6 text-neutral-700">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-accent hover:text-accent/80 hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </div>

              {/* General Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="mt-10">
                <div className="mt-6 grid grid-cols-2 gap-5">
                  <a
                    href="#"
                    onClick={async (event) => {
                      event.preventDefault()
                      await handleSocialLogin('google')
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-md bg-accent-50 px-3 py-2.5 text-sm font-semibold text-gray-900 border border-foreground/10 shadow-md shadow-accent-300 hover:bg-neutral-50 transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5"
                    >
                      <path
                        d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                        fill="#EA4335"
                      />
                      <path
                        d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                        fill="#34A853"
                      />
                    </svg>
                    <span className="text-sm/6 font-semibold">Google</span>
                  </a>

                  <a
                    href="#"
                    onClick={async (event) => {
                      event.preventDefault()
                      await handleSocialLogin('github')
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-md bg-accent-50 px-3 py-2.5 text-sm font-semibold text-gray-900 border border-foreground/10 shadow-md shadow-accent-300 hover:bg-neutral-50 transition-colors"
                  >
                    <svg
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="size-5 fill-[#24292F]"
                    >
                      <path
                        d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                        clipRule="evenodd"
                        fillRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm/6 font-semibold">GitHub</span>
                  </a>
                </div>

                <div className="mt-10 relative">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center"
                  >
                    <div className="w-full border-t border-muted-foreground/25" />
                  </div>
                  <div className="relative flex justify-center text-sm/6 font-medium">
                    <span className="bg-[#f1eefc] px-6 text-gray-900">Or</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div>
                  <form
                    action="#"
                    method="POST"
                    className="space-y-5"
                    onSubmit={handleSubmit}
                  >
                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                          <HiUser className="size-5" />
                        </span>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          value={name}
                          onChange={(event) => {
                            setName(event.target.value)
                            setNameError(null)
                          }}
                          placeholder="Full name"
                          className={`block w-full rounded-lg bg-white/75 pl-10 pr-3 py-2.5 text-base text-gray-900 border ${nameError ? 'border-red-500' : 'border-foreground/15'} placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6`}
                        />
                      </div>
                      {nameError && (
                        <p className="mt-1 text-xs text-red-600">{nameError}</p>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                          <HiMail className="size-5" />
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value)
                            setEmailError(null)
                          }}
                          placeholder="Email address"
                          autoComplete="email"
                          className={`block w-full rounded-lg bg-white/75 pl-10 pr-3 py-2.5 text-base text-gray-900 border ${emailError ? 'border-red-500' : 'border-foreground/15'} placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6`}
                        />
                      </div>
                      {emailError && (
                        <p className="mt-1 text-xs text-red-600">
                          {emailError}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                          <HiLockClosed className="size-5" />
                        </span>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value)
                            setPasswordError(null)
                          }}
                          placeholder="Password"
                          autoComplete="new-password"
                          className={`block w-full rounded-lg bg-white/75 pl-10 pr-10 py-2.5 text-base text-gray-900 border ${passwordError ? 'border-red-500' : 'border-foreground/15'} placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                          {showPassword ? (
                            <HiEyeOff className="size-5" />
                          ) : (
                            <HiEye className="size-5" />
                          )}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="mt-1 text-xs text-red-600">
                          {passwordError}
                        </p>
                      )}
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full justify-center rounded-lg bg-foreground/90 px-3 py-2.5 text-sm/6 font-semibold text-white hover:bg-foreground/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Signing up...' : 'Sign up'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            {/* Terms */}
            <div className="mt-6 flex justify-between gap-2 items-center text-center text-sm/6">
              <p className="text-foreground/80">&copy; 2026 Docento.</p>
              <div className="flex gap-2">
                <span className="text-foreground/80">•</span>
                <Link
                  href="/privacy"
                  className="text-foreground/80 hover:text-accent-foreground"
                >
                  Privacy
                </Link>
                <span className="text-foreground/80">•</span>
                <Link
                  href="/terms"
                  className="text-foreground/80 hover:text-accent-foreground"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupPageContent />
    </Suspense>
  )
}
