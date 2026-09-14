import {
  courseResultPreview,
  highlightQuickstart,
  readQuickstartSnippet,
} from '@/lib/highlight'

import { CopyButton } from './copy-button'

/**
 * The developer panel: the call, and what comes back.
 *
 * The result is rendered from a `CatalogCourse` — the API's own type — beside the
 * code that returns it, which is the point of the section: an integrator can see
 * the shape of the response without leaving the page.
 *
 * Highlighting happens once, at build time. There is no request to a highlighting
 * service, no animated typing, and no dependency on anything being up when a
 * visitor loads the page.
 */
export async function CodePanel() {
  const [html, source] = await Promise.all([
    highlightQuickstart(),
    Promise.resolve(readQuickstartSnippet()),
  ])

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="edge-sheet min-w-0 overflow-hidden">
        <div className="border-border-decorative flex items-center justify-between gap-4 border-b px-4 py-3">
          <span className="font-mono text-[0.6875rem] text-ink-muted">
            list-academy-courses.ts
          </span>
          <CopyButton value={source} label="Copy" />
        </div>

        <div
          data-slot="code-panel"
          data-lenis-prevent
          tabIndex={0}
          role="region"
          aria-label="TypeScript example: listing an academy's courses with the Docento SDK"
          className="overflow-x-auto p-4 text-[0.8125rem] leading-relaxed [&_pre]:bg-transparent!"
        >
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      <div className="border-border-decorative bg-surface/5 rounded-[var(--radius-card)] border p-4">
        <p className="preview-label mb-2">Response</p>
        <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="font-mono break-all text-ink-muted">
            courses[0].title
          </dt>
          <dd className="text-ink">{courseResultPreview.title}</dd>

          <dt className="font-mono text-ink-muted">moduleCount</dt>
          <dd className="text-ink tabular-nums">
            {courseResultPreview.moduleCount}
          </dd>

          <dt className="font-mono text-ink-muted">lessonCount</dt>
          <dd className="text-ink tabular-nums">
            {courseResultPreview.lessonCount}
          </dd>
        </dl>
      </div>
    </div>
  )
}
