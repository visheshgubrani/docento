import type { Metadata } from 'next'
import Link from 'next/link'

import { fetchAPI } from '@/lib/fetch-api'

import { CheckoutClient } from './checkout-client'
import { siteConfig } from '@/config/site'

type CheckoutCourse = {
  id: string
  title: string
  description: string | null
  price: number | null
  thumbnail: string | null
  modules?: Array<{
    id: string
    title: string
    lessons: Array<{
      id: string
      title: string
    }>
  }>
}

type StorefrontCourseResponse = {
  status: number
  message: string
  data: {
    course: CheckoutCourse
  }
}

export const metadata: Metadata = {
  title: 'Checkout',
  description: `Complete your course purchase on ${siteConfig.name}.`,
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const result = await fetchAPI<StorefrontCourseResponse>(
    `/storefront/courses/${courseId}`,
  )
    .then((response) => ({ course: response.data.course, error: null }))
    .catch((error: unknown) => ({
      course: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load checkout details for this course.',
    }))

  if (!result.course) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
        <div className="w-full rounded-xl border border-border bg-muted/45 p-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Checkout unavailable
          </h1>
          <p className="mt-3 text-sm text-foreground/70">{result.error}</p>
          <Link
            href="/courses"
            className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to courses
          </Link>
        </div>
      </div>
    )
  }

  return <CheckoutClient course={result.course} />
}
