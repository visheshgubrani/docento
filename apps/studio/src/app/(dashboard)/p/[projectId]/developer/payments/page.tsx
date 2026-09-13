'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { FaRupeeSign } from 'react-icons/fa'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import {
  useProjectPaymentSettings,
  useSaveProjectPaymentSettings,
} from '@/lib/hooks/use-payment-settings'

export default function ProjectPaymentsPage() {
  const projectId = useProjectRouteId()
  const { toast } = useToast()

  const {
    data: paymentSettings,
    isLoading,
    error,
  } = useProjectPaymentSettings(projectId)

  const { mutateAsync: saveSettings, isPending: isSaving } =
    useSaveProjectPaymentSettings(projectId)

  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    setKeyId(paymentSettings?.keyId ?? '')
  }, [paymentSettings?.keyId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedKeyId = keyId.trim()
    const trimmedSecret = keySecret.trim()

    if (!trimmedKeyId || !trimmedSecret) {
      toast({
        title: 'Missing credentials',
        description: 'Both Razorpay key ID and key secret are required.',
        variant: 'destructive',
      })
      return
    }

    try {
      await saveSettings({
        keyId: trimmedKeyId,
        keySecret: trimmedSecret,
      })

      setKeySecret('')
      setShowSecret(false)
      toast({
        title: 'Payment settings saved',
        description: 'Managed checkout will now use your Razorpay account.',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save payment settings.'
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Payments
          </h2>
          <p className="text-lg font-stix text-foreground/80 max-w-2xl tracking-wide">
            Configure Razorpay credentials for managed checkout.
            <br />
            Student payments will be created on your own Razorpay account.
          </p>
          {error ? (
            <p className="text-sm text-destructive mt-2">
              {error.message || 'Unable to load payment settings.'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground/80">
            Razorpay Keys
          </h3>
          <div className="flex items-center gap-1.5 text-foreground bg-accent-foreground/50 px-2 py-0.5 rounded-sm">
            <FaRupeeSign className="size-3.5" />
            <span className="text-xs font-medium">Managed Gateway</span>
          </div>
          <p className="text-sm text-foreground/60 ml-auto">
            {paymentSettings?.isConfigured ? 'Configured' : 'Not configured'}
          </p>
        </div>

        <div className="rounded-sm border border-neutral-200 bg-background p-5">
          <form onSubmit={handleSubmit} className="space-y-7">
            <p className="text-sm text-foreground/65">
              Enter your Razorpay credentials. The secret key is encrypted
              before storing in the project database.
            </p>

            <div className="space-y-2">
              <Label className="font-semibold" htmlFor="razorpay-key-id">
                Key ID
              </Label>
              <Input
                id="razorpay-key-id"
                placeholder="rzp_live_xxxxxxxx"
                value={keyId}
                onChange={(event) => setKeyId(event.target.value)}
                disabled={isLoading || isSaving}
                required
                className="rounded-xs mt-2.5 shadow-none border border-muted-foreground/60 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold" htmlFor="razorpay-key-secret">
                Key Secret
              </Label>
              <div className="flex items-center mt-2.5 gap-2">
                <Input
                  id="razorpay-key-secret"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Enter Razorpay key secret"
                  value={keySecret}
                  onChange={(event) => setKeySecret(event.target.value)}
                  disabled={isLoading || isSaving}
                  required
                  className="rounded-xs shadow-none border border-muted-foreground/60 h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((visible) => !visible)}
                  disabled={isLoading || isSaving || !keySecret}
                  className="h-11 w-11 rounded-xs cursor-pointer hover:text-foreground shrink-0"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showSecret ? 'Hide secret' : 'Show secret'}
                  </span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                disabled={
                  isLoading || isSaving || !keyId.trim() || !keySecret.trim()
                }
                className="gap-2 h-10 px-5 rounded-xs bg-accent/90 cursor-pointer hover:bg-accent/80"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Payment Settings
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
