'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateLesson } from '@/lib/hooks/use-lessons'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

type YouTubeLinkModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonTitle: string
  projectId: string
  courseId: string
  moduleId: string
  lessonId: string
  onSaveComplete?: () => void
  initialUrl?: string
}

export function YouTubeLinkModal({
  open,
  onOpenChange,
  lessonTitle,
  projectId,
  courseId,
  moduleId,
  lessonId,
  onSaveComplete,
  initialUrl = '',
}: YouTubeLinkModalProps) {
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const updateLessonMutation = useUpdateLesson(
    projectId,
    courseId,
    moduleId,
    lessonId,
  )

  const isSaving = updateLessonMutation.isPending

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setError('URL is required')
      return false
    }
    try {
      new URL(value.trim())
      setError(null)
      return true
    } catch {
      setError('Please enter a valid URL')
      return false
    }
  }

  const handleSave = async () => {
    if (!validateUrl(url)) return

    try {
      await updateLessonMutation.mutateAsync({
        videoUrl: url.trim(),
        contentType: 'YOUTUBE',
      })

      await queryClient.invalidateQueries({
        queryKey: ['project-course', projectId, courseId],
      })

      toast({
        title: 'Link saved',
        description: `External video link added to "${lessonTitle}".`,
      })

      onOpenChange(false)
      onSaveComplete?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save link'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleClose = () => {
    if (isSaving) return
    onOpenChange(false)
    setUrl(initialUrl)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            YouTube / External Link
          </DialogTitle>
          <DialogDescription className="text-foreground/70">
            Embed a public or unlisted video. Paste the full URL below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="youtube-url" className="text-sm font-medium">
              Video URL
            </Label>
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                }
              }}
              disabled={isSaving}
              className={
                error
                  ? 'border-destructive'
                  : 'py-5 border placeholder:text-foreground/50 border-neutral-400 shadow-none mt-2'
              }
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <p className="text-xs text-foreground/40">
                Supports YouTube, Vimeo, Loom, and any direct video link.
              </p>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={!url.trim() || isSaving}
            className="w-full font-semibold mt-4 py-5 bg-accent hover:bg-accent/90 text-white cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Link'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
