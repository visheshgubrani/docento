'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Loader2, Check, Plus } from 'lucide-react'
import { FaImage, FaUserTie } from 'react-icons/fa6'
import { MdOutlineAccessTime } from 'react-icons/md'
import { RiFindReplaceLine, RiDeleteBin5Fill } from 'react-icons/ri'
import { BsFillSave2Fill } from 'react-icons/bs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  type CourseDetail,
  type CourseInstructor,
  createCourseInstructorAvatarUpload,
  createCourseThumbnailUpload,
} from '@/lib/api'
import {
  useCourse,
  useToggleCoursePublish,
  useUpdateCourse,
} from '@/lib/hooks/use-courses'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { cn } from '@/lib/utils'
import { MdUnpublished } from 'react-icons/md'

const instructorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Instructor name is required')
    .max(120, 'Name must be under 120 characters'),
  avatar: z.string().max(2048, 'Avatar URL is too long').optional(),
  role: z.string().max(120, 'Role must be under 120 characters').optional(),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional(),
})

const courseSettingsSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional(),
  thumbnail: z.string().optional(),
  category: z.array(z.string()).optional(),
  instructors: z.array(instructorSchema).optional(),
})

type CourseSettingsFormValues = z.infer<typeof courseSettingsSchema>
type CourseInstructorFormValue = NonNullable<
  CourseSettingsFormValues['instructors']
>[number]

const normalizeInstructorForForm = (
  instructor: unknown,
): CourseInstructorFormValue | null => {
  if (typeof instructor === 'string') {
    const name = instructor.trim()
    if (!name) return null
    return { name, avatar: '', role: '', description: '' }
  }

  if (
    !instructor ||
    typeof instructor !== 'object' ||
    Array.isArray(instructor)
  ) {
    return null
  }

  const input = instructor as Record<string, unknown>
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return null

  return {
    name,
    avatar: typeof input.avatar === 'string' ? input.avatar.trim() : '',
    role: typeof input.role === 'string' ? input.role.trim() : '',
    description:
      typeof input.description === 'string' ? input.description.trim() : '',
  }
}

const normalizeInstructorsForForm = (
  instructors: unknown,
): CourseInstructorFormValue[] => {
  if (!Array.isArray(instructors)) return []

  return instructors
    .map((instructor) => normalizeInstructorForForm(instructor))
    .filter((instructor): instructor is CourseInstructorFormValue =>
      Boolean(instructor),
    )
}

