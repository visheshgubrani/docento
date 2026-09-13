import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { siteConfig } from '@/config/site'
import {
  fontSans,
  fontDisplay,
  fontBrand,
  fontCinzel,
  fontScript,
  fontBaskerville,
} from '@/lib/fonts'
import './globals.css'

export const viewport: Viewport = {
  colorScheme: 'dark light',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://acme-learning.com'),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontBrand.variable} ${fontCinzel.variable} ${fontScript.variable} ${fontBaskerville.variable}`}
    >
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
