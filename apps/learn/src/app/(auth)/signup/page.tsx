'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { noisePattern } from '@/components/noise-pattern'
import { FiMail, FiLock, FiUser, FiArrowRight } from 'react-icons/fi'
import { siteConfig } from '@/config/site'
import { signUp } from '@/actions/auth'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    form?: string
  }>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: { name?: string; email?: string; password?: string } = {}

    if (!email) {
      nextErrors.email = 'Email is required'
    }
    if (!password) {
      nextErrors.password = 'Password is required'
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const result = await signUp({ email, password, name: name || undefined })

      if (result.success) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setErrors({ form: result.error || 'Sign up failed. Please try again.' })
      }
    } catch {
      setErrors({ form: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen bg-background">
      <Link
        href="/"
        className="absolute top-4 left-4 z-50 flex items-center gap-1 text-sm text-foreground transition-colors hover:underline font-semibold"
      >
        <FiArrowRight className="w-4 h-4 rotate-180" />
        Home
      </Link>

      <div className="hidden lg:flex lg:w-1/2 relative bg-linear-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]">
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay dark:opacity-25"
          style={{
            backgroundPosition: 'center',
            backgroundImage: noisePattern,
          }}
        />
        <div className="relative flex flex-col items-center justify-center p-12 w-full">
          <div className="max-w-lg text-center">
            <p className="text-white text-3xl font-extrabold leading-tight">
              &ldquo;Start your learning journey with us today.&rdquo;
            </p>
            <p className="text-white/70 text-xl font-medium mt-4">
              — Join thousands of learners
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={32}
                height={32}
              />
              <span className="font-brand font-extrabold text-[1.25rem] lowercase text-foreground">
                acme learning
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Create an account
            </h1>
            <p className="text-foreground/70">
              Join us and start learning today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{errors.form}</p>
              </div>
            )}

            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="text"
                placeholder="Full name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5"
              />
            </div>

            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={`pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5 ${
                  errors.email ? 'border-red-700' : ''
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-700">{errors.email}</p>
            )}

            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={`pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5 ${
                  errors.password ? 'border-red-700' : ''
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-700">{errors.password}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-5.5 cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              <span className="flex items-center justify-center font-semibold gap-2">
                {isLoading ? 'Creating account...' : 'Create Account'}
                <FiArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </form>

          <p className="text-center text-sm text-foreground/90 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary underline font-medium">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-8">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
