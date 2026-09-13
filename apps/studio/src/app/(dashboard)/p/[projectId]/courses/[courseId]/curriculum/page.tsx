'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'

import { useCourse } from '@/lib/hooks/use-courses'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { usePreviewStorage } from '@/lib/hooks/use-preview-storage'
import {
  generateCourseOutline,
  createModule,
  createLesson,
  deleteModule,
  type GenerateCourseOutlineInput,
  type LessonPrimaryContentType,
  type GeneratedCourseOutline,
} from '@/lib/api'

import {
  AIGenerationButton,
  ModuleSkeletonLoader,
} from '../components/ai-generation-box'
import { AICourseOutlineModal } from '../components/ai-course-outline-modal'
import { ConfirmReplaceModal } from '../components/confirm-replace-modal'
import { AIOutlinePreviewModal } from '../components/ai-outline-preview-modal'
import { ManualCourseBuilder } from '../components/manual-course-builder'

const toPrimaryLessonContentType = (
  contentType: string | null | undefined,
): LessonPrimaryContentType => {
  switch (contentType?.toUpperCase()) {
    case 'VIDEO':
    case 'TEXT':
    case 'QUIZ':
    case 'MOCK_TEST':
    case 'ASSIGNMENT':
    case 'YOUTUBE':
      return contentType.toUpperCase() as LessonPrimaryContentType
    default:
      return 'TEXT'
  }
}

