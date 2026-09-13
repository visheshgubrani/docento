import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Course Player',
  description: 'Watch lessons and track progress in your course.',
}

export default function DashboardCourseLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
