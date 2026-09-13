'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { GridPattern } from '@/components/GridPattern'

const VERIFICATION_ERRORS: Record<string, string> = {
  token_expired:
    'This verification link has expired. Request a new one from the login page.',
  invalid_token:
    'This verification link is invalid. Request a new one from the login page.',
  user_not_found: 'We could not find an account for this verification link.',
  unauthorized: 'You are not authorized to complete this verification request.',
}

function EmailVerifiedPageContent() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const error = errorCode
    ? VERIFICATION_ERRORS[errorCode] || 'Email verification failed.'
    : null

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

      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-neutral-300 bg-gradient-to-b from-accent-200 to-white p-4 text-center shadow-lg shadow-accent-300 sm:p-6 md:px-8 md:py-10">
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

          <h1 className="mt-4 font-noto text-2xl/9 font-semibold tracking-tight text-gray-900">
            {error ? 'Verification failed' : 'Email verified'}
          </h1>

          <p className="mt-3 text-sm/6 text-neutral-700">
            {error
              ? error
              : 'Your email address has been verified. If this was completed in the same browser, you can continue straight to your dashboard.'}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={error ? '/login' : '/projects'}
              className="inline-flex items-center justify-center rounded-lg bg-foreground/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-foreground/80"
            >
              {error ? 'Go to login' : 'Continue to dashboard'}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-foreground/15 bg-white/80 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-white"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmailVerifiedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EmailVerifiedPageContent />
    </Suspense>
  )
}
