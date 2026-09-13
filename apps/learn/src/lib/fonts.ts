import {
  Inter,
  Familjen_Grotesk,
  Comfortaa,
  Cinzel,
  Tangerine,
  Libre_Baskerville,
} from 'next/font/google'

export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const fontDisplay = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const fontBrand = Comfortaa({
  subsets: ['latin'],
  variable: '--font-brand',
  display: 'swap',
})

export const fontCinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
})

export const fontScript = Tangerine({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-tangerine',
  display: 'swap',
})

export const fontBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-baskerville',
  display: 'swap',
})
