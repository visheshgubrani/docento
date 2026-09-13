'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { IoInformationCircle, IoStatsChartSharp } from 'react-icons/io5'
import { RiEdit2Fill } from 'react-icons/ri'
import { MdAssignment } from 'react-icons/md'
import { ImPriceTags } from 'react-icons/im'
import { LiaCertificateSolid } from 'react-icons/lia'
import { FaUserGraduate } from 'react-icons/fa6'
import { MdOutlineAssignment } from 'react-icons/md'
import { RiArrowGoBackFill } from 'react-icons/ri'
import { Menu } from 'lucide-react'
import { useCourse } from '@/lib/hooks/use-courses'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function CourseBuilderSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)')

    const handleViewportChange = () => {
      if (desktopQuery.matches) {
        setMobileOpen(false)
      }
    }

    handleViewportChange()
    desktopQuery.addEventListener('change', handleViewportChange)

    return () => {
      desktopQuery.removeEventListener('change', handleViewportChange)
    }
  }, [])

  return (
    <>
      {/* Mobile Header with Menu Button */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-muted/10 bg-sidebar/95 px-2 md:hidden">
        <CourseHeader compact />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-white"
            >
              <Menu className="size-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 max-w-[85vw] border-r border-muted/10 bg-sidebar p-0 text-slate-300"
          >
            <SidebarContent
              onNavigate={() => setMobileOpen(false)}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar - Collapsed (md) - Always collapsed */}
      <aside className="hidden md:flex lg:hidden fixed left-20 top-0 bottom-0 w-20 flex-col border-r border-r-muted/10 bg-sidebar shadow-lg z-40">
        <SidebarContent collapsed={true} />
      </aside>

      {/* Desktop Sidebar - Full width (lg+) */}
      <aside className="hidden lg:flex fixed left-20 top-0 bottom-0 w-64 flex-col border-r border-r-muted/10 bg-sidebar shadow-lg z-40">
        <SidebarContent collapsed={false} />
      </aside>
    </>
  )
}

function CourseHeader({ compact = false }: { compact?: boolean }) {
  const projectId = useProjectRouteId()
  const params = useParams()
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
  const { data: course, isLoading } = useCourse(projectId, courseId)

  if (compact) {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32 bg-muted-foreground/20" />
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        <h2 className="truncate text-base font-medium text-white uppercase">
          {course?.title ?? 'Course'}
        </h2>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-3 py-6 rounded-sm bg-accent/15">
        <Skeleton className="h-3 w-20 bg-muted-foreground/20 mb-3" />
        <Skeleton className="h-5 w-full bg-muted-foreground/20" />
      </div>
    )
  }

  return (
    <div className="px-3 py-6 rounded-sm bg-accent/15">
      <p className="text-[10px] text-start font-sans font-medium uppercase tracking-wider text-muted-foreground/70 mb-3">
        Course Builder
      </p>
      <h2 className="text-base font-noto text-white uppercase break-words leading-tight">
        {course?.title ?? 'Course'}
      </h2>
    </div>
  )
}

type SidebarContentProps = {
  collapsed?: boolean
  onNavigate?: () => void
}

function SidebarContent({
  collapsed = false,
  onNavigate,
}: SidebarContentProps) {
  const pathname = usePathname()
  const projectId = useProjectRouteId()
  const params = useParams()
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
  const { data: course, isLoading } = useCourse(projectId, courseId)

  const baseUrl = `/p/${projectId}/courses/${courseId}`

  const mainNavItems = [
    {
      label: 'Information',
      href: `${baseUrl}/information`,
      icon: IoInformationCircle,
    },
    {
      label: 'Curriculum',
      href: `${baseUrl}/curriculum`,
      icon: RiEdit2Fill,
    },
    {
      label: 'Pricing',
      href: `${baseUrl}/pricing`,
      icon: ImPriceTags,
    },
    {
      label: 'Certificates',
      href: `${baseUrl}/certificates`,
      icon: LiaCertificateSolid,
    },
  ]

  const analyticsNavItems = [
    {
      label: 'Reports',
      href: `${baseUrl}/reports`,
      icon: IoStatsChartSharp,
    },
    {
      label: 'Students',
      href: `${baseUrl}/students`,
      icon: FaUserGraduate,
    },
    {
      label: 'Assignments',
      href: `${baseUrl}/assignments`,
      icon: MdAssignment,
    },
  ]

  return (
    <div className="flex border-l overflow-y-scroll scrollbar-thin border-muted/10 h-full flex-col px-3 py-4">
      {/* Back to Courses Button */}
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'justify-center' : 'justify-start',
        )}
      >
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/p/${projectId}/courses`}
                onClick={() => onNavigate?.()}
                className={cn(
                  'group flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground/90 transition-all duration-200 hover:text-white',
                  collapsed && 'justify-center px-2',
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors group-hover:text-neutral-300">
                  <RiArrowGoBackFill className="size-5" />
                </span>
                {!collapsed && <span>Back to Courses</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Back to Courses</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator
        className={cn('my-4 bg-neutral-700/40', collapsed && 'my-3')}
      />

      {/* Course Header */}
      <div className={cn('', collapsed && 'flex justify-center')}>
        {collapsed ? (
          isLoading ? (
            <Skeleton className="h-10 w-10 rounded-sm bg-muted-foreground/20" />
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gradient-to-br from-accent-foreground border-white/25 border to-accent text-white shadow-md cursor-default">
                    <span className="text-lg font-noto font-bold">
                      {course?.title?.charAt(0)?.toUpperCase() ?? 'C'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Course Builder
                  </p>
                  <p className="font-medium uppercase">
                    {course?.title ?? 'Course'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        ) : (
          <CourseHeader />
        )}
      </div>

      <Separator
        className={cn('my-5 bg-neutral-700/40', collapsed && 'my-4')}
      />

      {/* Main Navigation */}
      <div className="flex-1">
        <p
          className={cn(
            'mb-3 px-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? '' : 'Course Setup'}
        </p>
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1">
            {mainNavItems.map(({ label, href, icon: Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      onClick={() => onNavigate?.()}
                      className={cn(
                        'group flex font-sans items-center gap-2 rounded-xl px-3 py-2.5 text-[1.06rem] font-medium transition-all duration-200',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'text-white'
                          : 'text-muted-foreground/90 hover:text-white',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'text-white'
                            : 'text-neutral-500 group-hover:text-neutral-300',
                        )}
                      >
                        <Icon className="size-5.5" />
                      </span>
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{label}</TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </nav>
        </TooltipProvider>

        <Separator
          className={cn('my-5 bg-neutral-700/50', collapsed && 'my-4')}
        />

        {/* Analytics Section */}
        <p
          className={cn(
            'mb-3 px-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? '' : 'Analytics'}
        </p>
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1">
            {analyticsNavItems.map(({ label, href, icon: Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      onClick={() => onNavigate?.()}
                      className={cn(
                        'group flex font-sans items-center gap-2 rounded-xl px-3 py-2.5 text-[1.06rem] font-medium transition-all duration-200',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'text-white'
                          : 'text-muted-foreground/90 hover:text-white',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'text-white'
                            : 'text-neutral-500 group-hover:text-neutral-300',
                        )}
                      >
                        <Icon className="size-4.5" />
                      </span>
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{label}</TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </nav>
        </TooltipProvider>
      </div>
    </div>
  )
}
