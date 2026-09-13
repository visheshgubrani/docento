'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { FaMoneyCheckDollar } from 'react-icons/fa6'
import { IoMdAddCircle } from 'react-icons/io'
import { AiFillProject } from 'react-icons/ai'
import { LuLogOut } from 'react-icons/lu'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import { authClient } from '@/lib/auth'
import {
  ProtectedRoute,
  useProtectedSession,
} from '@/components/auth/protected-route'
import { MdSettings } from 'react-icons/md'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PostHogUserIdentify } from '@/components/providers/posthog-user-identify'
import {
  captureClientException,
  captureEvent,
  resetAnalytics,
} from '@/lib/posthog'
import { cn } from '@/lib/utils'

const agencyNavigation = [
  { name: 'My Projects', href: '/projects', icon: AiFillProject },
  { name: 'Create New Project', href: '/projects/new', icon: IoMdAddCircle },
  { name: 'Billing', href: '/billing', icon: FaMoneyCheckDollar },
  // { name: "Usage", href: "/usage", icon: BiSolidTachometer },
  { name: 'Settings', href: '/settings', icon: MdSettings },
  { name: 'Logout', href: '#', icon: LuLogOut, isLogout: true },
]

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ProtectedRoute>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname() || '/'
  const session = useProtectedSession()

  const isProjectRoute = pathname.startsWith('/p/')
  // Check if we're in the course builder (has courseId in path)
  const isCourseBuilderRoute = /^\/p\/[^/]+\/courses\/[^/]+/.test(pathname)

  if (!session || !session.user) {
    return null
  }

  const user = {
    name: session.user.name || session.user.email || 'User',
    email: session.user.email || 'user@example.com',
    image: session.user.image || undefined,
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
      captureEvent('user_logged_out', {
        current_path: pathname,
        source: 'dashboard_sidebar',
      })
      resetAnalytics()
      router.push('/login')
    } catch (error) {
      captureClientException(error, {
        context: 'dashboard_logout',
      })
    }
  }

  // Course builder has its own layout - just render children without any sidebar from dashboard
  if (isCourseBuilderRoute) {
    return (
      <div className="flex min-h-screen bg-dashboard-bg">
        {/* AgencySidebar is hidden - ProjectSidebar (compact) + CourseBuilderSidebar handle everything */}
        <div className="flex-1">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-dashboard-bg">
      <PostHogUserIdentify
        user={{
          id: session.user.id ?? null,
          email: session.user.email ?? null,
          name: session.user.name ?? null,
        }}
      />
      {/* Main Agency Sidebar - Hidden completely on project routes for mobile/tablet */}
      {!isProjectRoute && (
        <aside
          className={cn(
            'hidden md:fixed md:inset-y-0 md:z-50 md:flex md:flex-col',
            'md:w-20 lg:w-72',
          )}
        >
          <AgencySidebar
            pathname={pathname}
            user={user}
            onSignOut={handleSignOut}
          />
        </aside>
      )}
      {isProjectRoute && (
        <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col lg:w-20">
          <AgencySidebar
            pathname={pathname}
            user={user}
            onSignOut={handleSignOut}
            collapsed={true}
          />
        </aside>
      )}
      {!isProjectRoute && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-72 max-w-[85vw] border-r border-slate-800 bg-slate-900 p-0 text-slate-300 sm:w-80"
          >
            <AgencySidebar
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
              user={user}
              onSignOut={handleSignOut}
            />
          </SheetContent>
        </Sheet>
      )}
      <div
        className={cn(
          'flex flex-1  flex-col',
          isProjectRoute
            ? 'pt-14 md:pt-0 md:pl-20 lg:pl-[23rem]'
            : 'md:pl-20 lg:pl-72',
        )}
      >
        {!isProjectRoute && (
          <div className="sticky w-full justify-between bg-white top-0 z-40 flex h-14 items-center gap-3 border-b border-border/40 px-4 md:hidden">
            <div className="flex items-center gap-2">
              <Image
                src="/docento-logo.svg"
                alt="Docento Logo"
                width={28}
                height={28}
                className="object-contain"
              />
              <span className="font-comfortaa text-xl font-bold text-foreground">
                Docento
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-foreground/70 hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="size-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        )}
        <main className="flex-1 h-full overflow-y-auto bg-dashboard-bg p-3 md:p-6 xl:p-10">
          <div className="mx-auto h-full w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}

type AgencySidebarProps = {
  pathname: string
  onNavigate?: () => void
  user?: { name: string; email: string; image?: string }
  onSignOut?: () => void
  collapsed?: boolean
}

function AgencySidebar({
  pathname,
  onNavigate,
  user,
  onSignOut,
  collapsed = false,
}: AgencySidebarProps) {
  return (
    <div className="flex h-full flex-col gap-y-6 bg-sidebar px-2 py-6 text-slate-300 md:px-3">
      <div className="flex items-center gap-2">
        <Link
          href="/projects"
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2  md:justify-center lg:justify-start"
          aria-label="Agency home"
          onClick={() => onNavigate?.()}
        >
          <span className={`relative shrink-0 `}>
            <Image
              src="/docento-logo.svg"
              alt="Docento Logo"
              width={30}
              height={30}
              className="object-contain"
            />
          </span>
          <span
            className={cn(
              'font-comfortaa font-bold tracking-normal text-xl text-dashboard-bg',
              collapsed ? 'hidden' : 'md:hidden lg:block',
            )}
          >
            docento
          </span>
        </Link>
      </div>

      <Separator className="bg-muted-foreground/15" />

      <nav className="flex flex-1 flex-col mt-2">
        <TooltipProvider delayDuration={0}>
          <ul role="list" className="flex flex-1 flex-col gap-y-2">
            {agencyNavigation.map((item) => {
              // Special handling: /projects should not be active when on /projects/new
              const isActive =
                item.href === '/projects'
                  ? pathname === '/projects'
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)

              const isLogout = (item as any).isLogout

              if (isLogout) {
                return (
                  <li key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            onNavigate?.()
                            onSignOut?.()
                          }}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors md:justify-center md:px-2',
                            collapsed ? '' : 'lg:justify-start lg:px-4',
                            'text-muted-foreground hover:text-white',
                          )}
                        >
                          <item.icon className="size-5" />
                          <span
                            className={cn(
                              'text-[1.03rem]',
                              collapsed ? 'hidden' : 'md:hidden lg:inline',
                            )}
                          >
                            {item.name}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className={cn(
                          'hidden',
                          collapsed ? 'md:block' : 'md:block lg:hidden',
                        )}
                      >
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return (
                <li key={item.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        aria-label={item.name}
                        onClick={() => onNavigate?.()}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors md:justify-center md:px-2',
                          collapsed ? '' : 'lg:justify-start lg:px-4',
                          isActive
                            ? ' text-white'
                            : 'text-muted-foreground hover:text-white',
                        )}
                      >
                        <item.icon className="size-6" />
                        <span
                          className={cn(
                            'text-[1.03rem]',
                            collapsed ? 'hidden' : 'md:hidden lg:inline',
                          )}
                        >
                          {item.name}
                        </span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className={cn(
                        'hidden',
                        collapsed ? 'md:block' : 'md:block lg:hidden',
                      )}
                    >
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                </li>
              )
            })}
          </ul>
        </TooltipProvider>

        <Separator className="bg-muted-foreground/15 mb-2" />

        {/* User Profile Section */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl py-3 text-left text-slate-200',
                  collapsed && 'justify-center',
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user?.image || ''}
                    alt={user?.name || 'User avatar'}
                  />
                  <AvatarFallback className="text-foreground/50 text-lg font-semibold bg-dashboard-bg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'flex flex-col text-left',
                    collapsed ? 'hidden' : 'md:hidden lg:flex',
                  )}
                >
                  <span className="text-sm font-medium text-white">
                    {user?.name || 'User'}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground/80 break-words">
                    {user?.email || 'email'}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className={cn(
                'hidden',
                collapsed ? 'md:block' : 'md:block lg:hidden',
              )}
            >
              <div>
                <p className="font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || 'email'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </div>
  )
}
