import type { Metadata, Viewport } from 'next'

import { SiteHeader } from '@/components/layout/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { resolveAcademy } from '@/lib/academy'
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

/**
 * Metadata from the academy, not from a config file.
 *
 * The application serves many academies, so a hardcoded name would be wrong for
 * all but one of them — and the previous version had a fictional tenant baked in
 * as the default title of every page.
 *
 * A host that resolves nothing gets the software's name, because there is no
 * academy to name and a blank title is worse.
 */
export async function generateMetadata(): Promise<Metadata> {
  const academy = await resolveAcademy()

  const name = academy?.branding?.displayName ?? academy?.name ?? 'Docento'

  return {
    title: { default: name, template: `%s | ${name}` },
    description: academy
      ? `Courses from ${academy.name}.`
      : 'A self-hostable course platform.',
    ...(academy?.branding?.faviconUrl
      ? { icons: academy.branding.faviconUrl }
      : {}),
  }
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
      <body className="bg-background min-h-screen antialiased">
        <ThemeProvider>
          {/**
           * The header is in the root layout rather than per route group, so
           * every page has navigation. The session gate stays in the `(app)`
           * group's layout, because the catalogue is public and the dashboard is
           * not.
           */}
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
