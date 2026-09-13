'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useCourse, useUpdateCourse } from '@/lib/hooks/use-courses'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { BsFillSave2Fill } from 'react-icons/bs'

type AccessDurationMode = 'lifetime' | 'limited'
type AccessDurationOption = '90' | '180' | '365' | 'custom'

export default function CoursePricingPage() {
  const projectId = useProjectRouteId()
  const params = useParams()
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
  const { toast } = useToast()

  const { data: course, isLoading } = useCourse(projectId, courseId)
  const { mutateAsync: updateCourse, isPending: isUpdating } = useUpdateCourse(
    projectId,
    courseId,
  )

  const [price, setPrice] = useState<string>('0')
  const [accessDurationMode, setAccessDurationMode] =
    useState<AccessDurationMode>('lifetime')
  const [limitedAccessOption, setLimitedAccessOption] =
    useState<AccessDurationOption>('180')
  const [customDurationDays, setCustomDurationDays] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [durationError, setDurationError] = useState<string | null>(null)

  useEffect(() => {
    if (course?.price !== undefined) {
      setPrice(String(course.price))
      setIsDirty(false)
    }

    if (course?.enrollmentValidityDays === null) {
      setAccessDurationMode('lifetime')
      setLimitedAccessOption('180')
      setCustomDurationDays('')
      setDurationError(null)
      setIsDirty(false)
      return
    }

    if (
      typeof course?.enrollmentValidityDays === 'number' &&
      course.enrollmentValidityDays > 0
    ) {
      setAccessDurationMode('limited')
      const dayString = String(course.enrollmentValidityDays)
      if (dayString === '90' || dayString === '180' || dayString === '365') {
        setLimitedAccessOption(dayString)
        setCustomDurationDays('')
      } else {
        setLimitedAccessOption('custom')
        setCustomDurationDays(dayString)
      }
      setDurationError(null)
      setIsDirty(false)
    }
  }, [course?.price, course?.enrollmentValidityDays])

  const computedDurationDays =
    accessDurationMode === 'lifetime'
      ? null
      : limitedAccessOption === 'custom'
        ? Number.parseInt(customDurationDays, 10)
        : Number.parseInt(limitedAccessOption, 10)

  const hasInvalidCustomDuration =
    accessDurationMode === 'limited' &&
    limitedAccessOption === 'custom' &&
    (!customDurationDays.trim() ||
      typeof computedDurationDays !== 'number' ||
      Number.isNaN(computedDurationDays) ||
      computedDurationDays <= 0)

  const previewExpiryDate = (() => {
    const durationDays = computedDurationDays
    if (
      typeof durationDays !== 'number' ||
      Number.isNaN(durationDays) ||
      durationDays <= 0
    ) {
      return null
    }

    const date = new Date()
    date.setDate(date.getDate() + durationDays)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  })()

  const handlePriceChange = (value: string) => {
    // Limit decimal places to 2 digits
    if (value.includes('.')) {
      const [whole, decimal] = value.split('.')
      if (decimal && decimal.length > 2) {
        value = `${whole}.${decimal.slice(0, 2)}`
      }
    }

    setPrice(value)
    setIsDirty(true)

    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      setError('Price must be a positive number')
    } else {
      setError(null)
    }
  }

  const handleAccessDurationModeChange = (mode: AccessDurationMode) => {
    setAccessDurationMode(mode)
    setIsDirty(true)
    if (mode === 'lifetime') {
      setDurationError(null)
    } else if (limitedAccessOption === 'custom' && hasInvalidCustomDuration) {
      setDurationError('Custom duration must be a positive whole number.')
    }
  }

  const handleLimitedAccessOptionChange = (value: AccessDurationOption) => {
    setLimitedAccessOption(value)
    setIsDirty(true)

    if (value !== 'custom') {
      setDurationError(null)
      return
    }

    const parsed = Number.parseInt(customDurationDays, 10)
    if (!customDurationDays.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setDurationError('Custom duration must be a positive whole number.')
    }
  }

  const handleCustomDurationChange = (value: string) => {
    setCustomDurationDays(value)
    setIsDirty(true)

    const parsed = Number.parseInt(value, 10)
    if (!value.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setDurationError('Custom duration must be a positive whole number.')
      return
    }

    setDurationError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numValue = parseFloat(price) || 0
    if (numValue < 0) {
      setError('Price cannot be negative')
      return
    }

    if (hasInvalidCustomDuration) {
      setDurationError('Custom duration must be a positive whole number.')
      return
    }

    const enrollmentValidityDays =
      accessDurationMode === 'lifetime' ? null : computedDurationDays

    try {
      await updateCourse({
        price: numValue,
        enrollmentValidityDays,
      })
      setIsDirty(false)
      toast({
        title: 'Pricing updated',
        description: 'Your course pricing has been saved.',
      })
    } catch (err) {
      toast({
        title: 'Unable to save pricing',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (!projectId || !courseId) {
    return (
      <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Missing course information.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <h2 className="text-3xl font-semibold font-literata tracking-wide">
          Pricing
        </h2>
        <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
          Set the price for your course. Set to 0 for free courses.
        </p>
      </div>

      {/* Pricing Form */}
      <div className=" rounded-sm border border-neutral-200 bg-background p-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-8 rounded-sm bg-muted animate-pulse w-48" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-sm border border-neutral-200 p-4">
                <div className="h-5 w-32 rounded-sm bg-muted animate-pulse" />
                <div className="h-11 rounded-sm bg-muted animate-pulse" />
                <div className="h-4 w-40 rounded-sm bg-muted animate-pulse" />
              </div>
              <div className="space-y-4 rounded-sm border border-neutral-200 p-4">
                <div className="h-5 w-40 rounded-sm bg-muted animate-pulse" />
                <div className="h-20 rounded-sm bg-muted animate-pulse" />
                <div className="h-11 rounded-sm bg-muted animate-pulse" />
              </div>
            </div>
            <div className="h-10 rounded-sm bg-muted animate-pulse w-36" />
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Course Name */}
            <div className="">
              <h3 className="text-xl font-light tracking-wide ml-1 uppercase text-foreground">
                {course?.title || 'Course'}
              </h3>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-7 rounded-sm border border-neutral-200 bg-muted/55 p-4 md:p-5">
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold text-foreground">
                    Pricing
                  </h4>
                  <p className="text-sm text-foreground/80">
                    Set your one-time course price in INR.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="course-price"
                    className="font-medium text-foreground/85"
                  >
                    Price (INR)
                  </Label>
                  <div className="relative mt-2 max-w-sm">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/80 font-medium text-base">
                      ₹
                    </span>
                    <Input
                      id="course-price"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className={`rounded-sm bg-white shadow-none border border-muted-foreground/80 h-11 pl-7 ${
                        error ? 'border-destructive' : ''
                      }`}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <p className="text-xs text-foreground/75">
                    Enter 0 to make this course free.
                  </p>
                </div>
              </div>

              <div className="space-y-7 rounded-sm border border-neutral-200 bg-muted/55 p-4 md:p-5">
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold text-foreground">
                    Enrollment Validity
                  </h4>
                  <p className="text-sm text-foreground/80">
                    Set how long students can access the course after purchase.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Access Duration</Label>
                  <div className="space-y-3 rounded-sm border border-neutral-200 bg-white p-3">
                    <label
                      htmlFor="access-duration-lifetime"
                      className="flex cursor-pointer items-start gap-2"
                    >
                      <input
                        id="access-duration-lifetime"
                        type="radio"
                        name="access-duration-mode"
                        value="lifetime"
                        checked={accessDurationMode === 'lifetime'}
                        onChange={() =>
                          handleAccessDurationModeChange('lifetime')
                        }
                        className="mt-1 h-4 w-4 accent-accent"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Lifetime (Most popular)
                        </p>
                        <p className="text-xs text-foreground/60">
                          Students have permanent access.
                        </p>
                      </div>
                    </label>

                    <label
                      htmlFor="access-duration-limited"
                      className="flex cursor-pointer items-start gap-2"
                    >
                      <input
                        id="access-duration-limited"
                        type="radio"
                        name="access-duration-mode"
                        value="limited"
                        checked={accessDurationMode === 'limited'}
                        onChange={() =>
                          handleAccessDurationModeChange('limited')
                        }
                        className="mt-1 h-4 w-4 accent-accent"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Limited Time
                        </p>
                        <p className="text-xs text-foreground/60">
                          Access expires after a fixed duration.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {accessDurationMode === 'limited' && (
                  <div className="space-y-3 rounded-sm border border-neutral-200 bg-white p-3">
                    <Label htmlFor="limited-access-duration">
                      Limited Duration
                    </Label>
                    <select
                      id="limited-access-duration"
                      value={limitedAccessOption}
                      onChange={(e) =>
                        handleLimitedAccessOptionChange(
                          e.target.value as AccessDurationOption,
                        )
                      }
                      className="h-10 w-full rounded-sm border border-muted-foreground/40 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <option value="90">
                        3 Months (Access expires after 90 days)
                      </option>
                      <option value="180">
                        6 Months (Access expires after 180 days)
                      </option>
                      <option value="365">
                        1 Year (Access expires after 365 days)
                      </option>
                      <option value="custom">Custom (in days)</option>
                    </select>

                    {limitedAccessOption === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="custom-access-days">
                          Custom Duration (Days)
                        </Label>
                        <Input
                          id="custom-access-days"
                          type="number"
                          min={1}
                          step="1"
                          placeholder="e.g. 120"
                          value={customDurationDays}
                          onChange={(e) =>
                            handleCustomDurationChange(e.target.value)
                          }
                          className={`h-10 rounded-sm border ${
                            durationError
                              ? 'border-destructive'
                              : 'border-muted-foreground/60'
                          }`}
                        />
                      </div>
                    )}

                    {durationError && (
                      <p className="text-sm text-destructive">
                        {durationError}
                      </p>
                    )}

                    <p className="text-xs text-foreground/60">
                      Learners will lose access on{' '}
                      <span className="font-medium text-foreground/80">
                        {previewExpiryDate ?? '—'}
                      </span>{' '}
                      if they joined today.
                    </p>
                  </div>
                )}

                <p className="text-xs text-foreground/60">
                  💡 Tip: Shorter access durations are great for high-intensity
                  bootcamps or subscription-style content.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                isUpdating ||
                !isDirty ||
                !!error ||
                !!durationError ||
                hasInvalidCustomDuration
              }
              className="rounded-xs mt-2 bg-accent/90 hover:bg-accent/80 cursor-pointer"
            >
              <BsFillSave2Fill />
              {isUpdating ? 'Saving...' : 'Save pricing'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
