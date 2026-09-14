import { cn } from '@docento/ui'
import {
  CheckIcon,
  FileTextIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
} from 'lucide-react'

import {
  academy,
  mediaAsset,
  quizQuestion,
} from '@/content/fixtures/fieldwork-academy'

/**
 * The compact UI details inside the capability cards.
 *
 * A feature card with a generic icon illustrates nothing: the reader learns that
 * "quizzes" exist, which the title already said. Each of these shows the smallest
 * real piece of the interface that makes the claim concrete — a quiz choice, an
 * upload row, a certificate line — drawn from the same fixture as everything else
 * on the page.
 *
 * The upload row is the one that depicts an unshipped screen, and the card it
 * belongs to is marked `preview` accordingly.
 */

export function QuizChoice() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs leading-snug text-ink">{quizQuestion.prompt}</p>
      <ul className="flex flex-col gap-1.5">
        {quizQuestion.options.map((option) => {
          const chosen = option.id === quizQuestion.chosen

          return (
            <li
              key={option.id}
              className={cn(
                'flex items-start gap-2 rounded-[var(--radius-control)] border px-2.5 py-1.5 text-xs',
                chosen
                  ? 'border-brand bg-surface-subtle text-ink'
                  : 'border-border-decorative text-ink-muted',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border',
                  chosen ? 'border-brand bg-brand' : 'border-border-control',
                )}
              >
                {chosen ? (
                  <CheckIcon className="size-2.5 text-on-brand" />
                ) : null}
              </span>
              <span>{option.label}</span>
              {chosen ? <span className="sr-only"> — selected</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function UploadRow() {
  return (
    <div className="flex flex-col gap-2">
      <div className="border-border-decorative flex items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2">
        <UploadCloudIcon
          aria-hidden="true"
          className="text-ink-muted size-4 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-mono text-[0.6875rem]">
            {mediaAsset.fileName}
          </span>
          <span className="bg-surface-subtle h-1 w-full overflow-hidden rounded-full">
            <span
              className="bg-brand block h-full rounded-full"
              style={{ width: `${mediaAsset.progress}%` }}
            />
          </span>
        </div>
        <span className="text-[0.6875rem] text-ink-muted tabular-nums">
          {mediaAsset.progress}%
        </span>
      </div>
      <p className="text-[0.6875rem] text-ink-muted">
        {mediaAsset.size} · served with entitlement checked on every request
      </p>
    </div>
  )
}

export function CertificateDetail() {
  return (
    <div className="edge-panel flex flex-col gap-2 p-3">
      <span className="text-brand flex items-center gap-2 text-xs font-medium">
        <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
        Verified
      </span>
      <span className="font-mono text-[0.6875rem] text-ink">FLW-2M4K-8Q1P</span>
      <span className="text-[0.6875rem] text-ink-muted">
        Anyone can check it without an account.
      </span>
    </div>
  )
}

export function ProgressDetail() {
  return (
    <div className="flex flex-col gap-2">
      <span className="bg-surface-subtle h-1.5 w-full overflow-hidden rounded-full">
        <span className="bg-brand block h-full w-[71%] rounded-full" />
      </span>
      <span className="text-[0.6875rem] text-ink-muted tabular-nums">
        5 of 7 lessons · computed from the release, on the server
      </span>
    </div>
  )
}

export function OutlineDetail() {
  return (
    <ol className="flex flex-col gap-1.5 font-mono text-[0.6875rem] text-ink-muted">
      <li className="flex items-center gap-2">
        <FileTextIcon aria-hidden="true" className="size-3" />
        01 · Framing a story
      </li>
      <li className="text-ink flex items-center gap-2 pl-5">
        <span className="bg-brand h-3 w-px" aria-hidden="true" />
        Reading light
      </li>
      <li className="flex items-center gap-2">
        <FileTextIcon aria-hidden="true" className="size-3" />
        02 · Sequencing
      </li>
    </ol>
  )
}

export function IdentityDetail() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="size-8 rounded-[8px]"
        style={{ backgroundColor: academy.brandingColor }}
      />
      <div className="flex flex-col">
        <span className="text-xs font-medium">{academy.name}</span>
        <span className="font-mono text-[0.6875rem] text-ink-muted">
          primary · {academy.brandingColor}
        </span>
      </div>
    </div>
  )
}

export const capabilityDetails = {
  outline: OutlineDetail,
  identity: IdentityDetail,
  quiz: QuizChoice,
  progress: ProgressDetail,
  upload: UploadRow,
  certificate: CertificateDetail,
} as const

export type CapabilityDetail = keyof typeof capabilityDetails
