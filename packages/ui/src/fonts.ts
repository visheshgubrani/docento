import localFont from 'next/font/local'

/**
 * The three typefaces, loaded by surface.
 *
 * ## Why `local` and not `google`
 *
 * `next/font/google` fetches the files at build time, which makes every build
 * depend on a third party being reachable and leaves the licence texts in
 * `node_modules` rather than in this repository. The WOFF2 files here are
 * committed (see `fonts/LICENCES.md`), so a build is hermetic and the licence
 * travels with the asset it covers.
 *
 * ## Why they are separate exports
 *
 * A surface loads what it uses. The marketing site loads Newsreader and Geist
 * Sans; it has no code sample large enough to justify Geist Mono on the critical
 * path. Studio and Learn will load Geist Sans and Mono and never Newsreader,
 * because serif type in a dense administrative control is a decision that reads
 * as decoration. Each export is its own `localFont` call so that a page importing
 * one does not ship all three.
 */

export const geistSans = localFont({
  src: '../fonts/geist-sans-variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: true,
})

export const geistMono = localFont({
  src: '../fonts/geist-mono-variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: false,
})

export const newsreader = localFont({
  src: [
    {
      path: '../fonts/newsreader-latin-wght-normal.woff2',
      weight: '200 800',
      style: 'normal',
    },
    {
      path: '../fonts/newsreader-latin-wght-italic.woff2',
      weight: '200 800',
      style: 'italic',
    },
  ],
  variable: '--font-newsreader',
  display: 'swap',
  preload: true,
})

/**
 * The class names that define the font variables for a document.
 *
 * A layout applies this to `<html>`; every `font-sans`, `font-display` and
 * `font-mono` utility downstream reads the variables it sets.
 */
export const marketingFontClassName = [
  geistSans.variable,
  geistMono.variable,
  newsreader.variable,
].join(' ')

/** The application surfaces' pair: interface and code, no editorial serif. */
export const applicationFontClassName = [
  geistSans.variable,
  geistMono.variable,
].join(' ')
