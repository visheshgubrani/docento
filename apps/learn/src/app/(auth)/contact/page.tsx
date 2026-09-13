'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import {
  FiArrowRight,
  FiBookOpen,
  FiMail,
  FiMessageSquare,
  FiUser,
} from 'react-icons/fi'
import { noisePattern } from '@/components/noise-pattern'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { siteConfig } from '@/config/site'

type ContactErrors = {
  name?: string
  email?: string
  subject?: string
  message?: string
  form?: string
}

function ContactForm() {
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<ContactErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const instructor = searchParams.get('instructor')?.trim()
    const courseTitle = searchParams.get('courseTitle')?.trim()

    if (instructor && courseTitle) {
      setSubject(`Question about ${courseTitle}`)
      setMessage(`Hi ${instructor}, I have a question about ${courseTitle}.`)
      return
    }

    if (courseTitle) {
      setSubject(`Question about ${courseTitle}`)
      setMessage(`Hi team, I have a question about ${courseTitle}.`)
      return
    }

    if (instructor) {
      setSubject(`Question for ${instructor}`)
      setMessage(`Hi ${instructor}, I have a question.`)
    }
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: ContactErrors = {}

    if (!name.trim()) nextErrors.name = 'Name is required'
    if (!email.trim()) nextErrors.email = 'Email is required'
    if (email.trim() && !email.includes('@'))
      nextErrors.email = 'Enter a valid email'
    if (!subject.trim()) nextErrors.subject = 'Subject is required'
    if (!message.trim()) nextErrors.message = 'Message is required'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setSuccessMessage('')
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setSuccessMessage('')

    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      setSuccessMessage(
        'Thanks! We received your message and will get back to you soon.',
      )
      setMessage('')
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' })
    } finally {
      setIsSubmitting(false)
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

      <div className="hidden lg:flex lg:w-1/2 relative bg-linear-to-b from-[#7b627d] to-[#8f6976] dark:from-[#412c42] dark:to-[#3c1a26]">
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
              &ldquo;Every question asked is one step closer to mastery.&rdquo;
            </p>
            <p className="text-white/70 text-xl font-medium mt-4">
              — {siteConfig.name} Team
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
              Contact Support
            </h1>
            <p className="text-foreground/70">
              Tell us what you need help with
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form ? (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{errors.form}</p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            ) : null}

            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                className={`pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5 ${
                  errors.name ? 'border-red-700' : ''
                }`}
              />
            </div>
            {errors.name ? (
              <p className="text-sm text-red-700">{errors.name}</p>
            ) : null}

            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                className={`pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5 ${
                  errors.email ? 'border-red-700' : ''
                }`}
              />
            </div>
            {errors.email ? (
              <p className="text-sm text-red-700">{errors.email}</p>
            ) : null}

            <div className="relative">
              <FiBookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={isSubmitting}
                className={`pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5 ${
                  errors.subject ? 'border-red-700' : ''
                }`}
              />
            </div>
            {errors.subject ? (
              <p className="text-sm text-red-700">{errors.subject}</p>
            ) : null}

            <div className="relative">
              <FiMessageSquare className="absolute left-3 top-3 w-4 h-4 text-foreground/70" />
              <Textarea
                placeholder="Write your message..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={isSubmitting}
                className={`min-h-32 pl-10 border border-muted-foreground placeholder:text-muted-foreground ${
                  errors.message ? 'border-red-700' : ''
                }`}
              />
            </div>
            {errors.message ? (
              <p className="text-sm text-red-700">{errors.message}</p>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full py-5.5 cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              <span className="flex items-center justify-center font-semibold gap-2">
                {isSubmitting ? 'Sending...' : 'Send Message'}
                <FiArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </form>

          <p className="text-center text-sm text-foreground/90 mt-6">
            Prefer email?{' '}
            <a
              href="mailto:support@acmelearning.com"
              className="text-primary underline font-medium"
            >
              support@acmelearning.com
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function ContactPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ContactForm />
    </React.Suspense>
  )
}
