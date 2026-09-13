import {
  BookOpen,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  KeyRound,
  Layers,
  Mail,
  Plus,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const stats = [
  {
    label: 'Total Projects',
    value: '24',
    sublabel: 'Active projects',
    icon: FolderKanban,
    delta: '+12% from last month',
    gradient: 'from-purple-500/20 to-purple-500/5',
  },
  {
    label: 'Total Users',
    value: '1,284',
    sublabel: 'Registered users',
    icon: Users,
    delta: '+8% from last month',
    gradient: 'from-blue-500/20 to-blue-500/5',
  },
  {
    label: 'Courses',
    value: '42',
    sublabel: 'Published courses',
    icon: BookOpen,
    delta: '+5% from last month',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
  },
  {
    label: 'Enrollments',
    value: '3,912',
    sublabel: 'Active enrollments',
    icon: GraduationCap,
    delta: '+12% from last month',
    gradient: 'from-orange-500/20 to-orange-500/5',
  },
]

const activities = [
  {
    title: 'New enrollment in JavaScript 101',
    time: '2 hours ago',
    icon: GraduationCap,
    badge: 'Enrollment',
    badgeVariant: 'default' as const,
  },
  {
    title: 'Quiz completed by john@email.com',
    time: '5 hours ago',
    icon: Mail,
    badge: 'Assessment',
    badgeVariant: 'secondary' as const,
  },
  {
    title: "Course 'React Basics' published",
    time: '1 day ago',
    icon: Layers,
    badge: 'Course',
    badgeVariant: 'outline' as const,
  },
]

const quickActions = [
  {
    label: 'Create Project',
    description: 'Spin up a new learning initiative',
    icon: Plus,
    variant: 'default' as const,
  },
  {
    label: 'View Documentation',
    description: 'Read guides and best practices',
    icon: ExternalLink,
    variant: 'secondary' as const,
  },
  {
    label: 'Get API Key',
    description: 'Connect your integrations',
    icon: KeyRound,
    variant: 'outline' as const,
  },
]

export default function DashboardPage() {
  const userName = 'Alex'
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-6 py-5 shadow-sm dark:border-slate-800/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {userName}!
          </h1>
          <p className="text-sm text-muted-foreground">{currentDate}</p>
        </div>
        <Button className="mt-4 inline-flex items-center gap-2 sm:mt-0">
          <Plus className="h-4 w-4" />
          Create something new
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="relative overflow-hidden border-0 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm transition-all hover:shadow-lg dark:from-slate-900 dark:via-slate-900 dark:to-slate-950"
          >
            <div
              className={cn(
                'absolute inset-0 rounded-2xl border border-slate-200/60 dark:border-slate-800/60',
                `bg-gradient-to-br ${stat.gradient}`,
              )}
              aria-hidden="true"
            />
            <div className="relative h-full rounded-2xl bg-gradient-to-br from-white/70 via-white/40 to-white/20 p-1 dark:from-slate-950/60 dark:via-slate-950/40 dark:to-slate-950/10">
              <div className="flex h-full flex-col rounded-2xl bg-white/80 p-5 backdrop-blur dark:bg-slate-950/80">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </CardTitle>
                    <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900/5 p-2 text-slate-900 dark:bg-slate-100/10 dark:text-white">
                    <stat.icon className="h-5 w-5" />
                  </span>
                </CardHeader>
                <CardContent className="mt-auto space-y-2 p-0">
                  <p className="text-xs text-muted-foreground">
                    {stat.sublabel}
                  </p>
                  <Badge
                    variant="outline"
                    className="w-max border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    {stat.delta}
                  </Badge>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              View all
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.title}
                    className="flex items-start gap-4 rounded-xl border border-transparent bg-slate-50/60 p-4 transition-colors hover:border-slate-200 hover:bg-white dark:bg-slate-900/40 dark:hover:border-slate-800 dark:hover:bg-slate-900"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/10 text-slate-900 dark:bg-slate-100/10 dark:text-slate-100">
                      <activity.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {activity.title}
                        </p>
                        <Badge variant={activity.badgeVariant}>
                          {activity.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className={cn(
                    'h-auto justify-start gap-3 rounded-xl border border-slate-200 bg-white py-4 text-left text-sm font-semibold shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950',
                    action.variant === 'default' &&
                      'bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-slate-100 dark:text-slate-900',
                  )}
                >
                  <action.icon className="h-5 w-5" />
                  <span>
                    {action.label}
                    <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
