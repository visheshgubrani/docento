'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Copy, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { MdWebhook } from 'react-icons/md'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import {
  useProjectWebhook,
  useSaveProjectWebhook,
  useSendTestWebhook,
} from '@/lib/hooks/use-webhooks'

const FALLBACK_EVENTS = [
  'enrollment.created',
  'lesson.completed',
  'course.completed',
  'quiz.attempt_completed',
]

export default function ProjectWebhooksPage() {
  const projectId = useProjectRouteId()
  const { toast } = useToast()
  const { data: webhook, isLoading, error } = useProjectWebhook(projectId)
  const { mutateAsync: saveWebhook, isPending: isSaving } =
    useSaveProjectWebhook(projectId)
  const { mutateAsync: sendTest, isPending: isTesting } =
    useSendTestWebhook(projectId)

  const [endpointUrl, setEndpointUrl] = useState('')
  const [secretVisible, setSecretVisible] = useState(false)

  useEffect(() => {
    setEndpointUrl(webhook?.url ?? '')
  }, [webhook?.url])

  const events = useMemo(
    () => (webhook?.events?.length ? webhook.events : FALLBACK_EVENTS),
    [webhook?.events],
  )

  const hasUrl = Boolean(endpointUrl.trim())
  const secretValue = webhook?.secret ?? ''

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedUrl = endpointUrl.trim()
    if (!trimmedUrl) {
      toast({
        title: 'Enter a webhook URL',
        description: 'Add a https:// endpoint to receive events.',
        variant: 'destructive',
      })
      return
    }

    try {
      const saved = await saveWebhook({ url: trimmedUrl })
      setEndpointUrl(saved.url ?? trimmedUrl)
      toast({
        title: 'Webhook saved',
        description: 'Events will now be delivered to this endpoint.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      toast({
        title: 'Unable to save webhook',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleCopySecret = async () => {
    if (!secretValue) return
    try {
      await navigator.clipboard.writeText(secretValue)
      toast({
        title: 'Secret copied',
        description: 'Signing secret copied to clipboard.',
      })
    } catch {
      toast({
        title: 'Unable to copy',
        description: 'Copy the secret manually.',
        variant: 'destructive',
      })
    }
  }

  const handleSendTest = async () => {
    if (!hasUrl) {
      toast({
        title: 'Add an endpoint first',
        description: 'Save a webhook URL before sending a test event.',
        variant: 'destructive',
      })
      return
    }

    try {
      await sendTest({})
      toast({
        title: 'Test event sent',
        description: 'Check your receiver for the sample payload.',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to send test.'
      toast({
        title: 'Test failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Webhooks
          </h2>
          <p className="text-lg font-stix text-foreground/80 max-w-2xl tracking-wide">
            Deliver LMS events to your backend in real-time.
            <br />
            Validate requests using the signing secret for security.
          </p>
          {error ? (
            <p className="text-sm text-destructive mt-2">
              {error.message || 'Unable to load webhook configuration.'}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          onClick={handleSendTest}
          disabled={!hasUrl || isLoading || isSaving || isTesting}
          className="gap-2 h-10 px-5 rounded-sm shrink-0 cursor-pointer hover:text-foreground"
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Send Test Event
        </Button>
      </div>

      {/* Endpoint URL Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground/80">
            Endpoint URL
          </h3>
          <div className="flex items-center gap-1.5 text-foreground bg-accent-foreground/50 px-2 py-0.5 rounded-sm">
            <MdWebhook className="size-4" />
            <span className="text-xs font-medium">HTTP POST</span>
          </div>
        </div>
        <div className="rounded-sm border border-neutral-200 bg-background p-5">
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="space-y-3">
              <p className="text-sm text-foreground/60">
                We will POST enrollment and course lifecycle events to this URL.
              </p>
              <div className="space-y-2">
                <Label className="font-semibold" htmlFor="webhook-url">
                  Webhook URL
                </Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://example.com/webhooks/lms"
                  value={endpointUrl}
                  onChange={(event) => setEndpointUrl(event.target.value)}
                  disabled={isLoading || isSaving}
                  required
                  className="rounded-xs mt-1 mt-2.5 shadow-none border border-muted-foreground/60 h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground/55 font-noto">
                Events delivered:
              </span>
              <div className="flex mt-2 flex-wrap items-center gap-2">
                {events.map((event) => (
                  <Badge
                    key={event}
                    variant="secondary"
                    className="rounded-xs px-2.5 py-1 text-xs font-medium bg-muted text-foreground/85"
                  >
                    {event}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                className="gap-2 h-10 px-5 rounded-xs bg-accent/90 cursor-pointer hover:bg-accent/80"
                disabled={!hasUrl || isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Signing Secret Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground/80">
            Signing Secret
          </h3>
        </div>
        <div className="rounded-sm border border-neutral-200 bg-background p-5">
          <div className="space-y-4">
            <p className="text-sm text-foreground/60">
              Use this secret to verify the{' '}
              <code className="text-foreground/80 bg-neutral-100 px-2 py-0.5 rounded font-medium text-xs">
                X-LMS-Signature
              </code>{' '}
              header on your backend.
            </p>
            <div className="space-y-2 mt-2">
              <Label className="font-semibold" htmlFor="webhook-secret">
                Secret Key
              </Label>
              <div className="flex items-center mt-2.5 gap-2">
                <Input
                  id="webhook-secret"
                  type={secretVisible ? 'text' : 'password'}
                  value={secretValue}
                  readOnly
                  disabled={isLoading}
                  placeholder="Secret not generated yet"
                  className="font-mono rounded-xs shadow-none border border-muted-foreground/60 h-11 bg-muted/40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSecretVisible((visible) => !visible)}
                  disabled={!secretValue}
                  className="h-11 w-11 rounded-xs cursor-pointer hover:text-foreground shrink-0"
                >
                  {secretVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {secretVisible ? 'Hide secret' : 'Show secret'}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  disabled={!secretValue}
                  className="h-11 w-11 rounded-xs cursor-pointer hover:text-foreground shrink-0"
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy secret</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State - When no webhook is configured */}
      {!isLoading && !webhook?.url && (
        <div className="w-full bg-background rounded-sm border border-neutral-200 py-16 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-5 mb-5">
              <MdWebhook className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No webhook configured
            </h3>
            <p className="text-base text-foreground/60 max-w-md mb-6">
              Add a webhook endpoint URL above to start receiving real-time
              events when students enroll, complete lessons, and more.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
