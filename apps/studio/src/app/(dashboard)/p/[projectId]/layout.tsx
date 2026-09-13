import type { ReactNode } from 'react'
import type { Metadata } from 'next'

import { ProjectSidebar } from '@/components/layout/sidebar'

export const metadata: Metadata = {
  title: {
    default: 'Admin | Docento',
    absolute: 'Admin | Docento',
  },
}

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <ProjectSidebar />
      <div className="flex-1">{children}</div>
    </div>
  )
}
