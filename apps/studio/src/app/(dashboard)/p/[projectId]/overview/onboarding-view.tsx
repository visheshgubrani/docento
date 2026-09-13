'use client'

import Link from 'next/link'
import { BookOpen, CheckCircle, Copy, Key, Terminal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { captureClientException, captureEvent } from '@/lib/posthog'

type OnboardingViewProps = {
  projectId: string
  projectName?: string | null
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'

export default function OnboardingView({
  projectId,
  projectName,
}: OnboardingViewProps) {
  const { toast } = useToast()

  const steps = [
    {
      title: 'Generate API Key',
      description: 'Required to fetch content.',
      icon: Key,
      action: {
        label: 'Go to Developer Settings',
        href: `/p/${projectId}/developer/api-keys`,
        variant: 'outline' as const,
      },
    },
    {
      title: 'Create First Course',
      description: 'Define your curriculum.',
      icon: BookOpen,
      action: {
        label: 'Create Course',
        href: `/p/${projectId}/courses`,
        variant: 'default' as const,
      },
    },
    {
      title: 'Test Integration',
      description: 'Make your first API call.',
      icon: Terminal,
    },
  ]

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      captureEvent('onboarding_config_copied', {
        label,
        project_id: projectId,
      })
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard.`,
      })
    } catch {
      captureClientException(new Error('Clipboard write failed'), {
        context: 'onboarding_copy_config',
        label,
        project_id: projectId,
      })
      toast({
        title: 'Unable to copy',
        description: 'Please copy the value manually.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Let&apos;s set up your project
        </h1>
        <p className="text-sm text-muted-foreground">
          Follow these steps to integrate the LMS into your frontend.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Run through this checklist to ship your first learning
                experience.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Checklist
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-lg border border-dashed px-4 py-3"
                >
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {step.title}
                      </p>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  {step.action ? (
                    <Button
                      asChild
                      variant={step.action.variant}
                      className="whitespace-nowrap"
                    >
                      <Link href={step.action.href}>{step.action.label}</Link>
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Developer Config</CardTitle>
            <CardDescription>
              Copy these values into your frontend or API client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Project ID</p>
              <div className="flex gap-2">
                <Input value={projectId} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(projectId, 'Project ID')}
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy Project ID</span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                API Endpoint
              </p>
              <div className="flex gap-2">
                <Input value={API_BASE_URL} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(API_BASE_URL, 'API Endpoint')}
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy API Endpoint</span>
                </Button>
              </div>
            </div>
            {projectName ? (
              <p className="text-xs text-muted-foreground">
                You are configuring{' '}
                <span className="font-medium text-foreground">
                  {projectName}
                </span>
                .
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild variant="link" className="px-0">
              <Link href="https://docs.example.com">View Documentation</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
