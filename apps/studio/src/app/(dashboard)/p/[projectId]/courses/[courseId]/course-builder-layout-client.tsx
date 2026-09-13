'use client'

import { CourseBuilderSidebar } from '@/components/layout/course-builder-sidebar'
import { cn } from '@/lib/utils'

export default function CourseBuilderLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <CourseBuilderSidebar />

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-1 flex-col',
          // Mobile: full width with top padding for header
          'pt-14 md:pt-0',
          // md: left padding for project sidebar (80px) + collapsed course sidebar (80px) = 160px
          'md:pl-40',
          // lg+: left padding for project sidebar (80px) + expanded course sidebar (256px) = 336px
          'lg:pl-[21rem]',
        )}
      >
        <main className="flex-1 h-full overflow-y-auto bg-dashboard-bg p-4 md:p-6 xl:p-10">
          <div className="mx-auto h-full w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
