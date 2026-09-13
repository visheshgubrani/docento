'use client'

import { noisePattern } from '@/components/noise-pattern'
import { cn } from '@/lib/utils'

type CourseCardSkeletonProps = {
  index?: number
  className?: string
}

export function CourseCardSkeleton({
  index = 0,
  className,
}: CourseCardSkeletonProps) {
  const isEven = index % 2 === 0

  return (
    <div
      className={cn(
        'h-full rounded-lg border border-border bg-muted/60 p-2',
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-sm',
          isEven
            ? 'bg-gradient-to-b from-[#7b627d] to-[#8f6976] dark:from-[#412c42] dark:to-[#3c1a26]'
            : 'bg-gradient-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]',
        )}
      >
        <div
          className="absolute inset-0 opacity-45 mix-blend-overlay"
          style={{ backgroundImage: noisePattern }}
        />
        <div className="relative px-[min(10%,1rem)] pt-[min(10%,1rem)]">
          <div className="relative aspect-video overflow-hidden rounded-t-sm ring-1 ring-black/10 bg-black/5">
            <div className="absolute left-3 top-3 flex gap-2">
              <div className="h-5 w-14 animate-pulse rounded-full bg-background/45" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-background/35" />
            </div>
            <div className="h-full w-full animate-pulse bg-background/20" />
          </div>
        </div>
      </div>

      <div className="px-3.5 py-3.5">
        <div className="space-y-2">
          <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/80" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted/70" />
        </div>

        <div className="mt-6 space-y-4.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="size-9 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-14 animate-pulse rounded bg-muted" />
          </div>

          <div className="h-9 w-full animate-pulse rounded-sm bg-primary/40" />

          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
