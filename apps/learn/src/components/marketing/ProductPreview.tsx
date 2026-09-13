import { noisePattern } from '@/components/noise-pattern'

/**
 * A stylised preview of the learner interface, drawn rather than screenshotted.
 *
 * This replaces the product screenshots that used to sit in these slots. A
 * screenshot is a maintenance problem in a repository that ships UI changes
 * continuously — it goes stale silently, and nobody notices until a visitor
 * sees an interface that no longer exists.
 *
 * Drawing the shape instead means it cannot be wrong. It shows structure (course
 * list, lesson outline, progress) without claiming to be pixel-accurate, and it
 * inherits the theme, so it is correct in both light and dark mode.
 *
 * Colour comes from the current theme rather than a hardcoded brand colour,
 * because in the learner application the brand belongs to the academy and is
 * applied at runtime from `Academy.branding`.
 */
export function ProductPreview() {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-t-sm bg-background ring-1 ring-black/10">
      <div className="flex h-full">
        {/* Course outline */}
        <div className="hidden w-1/4 shrink-0 flex-col gap-3 border-r border-border bg-muted/40 p-4 sm:flex">
          <div className="h-2 w-2/3 rounded-full bg-foreground/25" />
          <div className="mt-2 flex flex-col gap-2">
            {[
              { width: 'w-full', done: true },
              { width: 'w-5/6', done: true },
              { width: 'w-full', done: false },
              { width: 'w-4/6', done: false },
              { width: 'w-5/6', done: false },
            ].map((lesson, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className={
                    lesson.done
                      ? 'size-2 shrink-0 rounded-full bg-primary'
                      : 'size-2 shrink-0 rounded-full bg-foreground/20'
                  }
                />
                <div
                  className={`h-1.5 rounded-full ${
                    lesson.done ? 'bg-foreground/35' : 'bg-foreground/15'
                  } ${lesson.width}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Lesson content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6">
          <div className="h-2.5 w-1/2 rounded-full bg-foreground/25" />
          <div className="aspect-video w-full rounded-sm bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-border" />
          <div className="flex flex-col gap-2">
            <div className="h-1.5 w-full rounded-full bg-foreground/12" />
            <div className="h-1.5 w-11/12 rounded-full bg-foreground/12" />
            <div className="h-1.5 w-3/4 rounded-full bg-foreground/12" />
          </div>
          <div className="mt-auto flex items-center gap-3">
            <div className="h-6 w-24 rounded-full bg-primary/80" />
            <div className="h-6 w-16 rounded-full bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The framed, tinted container the preview sits in.
 *
 * Kept separate so a caller can supply a different body (a certificate, an
 * assessment) inside the same presentation.
 */
export function ProductFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-olive-950/[0.035] p-2 dark:bg-white/5">
      <div className="relative overflow-hidden rounded-sm bg-gradient-to-b from-[#876d88] to-[#8f6976] dark:from-[#412c42] dark:to-[#3c1a26]">
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay dark:opacity-25"
          style={{
            backgroundPosition: 'center',
            backgroundImage: noisePattern,
          }}
        />
        <div className="relative px-[min(10%,3rem)] pt-[min(10%,3rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}
