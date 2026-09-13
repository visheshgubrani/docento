'use client'

import { useState } from 'react'
import { BsThreeDotsVertical } from 'react-icons/bs'
import { FaYoutube } from 'react-icons/fa'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { YouTubeLinkModal } from './youtube-link-modal'

type YouTubePreviewBoxProps = {
  projectId: string
  courseId: string
  moduleId: string
  lessonId: string
  videoUrl: string
  videoTitle: string
  onDelete?: () => void
  isDeleting?: boolean
}

/**
 * Extract a YouTube video ID from common URL formats.
 * Returns null when the URL is not recognisably YouTube.
 */
function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url)

    // youtube.com/watch?v=ID
    if (
      (parsed.hostname === 'www.youtube.com' ||
        parsed.hostname === 'youtube.com') &&
      parsed.searchParams.has('v')
    ) {
      return parsed.searchParams.get('v')
    }

    // youtu.be/ID
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null
    }

    // youtube.com/embed/ID
    if (
      (parsed.hostname === 'www.youtube.com' ||
        parsed.hostname === 'youtube.com') &&
      parsed.pathname.startsWith('/embed/')
    ) {
      return parsed.pathname.replace('/embed/', '').split('/')[0] || null
    }
  } catch {
    // not a valid URL
  }
  return null
}

export function YouTubePreviewBox({
  projectId,
  courseId,
  moduleId,
  lessonId,
  videoUrl,
  videoTitle,
  onDelete,
  isDeleting = false,
}: YouTubePreviewBoxProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const youtubeId = extractYouTubeId(videoUrl)

  return (
    <>
      <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <FaYoutube className="size-5.5 text-red-600" />
            YouTube / External Video
          </h4>
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
            <DropdownMenuContent align="end" className="p-1 space-y-0.5">
              <DropdownMenuItem
                onClick={() => setEditModalOpen(true)}
                className="cursor-pointer"
              >
                Edit Link
              </DropdownMenuItem>
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
          {youtubeId ? (
            <div className="space-y-3">
              <div className="aspect-video bg-black rounded-md overflow-hidden">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title={videoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <p className="text-sm font-semibold bg-muted p-2 rounded-sm text-foreground">
                {videoTitle}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-lg font-semibold text-foreground truncate">
                  {videoTitle}
                </p>
                <div className="min-w-0 flex gap-2">
                  <ExternalLink className="size-5 text-accent shrink-0" />

                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent text-wrap hover:underline break-all"
                  >
                    {videoUrl}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <YouTubeLinkModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        lessonTitle={videoTitle}
        projectId={projectId}
        courseId={courseId}
        moduleId={moduleId}
        lessonId={lessonId}
        initialUrl={videoUrl}
      />
    </>
  )
}
