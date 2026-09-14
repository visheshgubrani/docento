import { BadgeCheckIcon, CheckIcon, ShieldCheckIcon } from 'lucide-react'

import {
  assessment,
  certificate,
  progress,
} from '@/content/fixtures/fieldwork-academy'

/**
 * The evidence: what a learner has done, and what proves it.
 *
 * The certificate is the last thing in the composition because it is the last
 * thing in the loop, and the verification id is shown in full — the point of a
 * certificate is that somebody who was not there can check it.
 */
export function ProgressFrame() {
  return (
    <div className="border-border-decorative bg-surface flex flex-col overflow-hidden rounded-[var(--radius-frame)] border">
      <section className="border-border-decorative flex flex-col gap-4 border-b p-5">
        <p className="preview-label">Assessment</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg">{assessment.title}</p>
          <span className="bg-success-background text-success-foreground border-success-border inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <CheckIcon aria-hidden="true" className="size-3.5" />
            Passed
          </span>
        </div>

        <div className="flex items-end gap-3">
          <span className="font-display text-4xl leading-none tabular-nums">
            {assessment.percent}%
          </span>
          <span className="text-sm text-ink-muted tabular-nums">
            {assessment.correct} of {assessment.total} · attempt{' '}
            {assessment.attempt} of {assessment.attemptsAllowed}
          </span>
        </div>

        <p className="text-xs text-ink-muted">
          Answer keys never leave the server: a result is returned, not the
          marking scheme.
        </p>
      </section>

      <section className="border-border-decorative flex flex-col gap-3 border-b p-5">
        <p className="preview-label">Completion</p>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-label="Course completion"
          className="bg-surface-subtle h-2 w-full overflow-hidden rounded-full"
        >
          <span
            className="bg-brand block h-full rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <p className="text-sm text-ink-muted tabular-nums">
          {progress.completedLessons} of {progress.requiredLessons} lessons
          complete · {progress.percent}%
        </p>
        <p className="text-xs text-ink-muted">
          Completion is computed on the server against the published release, so
          it survives editing and cannot be claimed by a client.
        </p>
      </section>

      <section className="edge-panel m-5 flex flex-col gap-3 p-5">
        <p className="preview-label">Certificate</p>

        <div className="flex items-start gap-3">
          <BadgeCheckIcon
            aria-hidden="true"
            className="text-brand mt-0.5 size-6 shrink-0"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              Certificate of completion — {certificate.courseTitle}
            </p>
            <p className="text-xs text-ink-muted">
              {certificate.academyName} · issued {certificate.issuedOn}
            </p>
          </div>
        </div>

        <p className="text-ink flex items-center gap-2 font-mono text-xs">
          <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
          {certificate.verificationId}
          <span className="text-ink-muted">· publicly verifiable by id</span>
        </p>

        <span className="text-brand text-sm font-medium underline underline-offset-4">
          Verify this certificate
        </span>

        <p className="text-xs text-ink-muted">
          An issued certificate stays valid: unpublishing a course stops
          discovery, it does not revoke what somebody earned.
        </p>
      </section>
    </div>
  )
}
