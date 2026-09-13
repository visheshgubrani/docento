import type { Metadata } from 'next'
import DashboardLayoutClient from './dashboard-layout-client'

export const metadata: Metadata = {
  title: 'Accounts',
  description: 'Manage your Docento projects, billing, and account settings.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
