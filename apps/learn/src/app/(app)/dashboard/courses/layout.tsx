import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Courses',
  description: 'View and continue your enrolled courses.',
}

export default function DashboardCoursesLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
