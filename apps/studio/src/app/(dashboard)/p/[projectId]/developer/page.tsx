import Link from 'next/link'
import {
  BadgePercent,
  CreditCard,
  Globe,
  KeyRound,
  ShieldCheck,
  Users,
  Webhook,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const developerTiles = [
  {
    title: 'API Keys',
    description: 'Generate client + server keys for integrations.',
    href: (projectId: string) => `/p/${projectId}/developer/api-keys`,
    icon: KeyRound,
    accent: 'from-emerald-500/15 to-emerald-500/5',
  },
  {
    title: 'Webhooks',
    description: 'Receive LMS events in your backend.',
    href: (projectId: string) => `/p/${projectId}/developer/webhooks`,
    icon: Webhook,
    accent: 'from-indigo-500/15 to-indigo-500/5',
  },
  {
    title: 'Security',
    description: 'Control allowed origins and tokens.',
    href: (projectId: string) => `/p/${projectId}/developer/security`,
    icon: ShieldCheck,
    accent: 'from-amber-500/15 to-amber-500/5',
  },
  {
    title: 'Payments',
    description: 'Set Razorpay keys for managed checkout.',
    href: (projectId: string) => `/p/${projectId}/developer/payments`,
    icon: CreditCard,
    accent: 'from-fuchsia-500/15 to-fuchsia-500/5',
  },
  {
    title: 'Coupons',
    description: 'Create and manage course discount promotions.',
    href: (projectId: string) => `/p/${projectId}/developer/coupons`,
    icon: BadgePercent,
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  {
    title: 'Collaborators',
    description: 'Invite and manage project teammates.',
    href: (projectId: string) => `/p/${projectId}/developer/collaborators`,
    icon: Users,
    accent: 'from-sky-500/15 to-sky-500/5',
  },
  {
    title: 'Domains',
    description: 'Configure your custom project domain.',
    href: (projectId: string) => `/p/${projectId}/developer/domain`,
    icon: Globe,
    accent: 'from-rose-500/15 to-rose-500/5',
  },
]

export default function DeveloperPage({
  params,
}: {
  params: { projectId: string }
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Project Developer
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage API access, events, and security controls for this project. Select
          a tool below to jump into its detailed settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {developerTiles.map(({ title, description, href, icon: Icon, accent }) => (
          <Link key={title} href={href(params.projectId)} className="group">
            <Card className="h-full border-border/70 transition-colors hover:border-primary/40">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className={cn('rounded-full p-2', `bg-gradient-to-br ${accent}`)}>
                    <Icon className="h-4 w-4 text-foreground" />
                  </span>
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium text-primary">
                  View {title.toLowerCase()} settings →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
