'use client'

import { Fragment, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  CreditCard,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type TopbarProps = {
  user: {
    name: string
    email: string
  }
  onSignOut: () => Promise<void> | void
  onMenuClick?: () => void
}

const formatSegment = (segment: string) =>
  segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export function Topbar({ user, onSignOut, onMenuClick }: TopbarProps) {
  const pathname = usePathname()

  const segments = useMemo(
    () => pathname.split('/').filter(Boolean),
    [pathname]
  )

  const breadcrumbItems = useMemo(() => {
    if (!segments.length) {
      return [
        {
          label: 'Projects',
          href: '/projects',
        },
      ]
    }

    const items: { label: string; href: string }[] = []
    let resolvedPath = ''

    segments.forEach((segment) => {
      resolvedPath += `/${segment}`

      if (segment === 'p') {
        items.push({
          label: 'Projects',
          href: '/projects',
        })
        return
      }

      items.push({
        label: formatSegment(segment),
        href: resolvedPath,
      })
    })

    return items
  }, [segments])

  const pageTitle =
    breadcrumbItems[breadcrumbItems.length - 1]?.label ?? 'Projects'

  return (
    <div className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <span className="text-base font-semibold text-slate-900 dark:text-slate-100 md:hidden">
          {pageTitle}
        </span>
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1
              return (
                <Fragment key={item.href}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="outline"
          size="sm"
          className="hidden items-center gap-2 md:flex"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative hidden md:inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-red-500" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-60"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">
                  {user.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Account</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing" className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
