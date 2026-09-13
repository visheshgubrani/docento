'use client'

import { BsStars } from 'react-icons/bs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// SVG Loader Component
function AILoader() {
  return (
    <svg
      fill="#B1A0F5FF"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="size-5"
    >
      <rect x="1" y="4" width="6" height="14" opacity="1">
        <animate
          id="spinner_aqiq"
          begin="0;spinner_xVBj.end-0.25s"
          attributeName="y"
          dur="0.75s"
          values="1;5"
          fill="freeze"
        />
        <animate
          begin="0;spinner_xVBj.end-0.25s"
          attributeName="height"
          dur="0.75s"
          values="22;14"
          fill="freeze"
        />
        <animate
          begin="0;spinner_xVBj.end-0.25s"
          attributeName="opacity"
          dur="0.75s"
          values="1;.2"
          fill="freeze"
        />
      </rect>
      <rect x="9" y="4" width="6" height="14" opacity=".4">
        <animate
          begin="spinner_aqiq.begin+0.15s"
          attributeName="y"
          dur="0.75s"
          values="1;5"
          fill="freeze"
        />
        <animate
          begin="spinner_aqiq.begin+0.15s"
          attributeName="height"
          dur="0.75s"
          values="22;14"
          fill="freeze"
        />
        <animate
          begin="spinner_aqiq.begin+0.15s"
          attributeName="opacity"
          dur="0.75s"
          values="1;.2"
          fill="freeze"
        />
      </rect>
      <rect x="17" y="4" width="6" height="14" opacity=".3">
        <animate
          id="spinner_xVBj"
          begin="spinner_aqiq.begin+0.3s"
          attributeName="y"
          dur="0.75s"
          values="1;5"
          fill="freeze"
        />
        <animate
          begin="spinner_aqiq.begin+0.3s"
          attributeName="height"
          dur="0.75s"
          values="22;14"
          fill="freeze"
        />
        <animate
          begin="spinner_aqiq.begin+0.3s"
          attributeName="opacity"
          dur="0.75s"
          values="1;.2"
          fill="freeze"
        />
      </rect>
    </svg>
  )
}

type AIGenerationButtonProps = {
  onClick: () => void
  isGenerating: boolean
}

export function AIGenerationButton({
  onClick,
  isGenerating,
}: AIGenerationButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isGenerating}
      className={cn(
        'gap-2.5 py-6 px-4 text-base rounded-sm cursor-pointer',
        'bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70',
        'text-white shadow-md',
        'disabled:opacity-85 disabled:cursor-not-allowed',
        'transition-all duration-200',
        'flex items-center',
      )}
    >
      {isGenerating ? (
        <>
          Generating
          <AILoader />
        </>
      ) : (
        <>
          <BsStars className="size-5" />
          Use AI to Generate Course Outline
        </>
      )}
    </Button>
  )
}

// Skeleton loader for AI-generated course outline
export function ModuleSkeletonLoader() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((moduleIndex) => (
        <div
          key={moduleIndex}
          className="rounded-md border border-neutral-300/75 bg-white overflow-hidden"
        >
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
                {[1, 2, 3, 4]
                  .slice(0, 3 + (moduleIndex % 2))
                  .map((lessonIndex) => (
                    <div
                      key={lessonIndex}
                      className="flex items-center gap-4 px-3 py-4"
                    >
                      <div className="size-6 rounded bg-neutral-200/60 animate-pulse" />
                      <div className="flex items-center gap-2">
                        <div className="size-4 rounded bg-neutral-200/70 animate-pulse" />
                        <div className="h-3 w-12 rounded bg-neutral-200/50 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
                      </div>
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
    </div>
  )
}

// Re-export for backwards compatibility
export function CourseOutlineSkeleton() {
  return <ModuleSkeletonLoader />
}
