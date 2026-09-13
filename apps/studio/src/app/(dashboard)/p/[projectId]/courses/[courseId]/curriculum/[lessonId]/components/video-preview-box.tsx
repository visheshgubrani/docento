'use client'

import { useEffect, useState } from 'react'
import { BsThreeDotsVertical } from 'react-icons/bs'
import { Loader2 } from 'lucide-react'
import { ClipMuxPlayer } from '@clipmux/player'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fetchLessonPlaybackSession } from '@/lib/api'

type VideoStatus = 'PROCESSING' | 'READY' | 'FAILED' | string | null

type VideoPreviewBoxProps = {
  projectId: string
  courseId: string
  moduleId: string
  lessonId: string
  videoUrl: string | null
  videoStatus: VideoStatus
  videoTitle: string
  onDelete?: () => void
  isDeleting?: boolean
}

export function VideoPreviewBox({
  projectId,
  courseId,
  moduleId,
  lessonId,
  videoUrl,
  videoStatus,
  videoTitle,
  onDelete,
  isDeleting = false,
}: VideoPreviewBoxProps) {
  const isProcessing = videoStatus === 'PROCESSING' || !videoStatus
  const isReady = videoStatus === 'READY'
  const isFailed = videoStatus === 'FAILED'

  const [playbackSession, setPlaybackSession] = useState<{
    videoId: string
    token?: string
    url?: string | null
    subtitleUrl?: string | null
    chapters?: { startTime: number; endTime: number; title: string }[] | null
  } | null>(null)
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    if (!isReady || !projectId || !courseId || !moduleId || !lessonId) {
      setPlaybackSession(null)
      setPlaybackError(null)
      setIsLoadingPlayback(false)
      return () => {
        isActive = false
      }
    }

    setIsLoadingPlayback(true)
    setPlaybackError(null)

    fetchLessonPlaybackSession(projectId, courseId, moduleId, lessonId)
      .then((session) => {
        if (!isActive) return
        setPlaybackSession({
          videoId: session.videoId,
          token: session.token,
          url: session.url,
          subtitleUrl: session.subtitleUrl,
          chapters: session.chapters,
        })
      })
      .catch((error) => {
        if (!isActive) return
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load video playback.'
        setPlaybackError(message)
        // Fallback: if we have a direct URL, still try to play it
        if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
          setPlaybackSession({ videoId: '', url: videoUrl })
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingPlayback(false)
      })

    return () => {
      isActive = false
    }
  }, [isReady, projectId, courseId, moduleId, lessonId, videoUrl])

  return (
    <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <h4 className="font-medium text-foreground">Video</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer"
              disabled={isDeleting}
            >
              <BsThreeDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-1">
            <DropdownMenuItem
              onClick={onDelete}
              disabled={isDeleting}
              className="cursor-pointer text-destructive focus:text-destructive hover:bg-red-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="p-4">
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative">
              <div className="size-16 rounded-full bg-accent/10 flex items-center justify-center">
                <Loader2 className="size-8 text-accent animate-spin" />
              </div>
            </div>
            <p className="mt-4 font-medium text-foreground">Processing...</p>
            <p className="text-sm text-foreground/60 mt-1">
              Your video is being processed. This may take a few minutes.
            </p>
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="mt-4 font-medium text-destructive">
              Processing Failed
            </p>
            <p className="text-sm text-foreground/60 mt-1">
              There was an error processing your video. Please try uploading
              again.
            </p>
          </div>
        )}

        {isReady && (
          <div className="space-y-3">
            {isLoadingPlayback && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative">
                  <div className="size-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <Loader2 className="size-8 text-accent animate-spin" />
                  </div>
                </div>
                <p className="mt-4 font-medium text-foreground">
                  Loading video...
                </p>
                <p className="text-sm text-foreground/60 mt-1">
                  Fetching a secure playback link.
                </p>
              </div>
            )}

            {!isLoadingPlayback && playbackError && !playbackSession && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="mt-4 font-medium text-destructive">
                  Playback unavailable
                </p>
                <p className="text-sm text-foreground/60 mt-1">
                  {playbackError}
                </p>
              </div>
            )}

            {!isLoadingPlayback && playbackSession && (
              <div className="aspect-video bg-black rounded-md overflow-hidden">
                <ClipMuxPlayer
                  playbackId={playbackSession.videoId}
                  token={playbackSession.token}
                  src={playbackSession.url ?? undefined}
                  title={videoTitle}
                  subtitles={playbackSession.subtitleUrl ?? undefined}
                  chapters={playbackSession.chapters ?? undefined}
                />
              </div>
            )}

            {/* Video Title */}
            <p className="text-sm font-medium text-foreground">{videoTitle}</p>
          </div>
        )}
      </div>
    </div>
  )
}
