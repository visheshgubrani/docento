'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { HiMail } from 'react-icons/hi'

import { AUTH_CALLBACKS, authClient } from '@/lib/auth'
import { GridPattern } from '@/components/GridPattern'

function ForgotPasswordPageContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const prefilledEmail = searchParams.get('email')
    if (prefilledEmail && !email) {
      setEmail(prefilledEmail)
    }
  }, [searchParams, email])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setEmailError(null)

    if (!email) {
      setEmailError('Email is required')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email')
      return
    }

    setIsLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: AUTH_CALLBACKS.passwordReset,
    })
    setIsLoading(false)

    if (error) {
      setError(error.message || 'Failed to request a password reset.')
      return
    }

    setSuccess(
      'If that account exists, we sent a password reset link to the email address provided.',
    )
  }

  return (
    <div className="relative z-0 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-accent-400 to-accent-50/80 px-4 py-6">
      <div className="absolute inset-0 -z-[1] overflow-hidden pointer-events-none">
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
        href="/login"
        className="group absolute left-0 top-0 hidden items-center gap-0.5 p-6 font-semibold md:flex"
      >
        <MdKeyboardArrowLeft className="text-foreground/80 transition-all duration-200 ease-in-out group-hover:-translate-x-1" />
        <span className="text-foreground/80 group-hover:underline">
          Back to login
        </span>
      </Link>

      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-neutral-300 bg-gradient-to-b from-accent-200 to-white p-4 shadow-lg shadow-accent-300 sm:p-6 md:px-8 md:py-10">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center justify-center">
              <span className="relative size-10 shrink-0">
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
              Forgot your password?
            </h2>
            <p className="mt-2 text-sm/6 text-neutral-700">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-700">{success}</p>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                  <HiMail className="size-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setEmailError(null)
                  }}
                  placeholder="Email address"
                  className={`block w-full rounded-lg bg-white/75 py-2.5 pl-10 pr-3 text-base text-gray-900 border ${emailError ? 'border-red-500' : 'border-foreground/15'} placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 sm:text-sm/6`}
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-lg bg-foreground/90 px-3 py-2.5 text-sm/6 font-semibold text-white hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Sending reset link...' : 'Send reset link'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm/6 text-neutral-700">
            Remembered your password?{' '}
            <Link
              href="/login"
              className="font-semibold text-accent hover:text-accent/80 hover:underline"
            >
              Return to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ForgotPasswordPageContent />
    </Suspense>
  )
}
