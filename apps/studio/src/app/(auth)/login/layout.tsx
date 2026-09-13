import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login',
  description:
    'Log in to your Docento account and access your dashboard. Continue building, managing, and scaling your learning platform with ease.',
  keywords: [
    'docento login',
    'lms login',
    'course platform login',
    'learning dashboard login',
    'docento account access',
  ],
  openGraph: {
    title: 'Login | Docento',
    description:
      'Sign in to your Docento dashboard and continue managing your courses and learners.',
    url: 'https://docento.dev/auth/login',
  },
  twitter: {
    card: 'summary',
    title: 'Login | Docento',
    description:
      'Log in to your Docento account and access your customizable LMS dashboard.',
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <main>{children}</main>
    </>
  )
}
