'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Globe, Loader2, Plus, Shield, Trash2 } from 'lucide-react'
import { MdSecurity } from 'react-icons/md'
import { AiFillSafetyCertificate } from 'react-icons/ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import {
  useAddAllowedOrigin,
  useAllowedOrigins,
  useDeleteAllowedOrigin,
} from '@/lib/hooks/use-allowed-origins'

function formatOriginLabel(origin: string) {
  try {
    const url = new URL(origin)
    return url.host || origin
  } catch {
    return origin
  }
}

export default function ProjectSecurityPage() {
  const projectId = useProjectRouteId()
  const { toast } = useToast()
  const { data: origins, isLoading, error } = useAllowedOrigins(projectId)
  const { mutateAsync: addOrigin, isPending: isAdding } =
    useAddAllowedOrigin(projectId)
  const { mutateAsync: removeOrigin, isPending: isDeleting } =
    useDeleteAllowedOrigin(projectId)

  const [originInput, setOriginInput] = useState('')
  const [deletingOrigin, setDeletingOrigin] = useState<string | null>(null)

  const sortedOrigins = useMemo(
    () => (origins ?? []).slice().sort((a, b) => a.localeCompare(b)),
    [origins],
  )

  const handleAddOrigin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = originInput.trim()

    if (!value) {
      toast({
        title: 'Enter a domain',
        description: 'Add the origin where your frontend is hosted.',
        variant: 'destructive',
      })
      return
    }

    if (!/^https?:\/\//i.test(value)) {
      toast({
        title: 'Invalid origin',
        description: 'Origins must start with http:// or https://',
        variant: 'destructive',
      })
      return
    }

    try {
      await addOrigin({ origin: value })
      setOriginInput('')
      toast({
        title: 'Domain added',
        description: 'Only requests from listed origins will be allowed.',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to add domain.'
      toast({
        title: 'Add failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteOrigin = async (origin: string) => {
    setDeletingOrigin(origin)
    try {
      await removeOrigin({ origin })
      toast({
        title: 'Domain removed',
        description: 'This origin can no longer call your API.',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to remove domain.'
      toast({
        title: 'Delete failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeletingOrigin(null)
    }
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Security
          </h2>
          <p className="text-lg font-stix text-foreground/80 max-w-2xl tracking-wide">
            Lock down your API so only trusted frontend domains can call it.
            <br />
            Configure CORS settings to protect against unauthorized access.
          </p>
          {error ? (
            <p className="text-sm text-destructive mt-2">
              {error.message || 'Unable to load allowed origins.'}
            </p>
          ) : null}
        </div>
      </div>

      {/* Allowed Origins Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground/80">
            Allowed Origins
          </h3>
          <div className="flex items-center gap-1.5 text-foreground bg-accent-foreground/50 px-2 py-0.5 rounded-sm">
            <MdSecurity className="size-4" />
            <span className="text-xs font-medium">CORS</span>
          </div>
          <p className="text-sm text-foreground/60 ml-auto">
            {isLoading
              ? 'Loading...'
              : sortedOrigins.length === 1
                ? '1 domain'
                : `${sortedOrigins.length} domains`}
          </p>
        </div>

        <div className="rounded-sm border border-neutral-200 bg-background p-5">
          <div className="space-y-7">
            <p className="text-sm text-foreground/65">
              Add the domains where your frontend application is hosted.
              Requests from other origins will be blocked by CORS.
            </p>

            <form onSubmit={handleAddOrigin} className="space-y-3">
              <Label className="font-semibold" htmlFor="allowed-origin">
                Add Domain
              </Label>
              <div className="flex flex-col mt-2 gap-2 sm:flex-row">
                <Input
                  id="allowed-origin"
                  type="url"
                  placeholder="https://example.com"
                  value={originInput}
                  onChange={(event) => setOriginInput(event.target.value)}
                  disabled={isLoading || isAdding}
                  required
                  className="rounded-xs shadow-none border border-muted-foreground/60 h-11 flex-1"
                />
                <Button
                  type="submit"
                  className="gap-2 h-11 px-5 rounded-xs bg-accent/90 cursor-pointer hover:bg-accent/80"
                  disabled={!originInput.trim() || isAdding}
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="size-5" />
                  )}
                  Add Domain
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              <div className="text-sm text-foreground/55">
                Listed domains will be matched against the{' '}
                <code className="text-foreground/80 bg-neutral-100 px-1.5 py-0.5 rounded text-xs font-medium">
                  Origin
                </code>{' '}
                header of incoming requests.
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Loading origins…
                  </span>
                </div>
              ) : sortedOrigins.length ? (
                <div className="overflow-hidden mt-4 rounded-sm border border-neutral-200">
                  {sortedOrigins.map((origin, index) => (
                    <div
                      key={origin}
                      className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 ${
                        index !== sortedOrigins.length - 1
                          ? 'border-b border-neutral-200'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-sm border border-neutral-200 bg-muted p-2">
                          <Globe
                            className="size-6 text-neutral-500/80"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none text-foreground">
                            {formatOriginLabel(origin)}
                          </p>
                          <p className="break-all text-xs text-foreground/60 mt-1">
                            {origin}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteOrigin(origin)}
                        disabled={isDeleting && deletingOrigin === origin}
                        className="h-9 w-9 rounded-xs cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        {isDeleting && deletingOrigin === origin ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <Trash2 className="size-5" />
                        )}
                        <span className="sr-only">Delete origin</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State - When no origins are configured */}
      {!isLoading && sortedOrigins.length === 0 && (
        <div className="w-full bg-background rounded-sm border border-destructive/20 py-12 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-5">
              <AiFillSafetyCertificate className="size-10 text-destructive/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground font-noto mb-2">
              No origins configured
            </h3>
            <p className="text-sm text-foreground/60 max-w-md mb-2">
              Browser requests to your API will fail until you add at least one
              allowed origin. Add your frontend domain above to enable API
              access.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
