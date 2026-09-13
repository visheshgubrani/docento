import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: { default: 'Docento', template: '%s | Docento' },
  description: 'Author courses, publish them, and see how learners are doing.',
}

/**
 * The root layout.
 *
 * The header is not here: this application's navigation depends on which
 * workspace and academy the URL names, so it is rendered by the group that
 * knows — see `(app)/layout.tsx`.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-background min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
