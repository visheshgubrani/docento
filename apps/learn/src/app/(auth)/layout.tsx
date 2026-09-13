import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Auth',
  description: 'Sign in or create an account.',
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="min-h-screen">{children}</div>
}
