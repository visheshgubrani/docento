'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BsThreeDotsVertical } from 'react-icons/bs'
import { FaVideo, FaYoutube } from 'react-icons/fa'
import { X, Plus, Pencil, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useCourse } from '@/lib/hooks/use-courses'
import { useUpdateLesson } from '@/lib/hooks/use-lessons'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  deleteVideoFromLesson,
  fetchLessonUploads,
  deleteLessonUpload,
  getAssignment,
  deleteAssignment,
  getQuiz,
  deleteQuiz,
  type Assignment,
  type Quiz,
  type Upload,
} from '@/lib/api'
import { IoAddCircleOutline } from 'react-icons/io5'
import { VideoUploadModal } from './components/video-upload-modal'
import { VideoPreviewBox } from './components/video-preview-box'
import { YouTubeLinkModal } from './components/youtube-link-modal'
import { YouTubePreviewBox } from './components/youtube-preview-box'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { TextImagesEditor } from './components/text-images-editor'
import { QuizPreviewBox } from './components/quiz-preview-box'
import { ResourcesUploadModal } from './components/ResourcesUploadModal'
import { ResourcesContentPreview } from './components/ResourcesContentPreview'
import { MdOutlineAssignment } from 'react-icons/md'
import { BsQuestionCircleFill } from 'react-icons/bs'
import { LuLetterText } from 'react-icons/lu'
import { FaPenToSquare } from 'react-icons/fa6'

// Content types with specified icons - single accent color for all
const contentTypes = [
  { id: 'video', label: 'Video', icon: FaVideo },
  { id: 'text', label: 'Text & Images', icon: LuLetterText },
  { id: 'quiz', label: 'Quiz', icon: BsQuestionCircleFill },
  // { id: "mock-test", label: "Mock Test", icon: FaPenToSquare },
  { id: 'assignment', label: 'Assignment', icon: MdOutlineAssignment },
  { id: 'youtube', label: 'YouTube / External Link', icon: FaYoutube },
]

const BLOCK_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'listItem',
  'taskItem',
])

const stripBasicMarkdown = (value: string): string =>
  value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim()

