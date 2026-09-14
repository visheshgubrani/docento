import type { Metadata } from 'next'
import { Toaster } from '@docento/ui'
import { applicationFontClassName } from '@docento/ui/fonts'

import './globals.css'

/**
 * The root layout.
 *
 * ## The fonts come from the design system
 *
 * `applicationFontClassName` declares the same two CSS variables this file used to
 * declare by hand from `next/font/google`. The difference is where the files come
 * from: the shared package commits the WOFF2 and its licence, so a build no longer
 * depends on Google being reachable, and the typeface the marketing page renders in
 * is verifiably the one this application renders in.
 *
 * It is deliberately the *application* pair — interface and code. Newsreader is for
 * marketing headlines and is not loaded here at all.
 *
 * ## The header is not here
 *
 * This application's navigation depends on which workspace and academy the URL
 * names, so it is rendered by the group that knows — see `(app)/layout.tsx`.
 *
 * ## The toaster is the shared one
 *
 * Nothing in this application raises a toast yet: every write reports its own state
 * inline, through `useAsyncAction`. The viewport stays mounted because it was
 * before, and it is the design system's rather than a local copy — so when a surface
 * does start raising one there is nothing to add.
 */
export const metadata: Metadata = {
  title: { default: 'Docento', template: '%s | Docento' },
  description: 'Author courses, publish them, and see how learners are doing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={applicationFontClassName}>
      <body className="bg-canvas text-ink min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
