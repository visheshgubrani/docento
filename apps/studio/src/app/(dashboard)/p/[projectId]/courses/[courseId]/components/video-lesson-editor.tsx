import { type DragEvent, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, UploadCloud } from 'lucide-react'
import { CiCircleAlert } from 'react-icons/ci'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createVideoUploadSession } from '@/lib/api'
import type { CourseModule, CourseModuleLesson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { uploadVideoFile } from './helpers/upload-video'

type VideoLessonEditorProps = {
  lesson: CourseModuleLesson
  module?: CourseModule
  projectId: string
  courseId: string
}

export function VideoLessonEditor({
  lesson,
  module,
  projectId,
  courseId,
}: VideoLessonEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStep, setUploadStep] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [generateSubtitle, setGenerateSubtitle] = useState(false)
  const [generateChapters, setGenerateChapters] = useState(false)

  useEffect(() => {
    setUploadStep('idle')
    setProgress(0)
    setStatusMessage(null)
    setIsDragging(false)
    setSelectedFile(null)
    setGenerateSubtitle(false)
    setGenerateChapters(false)
  }, [lesson.id])

  const handleFileSelection = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return

    if (!module?.id) {
      toast({
        title: 'Missing module',
        description: 'Select a module before uploading a video.',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    setUploadStep('idle')
    setProgress(0)
    setStatusMessage(`Selected ${file.name}`)
  }

  const startUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Select a video first',
        description: 'Choose a file before starting the upload.',
        variant: 'destructive',
      })
      return
    }

    if (!projectId || !courseId || !module?.id) {
      toast({
        title: 'Cannot upload video',
        description: 'Project, course, or module context is missing.',
        variant: 'destructive',
      })
      return
    }

    setUploadStep('uploading')
    setStatusMessage('Initializing upload...')
    setProgress(0)

    try {
      // No need to call createVideoUploadSession anymore!
      // Just pass the config directly to uploadVideoFile
      const videoId = await uploadVideoFile(
        selectedFile,
        {
          projectId,
          courseId,
          moduleId: module.id,
          lessonId: lesson.id,
          generateSubtitle,
          generateChapters,
        },
        (nextProgress) => {
          setProgress(nextProgress)
          setStatusMessage(`${Math.round(nextProgress)}%`)
        }
      )

      setProgress(100)
      setUploadStep('success')
      setSelectedFile(null)

      await queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })

      toast({
        title: 'Video uploaded',
        description: `Your video was uploaded and linked to ${lesson.title}.`,
      })

      setStatusMessage('Upload completed successfully!')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Video upload failed.'
      setStatusMessage(message)
      setUploadStep('error')
      toast({
        title: 'Upload error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFileSelection(event.dataTransfer.files)
  }

  const handleBrowse = () => {
    fileInputRef.current?.click()
  }

  const isUploading = uploadStep === 'uploading'
  const canUpload = !!selectedFile && !isUploading

  return (
    <Card className='border border-slate-200/80 shadow-sm dark:border-slate-800'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-semibold'>
          <UploadCloud className='h-5 w-5 text-muted-foreground' />
          Video upload
        </CardTitle>
        <CardDescription>
          {module ? `${module.title} • ` : ''}
          {lesson.title}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div
          className={cn(
            'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition-colors dark:border-slate-800 dark:bg-slate-900/40',
            isDragging && 'border-primary bg-primary/5 dark:border-primary/60'
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <UploadCloud className='mx-auto h-12 w-12 text-slate-400' />
          <p className='mt-4 text-base font-semibold text-slate-900 dark:text-white'>
            Drop your lesson video here
          </p>
          <p className='text-sm text-muted-foreground'>
            MP4, MOV, or WebM up to 2GB. Students will stream this securely.
          </p>
          <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
            <Button onClick={startUpload} disabled={!canUpload}>
              {isUploading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Uploading...
                </>
              ) : (
                'Upload video'
              )}
            </Button>
            <Button
              variant='outline'
              onClick={handleBrowse}
              disabled={isUploading}
            >
              {selectedFile ? 'Change file' : 'Browse files'}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type='file'
            accept='video/*'
            className='hidden'
            onChange={(event) => {
              handleFileSelection(event.target.files)
              event.target.value = ''
            }}
          />
          {isUploading || statusMessage ? (
            <div className='mt-4 flex flex-col items-center gap-2 text-sm'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                {uploadStep === 'uploading' ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : uploadStep === 'success' ? (
                  <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                ) : uploadStep === 'error' ? (
                  <AlertTriangle className='h-4 w-4 text-destructive' />
                ) : null}
                <span>{statusMessage ?? 'Preparing upload...'}</span>
              </div>
              {isUploading ? (
                <div className='flex w-full max-w-sm items-center gap-2'>
                  <div className='h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-800'>
                    <div
                      className='h-2 rounded-full bg-primary transition-[width]'
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <span className='text-xs text-muted-foreground'>
                    {Math.min(progress, 100)}%
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {/* AI Processing Options */}
        <div className='rounded-lg border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50'>
          <div className='mb-3 flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-violet-500' />
            <p className='text-sm font-semibold text-slate-900 dark:text-white'>
              AI processing
            </p>
          </div>
          <div className='space-y-3'>
            <div className='flex items-start gap-3'>
              <Checkbox
                id='generate-subtitle'
                checked={generateSubtitle}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  setGenerateSubtitle(next)
                  if (!next) setGenerateChapters(false)
                }}
                disabled={isUploading}
              />
              <div>
                <Label
                  htmlFor='generate-subtitle'
                  className='cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200'
                >
                  AI-generated subtitles
                </Label>
                <p className='text-xs text-muted-foreground'>
                  Automatically transcribe and add captions to this video.
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <Checkbox
                id='generate-chapters'
                checked={generateChapters}
                onCheckedChange={(checked) =>
                  setGenerateChapters(checked === true)
                }
                disabled={isUploading || !generateSubtitle}
              />
              <div>
                <Label
                  htmlFor='generate-chapters'
                  className={cn(
                    'cursor-pointer text-sm font-medium',
                    !generateSubtitle
                      ? 'text-muted-foreground'
                      : 'text-slate-800 dark:text-slate-200'
                  )}
                >
                  AI-generated chapters
                </Label>
                <p className='text-xs text-muted-foreground'>
                  {generateSubtitle
                    ? 'Break the video into titled chapters automatically.'
                    : 'Requires AI subtitles to be enabled.'}
                  {!generateSubtitle && (
                    <CiCircleAlert className='ml-1 inline-block size-3.5 align-[-1px] text-foreground/60' />
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current video info */}
        <div className='rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/50'>
          {lesson.videoUrl ? (
            <>
              <p className='font-semibold text-slate-900 dark:text-white'>
                Current upload
              </p>
              <p className='text-muted-foreground break-all'>
                {lesson.videoUrl}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                Uploading a new video will replace this link.
              </p>
            </>
          ) : (
            <>
              <p className='font-semibold text-slate-900 dark:text-white'>
                No video uploaded yet
              </p>
              <p className='text-xs text-muted-foreground'>
                Add your lesson footage so students can watch this module.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