export default function CourseCurriculumPage() {
  const projectId = useProjectRouteId()
  const params = useParams()
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
  const queryClient = useQueryClient()

  const {
    data: course,
    isLoading,
    isError,
    error,
  } = useCourse(projectId, courseId)

  // Modal states
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // AI generation state
  const [generatedOutline, setGeneratedOutline] =
    useState<GeneratedCourseOutline | null>(null)
  const [lastGenerationInput, setLastGenerationInput] =
    useState<GenerateCourseOutlineInput | null>(null)

  // Preview storage for persistence
  const outlineStorage = usePreviewStorage<{
    outline: GeneratedCourseOutline
    input: GenerateCourseOutlineInput
    courseId: string
  }>({
    key: `outline-${projectId}-${courseId}`,
    expirationMinutes: 60, // 1 hour expiration
  })

  // Restore preview data from storage on mount
  useEffect(() => {
    if (outlineStorage.isHydrated && outlineStorage.hasPreview()) {
      const storedData = outlineStorage.getPreviewData()
      if (storedData && storedData.courseId === courseId) {
        // Restore the preview state
        setGeneratedOutline(storedData.outline)
        setLastGenerationInput(storedData.input)
        setIsPreviewOpen(true)

        toast({
          title: 'Course Outline Preview Restored',
          description: 'Your previously generated outline has been restored.',
        })
      }
    }
  }, [outlineStorage.isHydrated, courseId])

  // Handle AI button click
  const handleAIButtonClick = useCallback(() => {
    // If modules exist, show confirmation first
    if (course?.modules && course.modules.length > 0) {
      setIsConfirmModalOpen(true)
    } else {
      setIsAIModalOpen(true)
    }
  }, [course?.modules])

  // Handle confirmation to proceed
  const handleConfirmReplace = useCallback(() => {
    setIsConfirmModalOpen(false)
    setIsAIModalOpen(true)
  }, [])

  // Handle generating outline preview
  const handleGenerateOutline = useCallback(
    async (data: {
      description: string
      targetAudience: string
      difficulty: 'beginner' | 'intermediate' | 'advanced'
      moduleCount: number
      lessonsPerModule: number
    }) => {
      setIsGenerating(true)

      try {
        // Generate course outline with AI
        const input: GenerateCourseOutlineInput = {
          description: data.description,
          targetAudience: data.targetAudience || undefined,
          difficulty: data.difficulty,
          moduleCount: data.moduleCount,
          lessonsPerModule: data.lessonsPerModule,
        }

        // Store input for potential regeneration
        setLastGenerationInput(input)

        const outline = await generateCourseOutline(projectId, input)
        setGeneratedOutline(outline)
        setIsAIModalOpen(false)
        setIsPreviewOpen(true)

        // Save to localStorage for persistence
        outlineStorage.savePreview({
          outline,
          input,
          courseId,
        })
      } catch (err) {
        console.error('Failed to generate course outline:', err)
        toast({
          title: 'Generation failed',
          description:
            err instanceof Error
              ? err.message
              : 'Failed to generate course outline. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsGenerating(false)
      }
    },
    [projectId, courseId],
  )

  // Handle regeneration with same parameters
  const handleRegenerate = useCallback(async () => {
    if (!lastGenerationInput) return

    setIsGenerating(true)

    try {
      const outline = await generateCourseOutline(
        projectId,
        lastGenerationInput,
      )
      setGeneratedOutline(outline)

      // Update stored preview
      outlineStorage.savePreview({
        outline,
        input: lastGenerationInput,
        courseId,
      })
    } catch (err) {
      console.error('Failed to regenerate course outline:', err)
      toast({
        title: 'Regeneration failed',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to regenerate course outline. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }, [projectId, lastGenerationInput, courseId])

  // Handle confirming and creating modules/lessons
  const handleConfirmCreate = useCallback(async () => {
    if (!generatedOutline) return

    setIsCreating(true)

    try {
      // Delete existing modules if any
      if (course?.modules && course.modules.length > 0) {
        await Promise.all(
          course.modules.map((mod) =>
            deleteModule(projectId, courseId, mod.id),
          ),
        )
      }

      // Create modules and lessons from the AI outline
      for (const generatedModule of generatedOutline.modules) {
        // Create the module
        const createdModule = await createModule(projectId, courseId, {
          title: generatedModule.title,
          description: generatedModule.description,
        })

        // Create lessons for this module
        for (const generatedLesson of generatedModule.lessons) {
          await createLesson(projectId, courseId, createdModule.id, {
            title: generatedLesson.title,
            contentType: toPrimaryLessonContentType(
              generatedLesson.contentType,
            ),
            description: generatedLesson.description,
            isFree: generatedLesson.isFree,
            duration: generatedLesson.estimatedDuration,
          })
        }
      }

      // Close preview modal and clear state
      setIsPreviewOpen(false)
      setGeneratedOutline(null)
      setLastGenerationInput(null)
      outlineStorage.clearPreview()

      // Invalidate the course query to refetch data
      await queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })

      toast({
        title: 'Course outline created!',
        description: `Created ${generatedOutline.modules.length} modules with lessons.`,
      })
    } catch (err) {
      console.error('Failed to create course outline:', err)
      toast({
        title: 'Creation failed',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to create modules and lessons. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }, [projectId, courseId, course?.modules, queryClient, generatedOutline])

  // Handle closing preview modal
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false)
    // Don't clear storage here - user might want to restore later
    // Storage will auto-expire after 60 minutes
  }, [])

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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        {/* Breadcrumb - above header */}
        <div className="flex items-center w-fit py-1 rounded-md gap-1 text-sm font-medium mb-2">
          <Link
            href={`/p/${projectId}/courses`}
            className="text-accent underline hover:text-foreground transition-colors"
          >
            Courses
          </Link>
          <span className="text-foreground/60 mb-0.5">|</span>
          {isLoading ? (
            <span className="h-4 w-32 bg-neutral-200 rounded animate-pulse" />
          ) : (
            <span className="text-foreground/50">
              {course?.title ?? 'Untitled Course'}
            </span>
          )}
        </div>

        {/* Header with AI button on the right */}
        <div className="flex lg:flex-row flex-col items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold font-literata tracking-wide">
              Curriculum
            </h2>
            <p className="text-lg font-stix text-foreground/80 mt-2 tracking-wide">
              Build modules and lessons that students will take sequentially.
            </p>
          </div>
          {!isLoading && (
            <AIGenerationButton
              onClick={handleAIButtonClick}
              isGenerating={isGenerating || isCreating}
            />
          )}
        </div>
      </div>

      {/* Curriculum Content */}
      {isLoading ? (
        <CurriculumSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Skeleton loader while generating */}
          {isGenerating && <ModuleSkeletonLoader />}

          {/* Manual Course Builder - directly shows module builder */}
          {!isGenerating && (
            <ManualCourseBuilder modules={course?.modules ?? []} />
          )}
        </div>
      )}

      {/* AI Course Outline Modal */}
      <AICourseOutlineModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={handleGenerateOutline}
        isLoading={isGenerating}
      />

      {/* AI Outline Preview Modal */}
      <AIOutlinePreviewModal
        isOpen={isPreviewOpen}
        outline={generatedOutline}
        onClose={handleClosePreview}
        onConfirm={handleConfirmCreate}
        onRegenerate={handleRegenerate}
        isGenerating={isGenerating}
        isCreating={isCreating}
      />

      {/* Confirmation Modal for replacing existing modules */}
      <ConfirmReplaceModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmReplace}
      />
    </div>
  )
}