export default function CourseInformationPage() {
  const projectId = useProjectRouteId()
  const params = useParams()
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''

  const {
    data: course,
    isLoading,
    isError,
    error,
  } = useCourse(projectId, courseId)

  if (!projectId || !courseId) {
    return (
      <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Missing course information. Select a course from the courses list to
        continue.
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-6">
        <h3 className="text-lg font-semibold text-foreground">
          Unable to load course
        </h3>
        <p className="text-sm text-destructive mt-1">
          {error?.message ?? 'Please try again later.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <h2 className="text-3xl font-semibold font-literata tracking-wide">
          Course Information
        </h2>
        <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
          Update the core details that learners see when browsing your course.
        </p>
      </div>

      {/* Course Settings Form */}
      <CourseSettingsForm
        course={course}
        projectId={projectId}
        courseId={courseId}
        isLoading={isLoading}
      />
    </div>
  )
}

function CourseSettingsForm({
  course,
  projectId,
  courseId,
  isLoading,
}: {
  course?: CourseDetail
  projectId: string
  courseId: string
  isLoading: boolean
}) {
  const { toast } = useToast()
  const { mutateAsync: updateCourseMutation, isPending: isUpdatingCourse } =
    useUpdateCourse(projectId, courseId)
  const { mutateAsync: togglePublishMutation, isPending: isTogglingPublish } =
    useToggleCoursePublish(projectId, courseId)

  const [showSaved, setShowSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CourseSettingsFormValues>({
    resolver: zodResolver(courseSettingsSchema),
    defaultValues: {
      title: course?.title ?? '',
      description: course?.description ?? '',
      thumbnail: course?.thumbnail ?? '',
      category: course?.category ?? [],
      instructors: normalizeInstructorsForForm(course?.instructors),
    },
  })

  const thumbnailUrl = watch('thumbnail')
  const categories = watch('category') ?? []
  const instructors = watch('instructors') ?? []

  useEffect(() => {
    if (course) {
      reset({
        title: course.title ?? '',
        description: course.description ?? '',
        thumbnail: course.thumbnail ?? '',
        category: course.category ?? [],
        instructors: normalizeInstructorsForForm(course.instructors),
      })
    }
  }, [course, reset])

  const onSubmit = async (values: CourseSettingsFormValues) => {
    try {
      const sanitizedInstructors: CourseInstructor[] = (
        values.instructors ?? []
      )
        .map((instructor) => ({
          name: instructor.name.trim(),
          avatar: instructor.avatar?.trim() || null,
          role: instructor.role?.trim() || null,
          description: instructor.description?.trim() || null,
        }))
        .filter((instructor) => instructor.name.length > 0)

      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        thumbnail: values.thumbnail?.trim() ? values.thumbnail.trim() : null,
        category: values.category ?? [],
        instructors: sanitizedInstructors,
      }

      await updateCourseMutation(payload)
      reset({
        ...values,
        title: payload.title,
        description: payload.description ?? '',
        thumbnail: payload.thumbnail ?? '',
        category: payload.category,
        instructors: payload.instructors.map((instructor) => ({
          name: instructor.name,
          avatar: instructor.avatar ?? '',
          role: instructor.role ?? '',
          description: instructor.description ?? '',
        })),
      })

      // Show saved message on button
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)

      toast({
        title: 'Course updated',
        description: 'Your course information has been saved.',
      })
    } catch (error) {
      toast({
        title: 'Unable to save changes',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
    }
  }

  const handleTogglePublish = async () => {
    try {
      const updated = await togglePublishMutation()
      toast({
        title: updated.isPublished ? 'Course published' : 'Course unpublished',
        description: updated.isPublished
          ? 'Students can now see this course.'
          : 'The course is hidden while you keep editing.',
      })
    } catch (error) {
      toast({
        title: 'Unable to update publish status',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
    }
  }

  const isSaving = isUpdatingCourse || isSubmitting
  const isDisabled = isLoading || !course

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Publication Status Skeleton */}
        <div className="flex items-center justify-between max-w-2xl gap-8">
          <div className="flex-1">
            <div className="h-6 w-40 bg-foreground/10 animate-pulse rounded-sm" />
            <div className="h-4 w-64 bg-foreground/10 animate-pulse rounded-sm mt-2" />
          </div>
          <div className="h-10 w-32 bg-foreground/10 animate-pulse rounded-sm" />
        </div>

        <form className="space-y-8">
          {/* Title Skeleton */}
          <div className="space-y-2 max-w-2xl">
            <div className="h-5 w-20 bg-foreground/10 animate-pulse rounded-sm" />
            <div className="h-11 w-full bg-foreground/10 animate-pulse rounded-sm" />
            <div className="h-3 w-48 bg-foreground/10 animate-pulse rounded-sm mt-1" />
          </div>

          {/* Description Skeleton */}
          <div className="space-y-2 max-w-2xl">
            <div className="h-5 w-28 bg-foreground/10 animate-pulse rounded-sm" />
            <div className="h-24 w-full bg-foreground/10 animate-pulse rounded-sm" />
            <div className="h-3 w-72 bg-foreground/10 animate-pulse rounded-sm mt-1" />
          </div>

          {/* Categories Skeleton */}
          <div className="space-y-2 max-w-2xl">
            <div className="h-5 w-24 bg-foreground/10 animate-pulse rounded-sm" />
            <div className="flex gap-2">
              <div className="h-11 flex-1 bg-foreground/10 animate-pulse rounded-sm" />
              <div className="h-11 w-16 bg-foreground/10 animate-pulse rounded-sm" />
            </div>
          </div>

          {/* Thumbnail Skeleton */}
          <div className="space-y-2">
            <div className="h-5 w-36 bg-foreground/10 animate-pulse rounded-sm" />
            <div className="h-4 w-64 bg-foreground/10 animate-pulse rounded-sm" />
            <div className="h-[200px] max-w-2xl bg-foreground/10 animate-pulse rounded-sm mt-2" />
          </div>

          {/* Instructors Skeleton */}
          <div className="space-y-2 max-w-2xl">
            <div className="h-5 w-24 bg-foreground/10 animate-pulse rounded-sm" />
            <div className="flex gap-2">
              <div className="h-11 flex-1 bg-foreground/10 animate-pulse rounded-sm" />
              <div className="h-11 w-32 bg-foreground/10 animate-pulse rounded-sm" />
            </div>
          </div>

          {/* Save Button Skeleton */}
          <div className="h-11 w-40 bg-foreground/10 animate-pulse rounded-sm" />
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Publish Button - At top */}
      <div className="flex items-center justify-between max-w-2xl gap-8">
        <div>
          <p className="font-semibold font-noto text-lg">Publication Status</p>
          <p className="text-xs text-foreground/60 mt-0.5">
            {course?.isPublished
              ? 'Your course is live and visible to students.'
              : 'Your course is in draft mode.'}
          </p>
        </div>
        <Button
          type="button"
          disabled={isDisabled || isTogglingPublish}
          onClick={handleTogglePublish}
          className={cn(
            'rounded-sm cursor-pointer min-w-[120px]',
            course?.isPublished
              ? 'bg-success/50 hover:bg-success/80 text-foreground tracking-wide font-semibold font-noto border-2 border-success'
              : 'bg-accent-foreground border-2 shadow-md tracking-wide border-foreground/80 text-white hover:bg-accent/60 font-semibold font-noto',
          )}
        >
          {isTogglingPublish ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Publishing...
            </>
          ) : course?.isPublished ? (
            <>
              <MdUnpublished className="size-5" />
              Unpublish
            </>
          ) : (
            <>
              <MdOutlineAccessTime className="size-5" />
              Publish Course
            </>
          )}
        </Button>
      </div>

      {/* Form */}
      <form className="space-y-10" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1 max-w-2xl">
          <Label
            htmlFor="course-title"
            className="font-semibold font-noto text-lg"
          >
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="course-title"
            placeholder="Course title"
            disabled={isDisabled}
            {...register('title')}
            className={cn(
              'rounded-xs shadow-none border border-muted-foreground/60 h-11 bg-background mt-1.5',
              errors.title && 'border-destructive',
            )}
          />
          {errors.title ? (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          ) : (
            <p className="text-xs text-foreground/60 mt-2">
              Create a clear, engaging title for your course
            </p>
          )}
        </div>

        <div className="space-y-1 max-w-2xl">
          <Label
            htmlFor="course-description"
            className="font-semibold font-noto text-lg"
          >
            Description
          </Label>
          <Textarea
            id="course-description"
            placeholder="Summarize the course for students"
            rows={4}
            disabled={isDisabled}
            {...register('description')}
            className={cn(
              'rounded-xs shadow-none border border-muted-foreground/60 resize-none bg-background mt-1.5',
              errors.description && 'border-destructive',
            )}
          />
          {errors.description ? (
            <p className="text-sm text-destructive">
              {errors.description.message}
            </p>
          ) : (
            <p className="text-xs text-foreground/60 mt-2">
              Describe what learners will gain from your course
            </p>
          )}
        </div>

        {/* Category Section */}
        <div className="space-y-1 max-w-2xl">
          <Label className="font-semibold font-noto text-lg">Categories</Label>
          <CategoryInput
            value={categories}
            onChange={(cats) =>
              setValue('category', cats, { shouldDirty: true })
            }
            disabled={isDisabled}
          />
          <p className="text-xs text-foreground/60 mt-2.5">
            Add categories to help students find your course
          </p>
        </div>

        {/* Thumbnail Section */}
        <div className="space-y-1">
          <Label className="font-semibold font-noto text-lg">
            Course Thumbnail
          </Label>
          <p className="text-xs text-foreground/60 mt-0.5">
            Personalize your course with a custom image
          </p>
          <ThumbnailUploader
            value={thumbnailUrl || ''}
            onChange={(url) =>
              setValue('thumbnail', url, { shouldDirty: true })
            }
            disabled={isDisabled}
            error={errors.thumbnail?.message}
            projectId={projectId}
            courseId={courseId}
          />
        </div>

        {/* Instructors Section */}
        <div className="space-y-1 max-w-2xl">
          <InstructorInput
            value={instructors}
            onChange={(ins) =>
              setValue('instructors', ins, { shouldDirty: true })
            }
            disabled={isDisabled}
            projectId={projectId}
            courseId={courseId}
          />
          <p className="text-xs text-foreground/60 mt-2.5">
            Add instructor bios with avatars, roles, and short descriptions
          </p>
        </div>

        <Button
          type="submit"
          className="rounded-sm border-2 shadow-md border-foreground bg-accent/90 hover:bg-accent/80 cursor-pointer px-8 mt-2"
          disabled={isDisabled || isSaving || !isDirty}
        >
          {showSaved ? (
            <>
              <Check className="size-4" />
              Saved successfully
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <BsFillSave2Fill className="size-4" />
              Save changes
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

function ThumbnailUploader({
  value,
  onChange,
  disabled,
  error,
  projectId,
  courseId,
}: {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  error?: string
  projectId: string
  courseId: string
}) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [urlInput, setUrlInput] = useState(value)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUrlInput(value)
    // If value is a valid URL, clear any local preview
    if (value && !value.startsWith('blob:')) {
      setPreviewUrl(null)
    }
  }, [value])

  const handleUrlChange = useCallback(
    (url: string) => {
      setUrlInput(url)
      setImageError(false)
      setPreviewUrl(null)
      if (url) {
        setIsLoadingImage(true)
      }
      onChange(url)
    },
    [onChange],
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Reset file input for next selection
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Create a local URL preview immediately
      const localUrl = URL.createObjectURL(file)
      setPreviewUrl(localUrl)
      setImageError(false)
      setIsUploading(true)
      setIsLoadingImage(true)

      try {
        // Step 1: Get presigned URL from backend
        const { presignedUrl, fileUrl } = await createCourseThumbnailUpload(
          projectId,
          courseId,
          file.name,
          file.type,
        )

        // Step 2: Upload directly to R2
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image to storage')
        }

        // Step 3: Update form with the permanent URL
        setUrlInput(fileUrl)
        onChange(fileUrl)
        // Keep preview URL until the actual image loads - it will be cleared in useEffect when value changes
        // Don't revoke the blob URL yet, let useEffect handle it

        toast({
          title: 'Image uploaded',
          description: 'Your thumbnail has been uploaded successfully.',
        })
      } catch (err) {
        console.error('Thumbnail upload failed:', err)
        setImageError(true)
        setPreviewUrl(null)
        toast({
          title: 'Upload failed',
          description:
            err instanceof Error
              ? err.message
              : 'Failed to upload image. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
        setIsLoadingImage(false)
      }
    },
    [projectId, courseId, onChange, toast],
  )

  const handleRemove = useCallback(() => {
    onChange('')
    setUrlInput('')
    setPreviewUrl(null)
    setImageError(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onChange])

  const handleImageLoad = useCallback(() => {
    setIsLoadingImage(false)
    setImageError(false)
  }, [])

  const handleImageError = useCallback(() => {
    setIsLoadingImage(false)
    setImageError(true)
  }, [])

  const displayUrl = previewUrl || value

  return (
    <div className="mt-4 max-w-2xl">
      {/* Image Preview or Upload Area */}
      {displayUrl ? (
        <div>
          <div className="relative rounded-sm border border-neutral-400/70 bg-white overflow-hidden min-h-[150px] md:min-h-[281px]">
            <div className="relative h-full w-full">
              {isLoadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <Loader2 className="size-5 text-accent animate-spin" />
                </div>
              )}
              {imageError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 min-h-[150px] md:min-h-[281px] text-muted-foreground">
                  <FaImage className="size-6 mb-2" />
                  <p className="text-xs text-foreground/60">
                    Failed to load image
                  </p>
                </div>
              ) : (
                <img
                  src={displayUrl}
                  alt="Course thumbnail"
                  className={cn(
                    'w-full h-full object-cover aspect-video',
                    isLoadingImage && 'opacity-0',
                  )}
                  loading="lazy"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>
          </div>
          {/* Action buttons below image */}
          <div className="flex gap-3 justify-end rounded-sm  px-1 mt-4">
            <Button
              type="button"
              variant="ghost"
              className="rounded-sm bg-white text-foreground/80 hover:text-foreground hover:font-medium transition-all ease-in-out duration-100 border border-foreground/60 cursor-pointer"
              onClick={() =>
                !disabled && !isUploading && fileInputRef.current?.click()
              }
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <RiFindReplaceLine className="size-4" />
                  Replace Image
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-sm bg-white border border-foreground/60 cursor-pointer text-foreground/80 hover:text-destructive/80 hover:font-medium transition-all ease-in-out duration-100"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <RiDeleteBin5Fill className="size-4" />
              Remove Image
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-sm border border-neutral-400/70 bg-white overflow-hidden min-h-[150px] md:min-h-[281px] p-4 cursor-pointer"
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="h-full w-full border-2 border-dashed border-neutral-400/70 rounded-sm flex flex-col items-center justify-center min-h-[250px]">
            {isUploading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="size-8 text-accent animate-spin mb-3" />
                <p className="text-sm font-semibold text-foreground/80">
                  Uploading Image...
                </p>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/icons/image.svg"
                  alt="Upload"
                  className="size-16 mb-3"
                />
                <p className="text-base font-noto font-semibold text-foreground/80 mb-1">
                  Upload Files
                </p>
                <p className="text-xs font-noto text-foreground/40 text-center px-4">
                  Browse and choose the files you want to upload
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* OR Divider - Commented out for now
            <div className='flex items-center gap-3 my-5'>
                <div className='flex-1 h-px bg-border' />
                <span className='text-xs text-foreground/50 font-medium'>OR</span>
                <div className='flex-1 h-px bg-border' />
            </div>

            <Input
                type='url'
                placeholder='Enter image URL'
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={disabled}
                className={cn(
                    'rounded-xs mb-2 shadow-none border border-muted-foreground/60 h-11 bg-background mt-2',
                    error && 'border-destructive'
                )}
            />
            <Label className='text-sm font-medium text-foreground/60'>Add an image URL for your course thumbnail</Label>
            */}

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  )
}

function CategoryInput({
  value,
  onChange,
  disabled,
  placeholder = 'Type a category and press Enter',
}: {
  value: string[]
  onChange: (categories: string[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [inputValue, setInputValue] = useState('')

  const handleAddCategory = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }, [inputValue, value, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddCategory()
      }
    },
    [handleAddCategory],
  )

  const handleRemove = useCallback(
    (category: string) => {
      onChange(value.filter((c) => c !== category))
    },
    [value, onChange],
  )

  return (
    <div className="mt-1.5">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="rounded-xs shadow-none border border-muted-foreground/60 h-11 bg-background flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          onClick={handleAddCategory}
          disabled={disabled || !inputValue.trim()}
          className="rounded-xs cursor-pointer h-11 px-4 border-muted-foreground bg-accent-foreground/50 text-foreground"
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-4">
          {value.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 text-sm font-medium text-foreground/80"
            >
              {category}
              <button
                type="button"
                onClick={() => handleRemove(category)}
                disabled={disabled}
                className="hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function InstructorAvatarUploader({
  value,
  onChange,
  disabled,
  projectId,
  courseId,
}: {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  projectId: string
  courseId: string
}) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      setIsUploading(true)
      setImageError(false)

      try {
        const { presignedUrl, fileUrl } =
          await createCourseInstructorAvatarUpload(
            projectId,
            courseId,
            file.name,
            file.type,
          )

        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload avatar image')
        }

        onChange(fileUrl)
        toast({
          title: 'Avatar uploaded',
          description: 'Instructor avatar has been uploaded successfully.',
        })
      } catch (err) {
        setImageError(true)
        toast({
          title: 'Upload failed',
          description:
            err instanceof Error
              ? err.message
              : 'Failed to upload avatar. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
      }
    },
    [projectId, courseId, onChange, toast],
  )

  const handleRemove = useCallback(() => {
    onChange('')
    setImageError(false)
  }, [onChange])

  return (
    <div className="flex items-center gap-3">
      <div className="relative size-14 rounded-full border border-muted-foreground/30 bg-muted/30 overflow-hidden shrink-0">
        {value && !imageError ? (
          <img
            src={value}
            alt="Instructor avatar"
            className="size-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="size-full flex items-center justify-center text-muted-foreground">
            <FaUserTie className="size-5" />
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="size-4 animate-spin text-accent" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            !disabled && !isUploading && fileInputRef.current?.click()
          }
          disabled={disabled || isUploading}
          className="rounded-xs h-9 px-3 border border-muted-foreground/50 bg-background text-foreground/80 hover:text-foreground cursor-pointer"
        >
          {isUploading ? 'Uploading...' : value ? 'Replace' : 'Upload'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="rounded-xs h-9 px-3 border border-muted-foreground/50 bg-background text-foreground/80 hover:text-destructive cursor-pointer"
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}

function InstructorInput({
  value,
  onChange,
  disabled,
  projectId,
  courseId,
}: {
  value: CourseInstructorFormValue[]
  onChange: (instructors: CourseInstructorFormValue[]) => void
  disabled?: boolean
  projectId: string
  courseId: string
}) {
  const createEmptyInstructor = useCallback(
    (): CourseInstructorFormValue => ({
      name: '',
      avatar: '',
      role: '',
      description: '',
    }),
    [],
  )

  const sanitizeInstructor = useCallback(
    (instructor: CourseInstructorFormValue): CourseInstructorFormValue => ({
      name: instructor.name.trim(),
      avatar: instructor.avatar?.trim() || '',
      role: instructor.role?.trim() || '',
      description: instructor.description?.trim() || '',
    }),
    [],
  )

  const [isAdding, setIsAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<CourseInstructorFormValue>(
    createEmptyInstructor(),
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<CourseInstructorFormValue | null>(
    null,
  )

  useEffect(() => {
    if (editingIndex === null) return
    if (!value[editingIndex]) {
      setEditingIndex(null)
      setEditDraft(null)
    }
  }, [editingIndex, value])

  const startAdd = useCallback(() => {
    setEditingIndex(null)
    setEditDraft(null)
    setIsAdding(true)
    setAddDraft(createEmptyInstructor())
  }, [createEmptyInstructor])

  const cancelAdd = useCallback(() => {
    setIsAdding(false)
    setAddDraft(createEmptyInstructor())
  }, [createEmptyInstructor])

  const handleAdd = useCallback(() => {
    const nextInstructor = sanitizeInstructor(addDraft)
    if (!nextInstructor.name) return

    onChange([...value, nextInstructor])
    setIsAdding(false)
    setAddDraft(createEmptyInstructor())
  }, [addDraft, createEmptyInstructor, onChange, sanitizeInstructor, value])

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, currentIndex) => currentIndex !== index))
      if (editingIndex === index) {
        setEditingIndex(null)
        setEditDraft(null)
      }
    },
    [editingIndex, onChange, value],
  )

  const startEdit = useCallback(
    (index: number) => {
      setEditingIndex(index)
      setEditDraft(value[index])
      setIsAdding(false)
    },
    [value],
  )

  const cancelEdit = useCallback(() => {
    setEditingIndex(null)
    setEditDraft(null)
  }, [])

  const saveEdit = useCallback(() => {
    if (editingIndex === null || !editDraft) return

    const nextInstructor = sanitizeInstructor(editDraft)
    if (!nextInstructor.name) return

    onChange(
      value.map((instructor, index) =>
        index === editingIndex ? nextInstructor : instructor,
      ),
    )
    setEditingIndex(null)
    setEditDraft(null)
  }, [editDraft, editingIndex, onChange, sanitizeInstructor, value])

  const canAddInstructor = addDraft.name.trim().length > 0
  const canSaveEdit =
    editDraft !== null &&
    editDraft.name.trim().length > 0 &&
    editingIndex !== null

  return (
    <div className="mt-2 space-y-5">
      <div className="flex items-start flex-col justify-between gap-4">
        <Label className="font-semibold font-noto text-lg">Instructors</Label>
        <Button
          type="button"
          variant="ghost"
          onClick={startAdd}
          disabled={disabled || isAdding || editingIndex !== null}
          className="rounded-xs h-9 px-3 border border-muted-foreground/60 bg-accent-foreground/50 text-foreground hover:bg-accent-foreground/60 cursor-pointer"
        >
          <Plus className="size-4" />
          Add Instructor
        </Button>
      </div>

      {isAdding && (
        <div className="rounded-sm border border-muted-foreground/30 bg-background p-4 space-y-4">
          <p className="text-sm font-medium text-foreground">New Instructor</p>

          <InstructorAvatarUploader
            value={addDraft.avatar || ''}
            onChange={(url) =>
              setAddDraft((prev) => ({ ...prev, avatar: url }))
            }
            disabled={disabled}
            projectId={projectId}
            courseId={courseId}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground/70">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={addDraft.name}
                onChange={(e) =>
                  setAddDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Instructor name"
                disabled={disabled}
                className="rounded-xs shadow-none border border-muted-foreground/60 h-10 bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground/70">
                Role
              </Label>
              <Input
                value={addDraft.role || ''}
                onChange={(e) =>
                  setAddDraft((prev) => ({ ...prev, role: e.target.value }))
                }
                placeholder="Lead Instructor"
                disabled={disabled}
                className="rounded-xs shadow-none border border-muted-foreground/60 h-10 bg-background"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-foreground/70">
              Description
            </Label>
            <Textarea
              value={addDraft.description || ''}
              onChange={(e) =>
                setAddDraft((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Short instructor bio"
              rows={3}
              disabled={disabled}
              className="rounded-xs shadow-none border border-muted-foreground/60 resize-none bg-background"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancelAdd}
              disabled={disabled}
              className="rounded-xs h-9 px-3 hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={disabled || !canAddInstructor}
              className="rounded-xs h-9 px-4 cursor-pointer"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {value.length === 0 && !isAdding ? (
        <div className="rounded-sm border border-dashed border-muted-foreground/50 px-4 py-6 text-sm text-foreground/60">
          No instructors added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((instructor, index) => {
            const isEditing = editingIndex === index && editDraft !== null

            if (isEditing) {
              return (
                <div
                  key={`${instructor.name || 'instructor'}-${index}`}
                  className="rounded-sm border border-muted-foreground/30 bg-background p-4 space-y-4"
                >
                  <p className="text-sm font-medium text-foreground">
                    Edit Instructor
                  </p>

                  <InstructorAvatarUploader
                    value={editDraft.avatar || ''}
                    onChange={(url) =>
                      setEditDraft((prev) =>
                        prev ? { ...prev, avatar: url } : prev,
                      )
                    }
                    disabled={disabled}
                    projectId={projectId}
                    courseId={courseId}
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground/70">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, name: e.target.value } : prev,
                          )
                        }
                        placeholder="Instructor name"
                        disabled={disabled}
                        className="rounded-xs shadow-none border border-muted-foreground/60 h-10 bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground/70">
                        Role
                      </Label>
                      <Input
                        value={editDraft.role || ''}
                        onChange={(e) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, role: e.target.value } : prev,
                          )
                        }
                        placeholder="Lead Instructor"
                        disabled={disabled}
                        className="rounded-xs shadow-none border border-muted-foreground/60 h-10 bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground/70">
                      Description
                    </Label>
                    <Textarea
                      value={editDraft.description || ''}
                      onChange={(e) =>
                        setEditDraft((prev) =>
                          prev
                            ? { ...prev, description: e.target.value }
                            : prev,
                        )
                      }
                      placeholder="Short instructor bio"
                      rows={3}
                      disabled={disabled}
                      className="rounded-xs shadow-none border border-muted-foreground/60 resize-none bg-background"
                    />
                  </div>

                  <div className="flex justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemove(index)}
                      disabled={disabled}
                      className="rounded-xs h-9 px-3 border border-muted-foreground/50 text-destructive hover:text-destructive cursor-pointer"
                    >
                      Delete
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={disabled}
                        className="rounded-xs h-9 px-3 cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={saveEdit}
                        disabled={disabled || !canSaveEdit}
                        className="rounded-xs h-9 px-4 cursor-pointer"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={`${instructor.name || 'instructor'}-${index}`}
                className="rounded-sm border border-muted-foreground/30 bg-background p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative size-12 rounded-full border border-muted-foreground/30 bg-muted/30 overflow-hidden shrink-0">
                      {instructor.avatar ? (
                        <img
                          src={instructor.avatar}
                          alt={instructor.name || 'Instructor avatar'}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-muted-foreground">
                          <FaUserTie className="size-4.5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {instructor.name}
                      </p>
                      {instructor.role ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {instructor.role}
                        </p>
                      ) : null}
                      {instructor.description ? (
                        <p className="text-xs text-foreground/70 mt-2 line-clamp-2">
                          {instructor.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => startEdit(index)}
                      disabled={disabled}
                      className="rounded-xs h-8 px-3 border border-muted-foreground/50 text-foreground/80 hover:text-foreground cursor-pointer"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemove(index)}
                      disabled={disabled}
                      className="rounded-xs h-8 px-3 border border-muted-foreground/50 text-foreground/80 hover:text-destructive cursor-pointer"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
