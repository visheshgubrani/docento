'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RiDashboardFill } from 'react-icons/ri'
import { ImBooks } from 'react-icons/im'
import { IoSchool } from 'react-icons/io5'
import { MdOutlineSecurity } from 'react-icons/md'
import { TbRosetteDiscountFilled } from 'react-icons/tb'
import { MdWebhook } from 'react-icons/md'
import { BiSolidKey } from 'react-icons/bi'
import { FaUsers } from 'react-icons/fa6'
import { FaMoneyBill } from 'react-icons/fa'
import { CreditCard, Menu } from 'lucide-react'
import { useProject } from '@/lib/hooks/use-projects'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { useProtectedSession } from '@/components/auth/protected-route'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ProjectSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Check if in course builder - show compact mode only
  const isCourseBuilderRoute = /^\/p\/[^/]+\/courses\/[^/]+/.test(
    pathname || '',
  )

  // In course builder: always show compact sidebar at left-0
  if (isCourseBuilderRoute) {
    return (
      <>
        {/* Desktop Sidebar - Collapsed at left-0, no mobile header (course builder handles mobile) */}
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col border-r border-r-muted/10 bg-sidebar shadow-lg z-40">
          <SidebarContent collapsed={true} />
        </aside>
      </>
    )
  }

  return (
    <>
      {/* Mobile Header with Menu Button */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-muted/10 bg-sidebar/95 px-2 md:hidden">
        <ProjectHeader compact />
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

      {/* Desktop Sidebar - Collapsed (md) - Layout sidebar hidden, so start at left-0 */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 bottom-0 w-20 flex-col border-r border-r-muted/10 bg-sidebar shadow-lg z-40">
        <SidebarContent collapsed={true} />
      </aside>

      {/* Desktop Sidebar - Expanded (lg+) - Positioned after layout sidebar (w-20) */}
      <aside className="hidden lg:flex fixed left-20 top-0 bottom-0 w-72 flex-col border-r border-r-muted/10 bg-sidebar shadow-lg z-40">
        <SidebarContent collapsed={false} />
      </aside>
    </>
  )
}

function ProjectHeader({ compact = false }: { compact?: boolean }) {
  const projectId = useProjectRouteId()
  const { data: project, isLoading } = useProject(projectId)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="h-5 w-28 rounded bg-white/10 animate-pulse" />
        ) : (
          <h2 className="truncate text-base font-medium text-white">
            {project?.name ?? 'Project'}
          </h2>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-gradient-to-br md:mt-0 mt-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
            </div>
          ) : (
            <>
              <h2 className="truncate text-base font-semibold text-white">
                {project?.name ?? 'Project'}
              </h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                {project?.slug ?? 'project-slug'}
              </p>
            </>
          )}
        </div>
      </div>
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
  const hasProject = Boolean(projectId)
  const session = useProtectedSession()
  const { data: project, isLoading } = useProject(projectId)
  const canViewDeveloper = Boolean(
    project?.ownerId &&
    session?.user?.id &&
    project.ownerId === session.user.id,
  )

  const workspaceNav = hasProject
    ? [
        {
          label: 'Dashboard',
          href: `/p/${projectId}/overview`,
          icon: RiDashboardFill,
        },
        {
          label: 'Courses',
          href: `/p/${projectId}/courses`,
          icon: ImBooks,
        },
        {
          label: 'Students',
          href: `/p/${projectId}/students`,
          icon: IoSchool,
        },
        {
          label: 'Transactions',
          href: `/p/${projectId}/transactions`,
          icon: FaMoneyBill,
        },
        {
          label: 'Coupons',
          // description: "Discount promotions",
          href: `/p/${projectId}/coupons`,
          icon: TbRosetteDiscountFilled,
        },
        // {
        //   label: 'Developer',
        //   href: `/p/${projectId}/developer`,
        //   icon: FaCode,
        // },
      ]
    : []

  const developerItems =
    hasProject && canViewDeveloper
      ? [
          {
            label: 'API Keys',
            description: 'Authentication tokens',
            href: `/p/${projectId}/developer/api-keys`,
            icon: BiSolidKey,
          },
          {
            label: 'Webhooks',
            description: 'Event notifications',
            href: `/p/${projectId}/developer/webhooks`,
            icon: MdWebhook,
          },
          {
            label: 'Security',
            description: 'Origin settings',
            href: `/p/${projectId}/developer/security`,
            icon: MdOutlineSecurity,
          },
          {
            label: 'Payments',
            description: 'Razorpay keys',
            href: `/p/${projectId}/developer/payments`,
            icon: CreditCard,
          },
          {
            label: 'Collaborators',
            description: 'Team access',
            href: `/p/${projectId}/developer/collaborators`,
            icon: FaUsers,
          },
          // {
          //   label: 'Domain',
          //   description: 'Custom host',
          //   href: `/p/${projectId}/developer/domain`,
          //   icon: FaGlobe,
          // },
        ]
      : []

  return (
    <div className="flex border-l overflow-y-auto scrollbar-thin border-muted/10 h-full flex-col px-3 py-4">
      {/* Project Header */}
      <div className={cn('mt-2', collapsed && 'flex justify-center')}>
        {collapsed ? (
          isLoading ? (
            <div className="h-10 w-10 rounded-sm bg-white/10 animate-pulse" />
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gradient-to-br from-accent-foreground border-white/25 border to-accent text-white shadow-md cursor-default">
                    <span className="text-lg font-noto font-bold">
                      {project?.name?.charAt(0)?.toUpperCase() ?? 'P'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{project?.name ?? 'Project'}</p>
                  <p className="text-xs text-muted-foreground">
                    {project?.slug ?? 'project-slug'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        ) : (
          <ProjectHeader />
        )}
      </div>

      <Separator
        className={cn('my-5 bg-neutral-700/40', collapsed && 'my-4')}
      />

      {/* Workspace Navigation */}
      <div className="flex-1">
        <p
          className={cn(
            'mb-3 px-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? '' : 'Workspace'}
        </p>
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1">
            {workspaceNav.map(({ label, href, icon: Icon }) => {
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

        {canViewDeveloper ? (
          <>
            <Separator
              className={cn('my-5 bg-neutral-700/50', collapsed && 'my-4')}
            />

            {/* Developer Section */}
            <p
              className={cn(
                'mb-3 px-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
                collapsed && 'justify-center',
              )}
            >
              {collapsed ? '' : 'Developer'}
            </p>
            <TooltipProvider delayDuration={0}>
              <div className="space-y-1">
                {developerItems.map(
                  ({ label, description, href, icon: Icon }) => {
                    const isActive =
                      pathname === href || pathname.startsWith(`${href}/`)
                    return (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <Link
                            href={href}
                            onClick={() => onNavigate?.()}
                            className={cn(
                              'group flex font-sans items-center gap-2 rounded-xl px-2.5 py-2.5 text-[1.05rem] font-medium transition-all duration-200',
                              collapsed && 'justify-center px-2',
                              isActive
                                ? 'text-white'
                                : 'text-muted-foreground/90 hover:text-white',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-8 w-8 items-start mb-1 justify-center rounded-lg transition-colors',
                                isActive
                                  ? 'text-white'
                                  : 'text-neutral-500 group-hover:text-neutral-300',
                              )}
                            >
                              <Icon className="size-5.5" />
                            </span>
                            {!collapsed && (
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    'text-sm font-medium transition-colors',
                                    isActive
                                      ? 'text-white'
                                      : 'text-muted-foreground/80 group-hover:text-white',
                                  )}
                                >
                                  {label}
                                </p>
                                <p className="truncate mt-0.5 font-sans text-xs text-neutral-600">
                                  {description}
                                </p>
                              </div>
                            )}
                          </Link>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
                            <p>{label}</p>
                            <p className="text-xs text-muted-foreground">
                              {description}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    )
                  },
                )}
              </div>
            </TooltipProvider>
          </>
        ) : null}
      </div>

      {/* <Separator className={cn("my-4 bg-neutral-700/40")} /> */}

      {/* Back to Projects Button */}
      {/* <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/projects"
              onClick={() => onNavigate?.()}
              className={cn(
                'group flex items-center gap-1 rounded-xl px-2 py-2.5 text-sm font-medium text-muted-foreground/90 transition-all duration-200 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors group-hover:text-neutral-300">
                <RiArrowGoBackFill className="size-5" />
              </span>
              {!collapsed && <span>Back to Projects</span>}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              Back to Projects
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider> */}
    </div>
  )
}
