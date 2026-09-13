'use client'

import { FormEvent, Suspense, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MdKeyboardArrowLeft } from 'react-icons/md'
import { HiEye, HiEyeOff, HiLockClosed } from 'react-icons/hi'

import { authClient } from '@/lib/auth'
import { GridPattern } from '@/components/GridPattern'

const INVALID_RESET_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: 'This password reset link is invalid or has expired.',
  invalid_token: 'This password reset link is invalid or has expired.',
}

function ResetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const errorCode = searchParams.get('error')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null)
  const [isLoading, setIsLoading] = useState(false)

  const tokenError = useMemo(() => {
    if (errorCode) {
      return (
        INVALID_RESET_MESSAGES[errorCode] ||
        'This password reset link is invalid or has expired.'
      )
    }

    if (!token) {
      return 'This password reset link is missing a token.'
    }

    return null
  }, [errorCode, token])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setNewPasswordError(null)
    setConfirmPasswordError(null)

    if (!token) {
      setError('This password reset link is invalid or has expired.')
      return
    }

    if (!newPassword) {
      setNewPasswordError('New password is required')
      return
    }

    if (newPassword.length < 8) {
      setNewPasswordError('Password must be at least 8 characters')
      return
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password')
      return
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
      return
    }

    setIsLoading(true)
    const { error } = await authClient.resetPassword({
      newPassword,
      token,
    })
    setIsLoading(false)

    if (error) {
      setError(error.message || 'Failed to reset your password.')
      return
    }

    setSuccess('Your password has been updated. Redirecting you to login...')
    setTimeout(() => {
      router.replace('/login?reset=success')
    }, 1200)
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
              Reset your password
            </h2>
            <p className="mt-2 text-sm/6 text-neutral-700">
              Choose a new password for your account.
            </p>
          </div>

          {tokenError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{tokenError}</p>
            </div>
          )}

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
                  <HiLockClosed className="size-5" />
                </span>
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setNewPasswordError(null)
                  }}
                  disabled={Boolean(tokenError) || isLoading}
                  placeholder="New password"
                  className={`block w-full rounded-lg bg-white/75 py-2.5 pl-10 pr-10 text-base text-gray-900 border ${newPasswordError ? 'border-red-500' : 'border-foreground/15'} placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm/6`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={Boolean(tokenError) || isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {showPassword ? (
                    <HiEyeOff className="size-5" />
                  ) : (
                    <HiEye className="size-5" />
                  )}
                </button>
              </div>
              {newPasswordError && (
                <p className="mt-1 text-xs text-red-600">{newPasswordError}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                  <HiLockClosed className="size-5" />
                </span>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setConfirmPasswordError(null)
                  }}
                  disabled={Boolean(tokenError) || isLoading}
                  placeholder="Confirm new password"
                  className={`block w-full rounded-lg bg-white/75 py-2.5 pl-10 pr-10 text-base text-gray-900 border ${confirmPasswordError ? 'border-red-500' : 'border-foreground/15'} placeholder:text-neutral-600 shadow-sm shadow-accent-200 focus:outline-2 focus:-outline-offset-2 focus:outline-accent-foreground/80 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm/6`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  disabled={Boolean(tokenError) || isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {showConfirmPassword ? (
                    <HiEyeOff className="size-5" />
                  ) : (
                    <HiEye className="size-5" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="mt-1 text-xs text-red-600">
                  {confirmPasswordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={Boolean(tokenError) || isLoading}
              className="flex w-full justify-center rounded-lg bg-foreground/90 px-3 py-2.5 text-sm/6 font-semibold text-white hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Updating password...' : 'Update password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm/6 text-neutral-700">
            Need a new link?{' '}
            <Link
              href="/forgot-password"
              className="font-semibold text-accent hover:text-accent/80 hover:underline"
            >
              Request another reset email
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}
