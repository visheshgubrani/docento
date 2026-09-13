import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Signup',
  description:
    'Sign up for Docento and start building your modern, headless LMS. Create courses, onboard learners, and grow your platform from day one.',
  keywords: [
    'docento sign up',
    'create docento account',
    'lms signup',
    'course platform signup',
    'start lms',
  ],
  openGraph: {
    title: 'Signup | Docento',
    description:
      'Join Docento and start building your personalized learning platform in minutes.',
    url: 'https://docento.dev/auth/signup',
  },
  twitter: {
    card: 'summary',
    title: 'Signup | Docento',
    description:
      'Sign up for Docento and begin creating your headless learning experience.',
  },
}

export default function SignupLayout({
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