const extractTextFromTiptapJson = (node: unknown): string => {
  const chunks: string[] = []

  const walk = (value: unknown) => {
    if (!value) return

    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (typeof value !== 'object') return

    const input = value as {
      type?: string
      text?: string
      content?: unknown[]
    }

    if (input.type === 'hardBreak') {
      chunks.push('\n')
      return
    }

    if (typeof input.text === 'string') {
      chunks.push(input.text)
    }

    const before = chunks.length
    if (Array.isArray(input.content)) {
      input.content.forEach(walk)
    }

    if (
      input.type &&
      BLOCK_NODE_TYPES.has(input.type) &&
      chunks.length > before
    ) {
      chunks.push('\n')
    }
  }

  walk(node)

  return chunks
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const getLessonTextPreview = (
  rawContent: string | null | undefined,
): string => {
  if (!rawContent?.trim()) return ''

  try {
    const parsed = JSON.parse(rawContent)
    if (typeof parsed === 'string') {
      return stripBasicMarkdown(parsed)
    }
    return extractTextFromTiptapJson(parsed)
  } catch {
    return stripBasicMarkdown(rawContent)
  }
}

export default function LessonEditorPage() {
  const projectId = useProjectRouteId()
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
  const lessonId = typeof params?.lessonId === 'string' ? params.lessonId : ''

  const { data: course, isLoading } = useCourse(projectId, courseId)

  // State for renaming and panel toggle
  const [isRenaming, setIsRenaming] = useState(false)
  const [lessonTitle, setLessonTitle] = useState('')
  const [showAddContent, setShowAddContent] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [isDeletingVideo, setIsDeletingVideo] = useState(false)
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false)
  const [isDeletingYoutube, setIsDeletingYoutube] = useState(false)
  const [lessonDescription, setLessonDescription] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isSavingDescription, setIsSavingDescription] = useState(false)
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [isSavingTextContent, setIsSavingTextContent] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false)
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(false)
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false)
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)
  const [showDeleteResourcesDialog, setShowDeleteResourcesDialog] =
    useState(false)
  const [lessonUploads, setLessonUploads] = useState<Upload[]>([])
  const [isLoadingUploads, setIsLoadingUploads] = useState(false)
  const [isDeletingAllResources, setIsDeletingAllResources] = useState(false)

  // Find current lesson and its module from the course data (API)
  const currentModule = course?.modules?.find((m) =>
    m.lessons.some((l) => l.id === lessonId),
  )
  const currentLesson = currentModule?.lessons?.find((l) => l.id === lessonId)

  // Check if lesson has video content
  const hasVideoContent =
    currentLesson?.contentType === 'VIDEO' &&
    (currentLesson?.videoUrl || currentLesson?.videoId)

  // Check if lesson has text content (contentType must be TEXT AND have actual textContent)
  const hasTextContent =
    currentLesson?.contentType === 'TEXT' && currentLesson?.textContent
  const textContentPreview = getLessonTextPreview(currentLesson?.textContent)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('\n')

  // Check if lesson has quiz content
  const isMockTestLesson = currentLesson?.contentType === 'MOCK_TEST'
  const hasQuizContent =
    currentLesson?.contentType === 'QUIZ' || isMockTestLesson
  const isAssignmentLesson = currentLesson?.contentType === 'ASSIGNMENT'
  const hasAssignmentContent = isAssignmentLesson && Boolean(assignment)
  const hasYoutubeContent =
    currentLesson?.contentType === 'YOUTUBE' && currentLesson?.videoUrl
  const hasPrimaryLessonContent =
    hasVideoContent ||
    hasTextContent ||
    hasQuizContent ||
    hasAssignmentContent ||
    hasYoutubeContent ||
    (isAssignmentLesson && isLoadingAssignment)
  const assignmentDueDateLabel = assignment?.dueDate
    ? new Date(assignment.dueDate).toLocaleString()
    : 'No due date'

  // Initialize lesson title and description when lesson is found
  useEffect(() => {
    if (currentLesson && !isRenaming) {
      setLessonTitle(currentLesson.title)
    }
    if (currentLesson && !isDescriptionExpanded) {
      setLessonDescription(currentLesson.description || '')
    }
  }, [currentLesson, isRenaming, isDescriptionExpanded])

  // Load quiz data if lesson has quiz content
  useEffect(() => {
    const loadQuiz = async () => {
      if (
        !hasQuizContent ||
        !projectId ||
        !courseId ||
        !currentModule?.id ||
        !lessonId
      ) {
        setQuiz(null)
        return
      }

      try {
        setIsLoadingQuiz(true)
        const quizData = await getQuiz(
          projectId,
          courseId,
          currentModule.id,
          lessonId,
        )
        setQuiz(quizData)
      } catch (error) {
        console.error('Failed to load quiz:', error)
        setQuiz(null)
      } finally {
        setIsLoadingQuiz(false)
      }
    }

    loadQuiz()
  }, [hasQuizContent, projectId, courseId, currentModule?.id, lessonId])

  useEffect(() => {
    const loadAssignment = async () => {
      if (
        !isAssignmentLesson ||
        !projectId ||
        !courseId ||
        !currentModule?.id ||
        !lessonId
      ) {
        setAssignment(null)
        setIsLoadingAssignment(false)
        return
      }

      try {
        setIsLoadingAssignment(true)
        const assignmentData = await getAssignment(
          projectId,
          courseId,
          currentModule.id,
          lessonId,
        )
        setAssignment(assignmentData)
      } catch (error) {
        console.error('Failed to load assignment:', error)
        setAssignment(null)
      } finally {
        setIsLoadingAssignment(false)
      }
    }

    loadAssignment()
  }, [isAssignmentLesson, projectId, courseId, currentModule?.id, lessonId])

  // Load uploads data for this lesson (resources are complementary content)
  useEffect(() => {
    const loadUploads = async () => {
      if (!projectId || !courseId || !currentModule?.id || !lessonId) {
        setLessonUploads([])
        return
      }

      try {
        setIsLoadingUploads(true)
        const uploads = await fetchLessonUploads(
          projectId,
          courseId,
          currentModule.id,
          lessonId,
        )
        setLessonUploads(uploads)
      } catch (error) {
        console.error('Failed to load uploads:', error)
        setLessonUploads([])
      } finally {
        setIsLoadingUploads(false)
      }
    }

    loadUploads()
  }, [projectId, courseId, currentModule?.id, lessonId])

  const handleRenameLesson = () => {
    setIsRenaming(true)
  }

  const handleSaveRename = () => {
    // TODO: Save to backend
    setIsRenaming(false)
  }

  const handleCancelRename = () => {
    if (currentLesson) {
      setLessonTitle(currentLesson.title)
    }
    setIsRenaming(false)
  }

  const handleDeleteLesson = () => {
    // TODO: Implement delete with confirmation
    console.log('Delete lesson:', lessonId)
    router.push(`/p/${projectId}/courses/${courseId}/curriculum`)
  }

  // Update lesson mutation
  const updateLessonMutation = useUpdateLesson(
    projectId,
    courseId,
    currentModule?.id ?? '',
    lessonId,
  )

  const handleContentTypeSelect = async (contentType: string) => {
    setShowAddContent(false)

    if (contentType === 'video') {
      // First update the lesson contentType to VIDEO on backend
      try {
        await updateLessonMutation.mutateAsync({ contentType: 'VIDEO' })
        setVideoModalOpen(true)
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to set lesson type. Please try again.',
          variant: 'destructive',
        })
      }
    } else if (contentType === 'text') {
      // Update the lesson contentType to TEXT on backend
      try {
        await updateLessonMutation.mutateAsync({ contentType: 'TEXT' })
        setShowTextEditor(true)
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to set lesson type. Please try again.',
          variant: 'destructive',
        })
      }
    } else if (contentType === 'quiz') {
      // Update the lesson contentType to QUIZ on backend and navigate to quiz page
      try {
        await updateLessonMutation.mutateAsync({ contentType: 'QUIZ' })
        router.push(
          `/p/${projectId}/courses/${courseId}/curriculum/${lessonId}/quiz`,
        )
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to set lesson type. Please try again.',
          variant: 'destructive',
        })
      }
    } else if (contentType === 'mock-test') {
      try {
        await updateLessonMutation.mutateAsync({ contentType: 'MOCK_TEST' })
        router.push(
          `/p/${projectId}/courses/${courseId}/curriculum/${lessonId}/quiz`,
        )
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to set lesson type. Please try again.',
          variant: 'destructive',
        })
      }
    } else if (contentType === 'assignment') {
      try {
        await updateLessonMutation.mutateAsync({ contentType: 'ASSIGNMENT' })
        router.push(
          `/p/${projectId}/courses/${courseId}/curriculum/${lessonId}/assignment`,
        )
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to set lesson type. Please try again.',
          variant: 'destructive',
        })
      }
    } else if (contentType === 'youtube') {
      try {
        await updateLessonMutation.mutateAsync({ contentType: 'YOUTUBE' })
        setYoutubeModalOpen(true)
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to set lesson type. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleVideoUploadComplete = async () => {
    // Refresh course data to get updated lesson
    await queryClient.invalidateQueries({
      queryKey: ['project-course', projectId, courseId],
    })
    toast({
      title: 'Video uploaded',
      description: 'Your video is now processing. This may take a few minutes.',
    })
  }

  const handleDeleteVideo = async () => {
    if (!projectId || !courseId || !currentModule?.id || !lessonId) return

    setIsDeletingVideo(true)
    try {
      await deleteVideoFromLesson(
        projectId,
        courseId,
        currentModule.id,
        lessonId,
      )
      await queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
      toast({
        title: 'Video deleted',
        description: 'The video has been removed from this lesson.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete video'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingVideo(false)
    }
  }

  const handleSaveTextContent = async (content: string) => {
    setIsSavingTextContent(true)
    try {
      await updateLessonMutation.mutateAsync({ textContent: content })
      toast({
        title: 'Content saved',
        description: 'Your lesson content has been saved successfully.',
      })
      setShowTextEditor(false)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save content. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingTextContent(false)
    }
  }

  const handleDeleteQuiz = async () => {
    if (!projectId || !courseId || !currentModule?.id || !lessonId) return

    setIsDeletingQuiz(true)
    try {
      await deleteQuiz(projectId, courseId, currentModule.id, lessonId)
      await queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
      setQuiz(null)
      toast({
        title: 'Quiz deleted',
        description: 'The quiz has been removed from this lesson.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete quiz'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingQuiz(false)
    }
  }

  const handleDeleteAssignment = async () => {
    if (!projectId || !courseId || !currentModule?.id || !lessonId) return

    setIsDeletingAssignment(true)
    try {
      await deleteAssignment(projectId, courseId, currentModule.id, lessonId)
      await queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
      setAssignment(null)
      toast({
        title: 'Assignment deleted',
        description: 'The assignment has been removed from this lesson.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete assignment'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingAssignment(false)
    }
  }

  const handleCancelTextEditor = () => {
    setShowTextEditor(false)
  }

  const handleResourcesUploadComplete = async () => {
    // Refresh uploads list
    if (projectId && courseId && currentModule?.id && lessonId) {
      try {
        const uploads = await fetchLessonUploads(
          projectId,
          courseId,
          currentModule.id,
          lessonId,
        )
        setLessonUploads(uploads)
      } catch (error) {
        console.error('Failed to refresh uploads:', error)
      }
    }
    await queryClient.invalidateQueries({
      queryKey: ['project-course', projectId, courseId],
    })
    toast({
      title: 'Resources uploaded',
      description: 'Your resources have been uploaded successfully.',
    })
  }

  const handleDeleteAllResources = async () => {
    if (!projectId || !courseId || !currentModule?.id || !lessonId) return

    setIsDeletingAllResources(true)
    try {
      // Delete all uploads
      for (const upload of lessonUploads) {
        await deleteLessonUpload(
          projectId,
          courseId,
          currentModule.id,
          lessonId,
          upload.id,
        )
      }
      await queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })
      setLessonUploads([])
      toast({
        title: 'Resources deleted',
        description: 'All resources have been removed from this lesson.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete resources'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingAllResources(false)
      setShowDeleteResourcesDialog(false)
    }
  }

  const handleDeleteSingleResource = async (uploadId: string) => {
    if (!projectId || !courseId || !currentModule?.id || !lessonId) return

    setDeletingUploadId(uploadId)
    try {
      await deleteLessonUpload(
        projectId,
        courseId,
        currentModule.id,
        lessonId,
        uploadId,
      )
      setLessonUploads((prev) => prev.filter((u) => u.id !== uploadId))
      toast({
        title: 'Resource deleted',
        description: 'The resource has been removed.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete resource'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeletingUploadId(null)
    }
  }

  if (!projectId || !courseId || !lessonId) {
    return (
      <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Missing lesson information. Select a lesson from the curriculum to
        continue.
      </div>
    )
  }

  // Show full-screen text editor only when explicitly editing
  if (showTextEditor) {
    return (
      <TextImagesEditor
        lessonTitle={currentLesson?.title || 'Untitled Lesson'}
        projectId={projectId}
        courseId={courseId}
        moduleId={currentModule?.id || ''}
        lessonId={lessonId}
        initialContent={currentLesson?.textContent || undefined}
        onSave={handleSaveTextContent}
        onCancel={handleCancelTextEditor}
        isSaving={isSavingTextContent}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center w-fit py-1 rounded-md gap-1 text-sm font-medium mb-4 sm:mb-2">
          <Link
            href={`/p/${projectId}/courses`}
            className="text-accent underline hover:text-foreground transition-colors"
          >
            Courses
          </Link>
          <span className="text-foreground/60 mb-0.5">|</span>
          {isLoading ? (
            <span className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          ) : (
            <Link
              href={`/p/${projectId}/courses/${courseId}/curriculum`}
              className="text-accent underline hover:text-foreground transition-colors"
            >
              {course?.title ?? 'Untitled Course'}
            </Link>
          )}
          <span className="text-foreground/60 mb-0.5">|</span>
          {isLoading ? (
            <span className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          ) : (
            <span className="text-foreground/50">
              {currentLesson?.title ?? 'Lesson'}
            </span>
          )}
        </div>

        {/* Header with title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold font-literata tracking-wide">
              Curriculum
            </h2>
            <p className="text-lg font-stix text-foreground/80 mt-2 tracking-wide">
              Build modules and lessons that students will take sequentially.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Layout Structure */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.6fr] gap-6">
        {/* First Layout: Content Description and Creation */}
        <div className="space-y-4">
          {/* Lesson Name Box */}
          <div className="rounded-md border border-neutral-300 bg-white">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                {isRenaming ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      autoFocus
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename()
                        if (e.key === 'Escape') handleCancelRename()
                      }}
                      className="flex-1 h-11 rounded-sm border-muted-foreground/60 shadow-none bg-white text-lg font-medium"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelRename}
                      className="h-10 px-4 rounded-sm cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveRename}
                      disabled={!lessonTitle.trim()}
                      className="h-10 px-4 rounded-sm bg-accent hover:bg-accent/90 text-white cursor-pointer"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <>
                    {isLoading ? (
                      <Skeleton className="h-7 w-48" />
                    ) : (
                      <h3 className="text-lg font-semibold text-foreground">
                        {lessonTitle ||
                          currentLesson?.title ||
                          'Untitled Lesson'}
                      </h3>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 cursor-pointer"
                        >
                          <BsThreeDotsVertical className="size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="p-1 space-y-0.5"
                      >
                        <DropdownMenuItem
                          onClick={handleRenameLesson}
                          className="cursor-pointer hover:bg-neutral-100"
                        >
                          Rename Lesson
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleDeleteLesson}
                          className="cursor-pointer text-destructive focus:text-destructive hover:bg-red-50"
                        >
                          Delete Lesson
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>

            {/* Add Content Area - only show if no content yet */}
            {isLoading ? (
              /* Add Content Skeleton */
              <div className="border-t border-neutral-300 rounded-md bg-neutral-50 px-5 py-13">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-4 w-64 mx-auto mb-2" />
                  <Skeleton className="h-4 w-80 mx-auto mb-8" />
                  <Skeleton className="h-11 w-40" />
                </div>
              </div>
            ) : (
              !hasPrimaryLessonContent && (
                <div className="border-t border-neutral-300 rounded-md bg-neutral-50 px-5 py-13">
                  <p className="text-sm text-foreground/60 text-center mb-8">
                    Start sharing your expertise. <br /> Choose how you want to
                    present your lesson content.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddContent(true)}
                    className="items-center text-lg text-white bg-accent/65 hover:bg-accent/75 justify-center gap-2 flex mx-auto py-2.5 px-4 border-2 shadow-md rounded-md transition-colors cursor-pointer"
                  >
                    <IoAddCircleOutline className="size-6.5" />
                    <span className="font-semibold font-noto">Add Content</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Video Preview Box - show when lesson has video */}
          {hasVideoContent && currentLesson && (
            <VideoPreviewBox
              projectId={projectId}
              courseId={courseId}
              moduleId={currentModule?.id ?? ''}
              lessonId={lessonId}
              videoUrl={currentLesson.videoUrl ?? null}
              videoStatus={currentLesson.videoStatus ?? 'PROCESSING'}
              videoTitle={currentLesson.title}
              onDelete={handleDeleteVideo}
              isDeleting={isDeletingVideo}
            />
          )}

          {/* YouTube / External Link Preview Box */}
          {hasYoutubeContent && currentLesson && (
            <YouTubePreviewBox
              projectId={projectId}
              courseId={courseId}
              moduleId={currentModule?.id ?? ''}
              lessonId={lessonId}
              videoUrl={currentLesson.videoUrl!}
              videoTitle={currentLesson.title}
              onDelete={async () => {
                setIsDeletingYoutube(true)
                try {
                  await updateLessonMutation.mutateAsync({
                    videoUrl: null,
                    contentType: 'VIDEO',
                  })
                  await queryClient.invalidateQueries({
                    queryKey: ['project-course', projectId, courseId],
                  })
                  toast({
                    title: 'Link deleted',
                    description:
                      'The external video link has been removed from this lesson.',
                  })
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : 'Failed to delete link'
                  toast({
                    title: 'Error',
                    description: message,
                    variant: 'destructive',
                  })
                } finally {
                  setIsDeletingYoutube(false)
                }
              }}
              isDeleting={isDeletingYoutube}
            />
          )}

          {/* Text Content Preview - show when lesson has text content */}
          {hasTextContent && currentLesson && (
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
                <h4 className="font-medium text-lg text-foreground">
                  Text Content
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTextEditor(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-accent transition-colors cursor-pointer"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteDialog(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                </div>
              </div>
              {/* Preview */}
              <div className="px-5 py-8">
                {textContentPreview ? (
                  <p className="text-sm line-clamp-2 text-foreground/70 whitespace-pre-line">
                    {textContentPreview}
                  </p>
                ) : (
                  <p className="text-sm text-center text-foreground/60">
                    No text content preview available.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Text Content</DialogTitle>
                <DialogDescription className="text-foreground/60 mt-3">
                  Are you sure you want to delete this content? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="hover:text-foreground cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await updateLessonMutation.mutateAsync({
                        textContent: null,
                        contentType: 'VIDEO',
                      })
                      toast({
                        title: 'Content deleted',
                        description: 'Text content has been removed.',
                      })
                      setShowDeleteDialog(false)
                    } catch {
                      toast({
                        title: 'Error',
                        description:
                          'Failed to delete content. Please try again.',
                        variant: 'destructive',
                      })
                    }
                  }}
                  className="cursor-pointer"
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Quiz Content Section */}
          {hasQuizContent && quiz && (
            <QuizPreviewBox
              quiz={quiz}
              isMockTest={isMockTestLesson}
              lessonId={lessonId}
              projectId={projectId}
              courseId={courseId}
              onDelete={handleDeleteQuiz}
              isDeleting={isDeletingQuiz}
            />
          )}

          {/* Quiz Loading State - only show while actually loading */}
          {hasQuizContent && isLoadingQuiz && (
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="px-5 py-4 space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          )}

          {/* Quiz Not Found State - show when contentType is QUIZ but no quiz exists */}
          {hasQuizContent && !isLoadingQuiz && !quiz && (
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
                <h4 className="font-medium text-lg text-foreground">
                  {isMockTestLesson ? 'Mock Test' : 'Quiz'}
                </h4>
              </div>
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-foreground/60 mb-4">
                  No {isMockTestLesson ? 'mock test' : 'quiz'} has been created
                  yet for this lesson.
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      `/p/${projectId}/courses/${courseId}/curriculum/${lessonId}/quiz`,
                    )
                  }
                  className="bg-accent/80 hover:bg-accent/90 cursor-pointer rounded-md"
                >
                  {isMockTestLesson ? 'Create Mock Test' : 'Create Quiz'}
                </Button>
              </div>
            </div>
          )}

          {hasAssignmentContent && assignment && (
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
                <h4 className="font-medium text-lg text-foreground">
                  Assignment
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/p/${projectId}/courses/${courseId}/curriculum/${lessonId}/assignment`,
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-accent transition-colors cursor-pointer"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAssignment}
                    disabled={isDeletingAssignment}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                    {isDeletingAssignment ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-base font-bold text-foreground">
                  {assignment.title}
                </p>
                {assignment.description ? (
                  <p className="text-sm text-foreground/70 font-medium whitespace-pre-wrap">
                    {assignment.description}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60">
                    No description added yet.
                  </p>
                )}
                <div className="mt-4 flex flex-col items-start gap-2 text-sm text-foreground/90">
                  <span>
                    Points:{' '}
                    <span className="ml-1 font-semibold text-lime-700">
                      {assignment.totalPoints}
                    </span>
                  </span>
                  <span>
                    Due:{' '}
                    <span className="ml-1 font-medium text-lime-800">
                      {assignmentDueDateLabel}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {isAssignmentLesson && isLoadingAssignment && (
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="px-5 py-4 space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          )}

          {/* Resources Content Section */}
          <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-neutral-50 border-b border-neutral-200">
              <h4 className="font-medium text-lg text-foreground">
                Lesson Resources
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResourcesModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-accent transition-colors cursor-pointer"
                >
                  <Pencil className="size-4" />
                  {lessonUploads.length > 0 ? 'Manage' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteResourcesDialog(true)}
                  disabled={lessonUploads.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                  Delete All
                </button>
              </div>
            </div>
            {/* Preview */}
            <div className="p-5">
              {isLoadingUploads ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <ResourcesContentPreview
                  uploads={lessonUploads}
                  onDeleteUpload={handleDeleteSingleResource}
                  deletingUploadId={deletingUploadId}
                />
              )}
            </div>
          </div>

          {/* Delete Resources Confirmation Dialog */}
          <Dialog
            open={showDeleteResourcesDialog}
            onOpenChange={setShowDeleteResourcesDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete All Resources</DialogTitle>
                <DialogDescription className="text-foreground/60 mt-3">
                  Are you sure you want to delete all resources? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteResourcesDialog(false)}
                  className="hover:text-foreground cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAllResources}
                  disabled={isDeletingAllResources}
                  className="cursor-pointer"
                >
                  {isDeletingAllResources ? 'Deleting...' : 'Delete All'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Lesson Description Section */}
          {isLoading ? (
            /* Description Skeleton */
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-neutral-50">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="border-t border-neutral-200 px-5 py-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-neutral-50">
                <h4 className="font-medium text-lg text-foreground">
                  Lesson Description
                </h4>
                {!isDescriptionExpanded ? (
                  // Show Add button if no description, or Edit/Delete if description exists
                  !lessonDescription ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftDescription('')
                        setIsDescriptionExpanded(true)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-base font-medium text-accent hover:text-accent/80 hover:bg-accent/5 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="size-4.5" />
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftDescription(lessonDescription)
                          setIsDescriptionExpanded(true)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-accent rounded-md transition-colors cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isSavingDescription}
                        onClick={async () => {
                          setIsSavingDescription(true)
                          try {
                            await updateLessonMutation.mutateAsync({
                              description: null,
                            })
                            setLessonDescription('')
                            toast({
                              title: 'Description deleted',
                              description:
                                'Your lesson description has been removed.',
                            })
                          } catch {
                            toast({
                              title: 'Error',
                              description:
                                'Failed to delete description. Please try again.',
                              variant: 'destructive',
                            })
                          } finally {
                            setIsSavingDescription(false)
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground rounded-md transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSavingDescription}
                      onClick={() => {
                        setDraftDescription('')
                        setIsDescriptionExpanded(false)
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-foreground bg-muted-foreground/10 hover:text-foreground hover:bg-neutral-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingDescription}
                      onClick={async () => {
                        setIsSavingDescription(true)
                        try {
                          await updateLessonMutation.mutateAsync({
                            description: draftDescription.trim() || null,
                          })
                          setLessonDescription(draftDescription)
                          setIsDescriptionExpanded(false)
                          toast({
                            title: 'Description saved',
                            description:
                              'Your lesson description has been saved.',
                          })
                        } catch {
                          toast({
                            title: 'Error',
                            description:
                              'Failed to save description. Please try again.',
                            variant: 'destructive',
                          })
                        } finally {
                          setIsSavingDescription(false)
                        }
                      }}
                      className="px-4 py-1 text-sm font-medium text-white bg-accent/70 border-2 hover:bg-accent/80 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingDescription ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {/* Show saved description fully when collapsed */}
              {!isDescriptionExpanded && lessonDescription && (
                <div className="border-t border-neutral-200 px-5 py-3">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                    {lessonDescription}
                  </p>
                </div>
              )}

              {/* Editor Content */}
              {isDescriptionExpanded && (
                <div className="border-t border-neutral-200 p-4">
                  <Textarea
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Add a description for this lesson..."
                    className="min-h-[120px] resize-y border-neutral-300 focus:border-accent focus:ring-accent/20"
                    rows={5}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Second Layout: Course Outline / Add Content Panel */}
        <div className="space-y-4">
          {/* Free Preview Box - hidden when Add Content panel is shown */}
          {!showAddContent && (
            <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
              <div className="px-4 py-4">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentLesson?.isFree ?? false}
                    onChange={async (e) => {
                      try {
                        await updateLessonMutation.mutateAsync({
                          isFree: e.target.checked,
                        })
                        toast({
                          title: e.target.checked
                            ? 'Free preview disabled'
                            : 'Free preview enabled',
                          description: e.target.checked
                            ? 'This lesson is no longer a free preview.'
                            : 'This lesson is now available as a free preview.',
                        })
                      } catch {
                        toast({
                          title: 'Error',
                          description:
                            'Failed to update lesson. Please try again.',
                          variant: 'destructive',
                        })
                      }
                    }}
                    className="mt-0.5 size-6 rounded-md border-2 border-neutral-400 text-accent cursor-pointer accent-accent focus:ring-2 focus:ring-accent/30 transition-all shrink-0"
                  />
                  <div className="flex-1">
                    <span className="block text-base font-bold text-foreground">
                      Keep as Free Preview
                    </span>
                    <span className="block text-sm text-foreground/60 mt-1">
                      Allow anyone to access this lesson without purchasing the
                      course.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="rounded-md border border-neutral-300 bg-white overflow-hidden h-fit">
            {showAddContent ? (
              /* Add Content Panel */
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <h4 className="font-medium text-foreground text-lg">
                    Add Content
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddContent(false)}
                    className="p-1 rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    <X className="size-5 text-foreground/90" />
                  </button>
                </div>

                {/* Content Type Options - 3x2 Grid */}
                <div className="p-4">
                  <div className="grid w-full grid-cols-2 sm:grid-cols-3 gap-3">
                    {contentTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleContentTypeSelect(type.id)}
                          className="flex w-full mx-auto flex-col items-center justify-center gap-2.5 p-4 rounded-md border border-neutral-300 bg-white hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group"
                        >
                          <Icon className="size-6.5 text-accent" />
                          <span className="text-xs font-medium text-foreground/90 group-hover:text-accent transition-colors">
                            {type.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Course Outline View */
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <h4 className="font-light text-foreground text-xl">
                    Course Outline
                  </h4>
                </div>

                {/* Modules and Lessons from API */}
                <div className="p-4 space-y-4">
                  {isLoading ? (
                    // Skeleton loader for course outline
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse" />
                          <div className="flex">
                            <div className="w-4 flex justify-center">
                              <div className="w-0.5 h-full bg-neutral-200 rounded-full" />
                            </div>
                            <div className="flex-1 space-y-2 py-1">
                              {[1, 2, 3].slice(0, i === 1 ? 3 : 2).map((j) => (
                                <div
                                  key={j}
                                  className="h-8 w-full bg-neutral-100 rounded animate-pulse"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : course?.modules && course.modules.length > 0 ? (
                    course.modules.map((module) => (
                      <div key={module.id} className="space-y-1">
                        {/* Module Name */}
                        <p className="text-sm font-medium font-noto text-foreground">
                          {module.title}
                        </p>

                        {/* Lessons with vertical line */}
                        <div className="flex">
                          {/* Vertical Line */}
                          <div className="w-4 flex justify-center">
                            <div className="w-0.5 h-full bg-neutral-300 rounded-full" />
                          </div>

                          {/* Lessons */}
                          <div className="flex-1 space-y-1 py-1">
                            {module.lessons.map((lesson) => (
                              <Link
                                key={lesson.id}
                                href={`/p/${projectId}/courses/${courseId}/curriculum/${lesson.id}`}
                                className={cn(
                                  'block px-3 py-2 text-sm rounded-md transition-colors',
                                  lesson.id === lessonId
                                    ? 'text-accent font-medium'
                                    : 'text-foreground/70 hover:text-foreground',
                                )}
                              >
                                {lesson.title}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-foreground/50 text-center py-4">
                      No modules found in this course.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Upload Modal */}
        {currentModule && (
          <VideoUploadModal
            open={videoModalOpen}
            onOpenChange={setVideoModalOpen}
            lessonTitle={currentLesson?.title ?? 'Lesson'}
            projectId={projectId}
            courseId={courseId}
            moduleId={currentModule.id}
            lessonId={lessonId}
            onUploadComplete={handleVideoUploadComplete}
          />
        )}

        {/* YouTube Link Modal */}
        {currentModule && (
          <YouTubeLinkModal
            open={youtubeModalOpen}
            onOpenChange={setYoutubeModalOpen}
            lessonTitle={currentLesson?.title ?? 'Lesson'}
            projectId={projectId}
            courseId={courseId}
            moduleId={currentModule.id}
            lessonId={lessonId}
          />
        )}

        {/* Resources Upload Modal */}
        {currentModule && (
          <ResourcesUploadModal
            isOpen={resourcesModalOpen}
            onClose={() => setResourcesModalOpen(false)}
            projectId={projectId}
            courseId={courseId}
            moduleId={currentModule.id}
            lessonId={lessonId}
            onUploadComplete={handleResourcesUploadComplete}
          />
        )}
      </div>
    </div>
  )
}
