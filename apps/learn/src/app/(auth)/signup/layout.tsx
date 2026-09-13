import type { Metadata } from 'next'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: `Create your ${siteConfig.name} account.`,
}

export default function SignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