function CurriculumSkeleton() {
  return (
    <div className="space-y-6">
      {/* Module Skeletons */}
      {[1, 2].map((moduleIndex) => (
        <div
          key={moduleIndex}
          className="rounded-md border border-neutral-300/75 bg-white overflow-hidden"
        >
          {/* Module Row - drag handle + content */}
          <div className="flex items-stretch">
            {/* Drag Handle Column */}
            <div className="flex items-start justify-center py-5 px-1.5 bg-neutral-200/60 border-r border-neutral-200">
              <div className="size-6 rounded bg-neutral-300/60 animate-pulse" />
            </div>

            {/* Module Content */}
            <div className="flex-1">
              {/* Module Header */}
              <div className="flex items-center gap-4 px-5 py-4 bg-neutral-100/50 border-b border-neutral-200/50">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 rounded bg-neutral-200 animate-pulse" />
                  <div className="h-3.5 w-20 rounded bg-neutral-200/70 animate-pulse" />
                </div>
                <div className="size-9 rounded bg-neutral-200/60 animate-pulse" />
              </div>

              {/* Lesson Rows */}
              <div className="divide-y divide-neutral-200">
                {[1, 2, 3]
                  .slice(0, moduleIndex === 1 ? 3 : 2)
                  .map((lessonIndex) => (
                    <div
                      key={lessonIndex}
                      className="flex items-center gap-4 px-3 py-4"
                    >
                      {/* Lesson Drag Handle */}
                      <div className="size-6 rounded bg-neutral-200/60 animate-pulse" />

                      {/* Content Icon */}
                      <div className="flex items-center gap-2">
                        <div className="size-4 rounded bg-neutral-200/70 animate-pulse" />
                        <div className="h-3 w-12 rounded bg-neutral-200/50 animate-pulse" />
                      </div>

                      {/* Lesson Title */}
                      <div className="flex-1">
                        <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
                      </div>

                      {/* Menu Button */}
                      <div className="size-8 rounded bg-neutral-200/50 animate-pulse" />
                    </div>
                  ))}
              </div>

              {/* Add Lesson Row */}
              <div className="border-t border-neutral-200 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="size-5 rounded bg-neutral-200/60 animate-pulse" />
                  <div className="h-4 w-24 rounded bg-neutral-200/70 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add Module Button Skeleton */}
      <div className="rounded-md border border-neutral-300/80 bg-white overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 bg-neutral-100">
          <div className="size-7 rounded-full bg-neutral-200/60 animate-pulse" />
          <div className="h-5 w-28 rounded bg-neutral-200/70 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
