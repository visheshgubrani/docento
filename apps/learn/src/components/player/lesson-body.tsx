import { renderLessonHtml } from '@/lib/lesson-html'

/**
 * A text lesson.
 *
 * The one place author-supplied content reaches the DOM, and it goes through
 * `renderLessonHtml`, which sanitizes both of its branches — the TipTap JSON
 * document an editor produces and the HTML string a legacy lesson holds. The
 * previous version routed only the second through the sanitizer, on the
 * reasoning that its serializer escaped what it wrote; that is true, and it is
 * not the property that matters. One definition of safe markup beats two that
 * have to agree.
 *
 * A server component, so a lesson is in the HTML the browser receives rather
 * than arriving after hydration.
 */
export function LessonBody({ content }: { content: string | null }) {
  const html = renderLessonHtml(content)

  if (!html) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
        This lesson has no content yet.
      </p>
    )
  }

  return (
    <div
      className="prose prose-neutral dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
