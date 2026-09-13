'use client'

import { useMemo, useState } from 'react'
import { Copy, Globe, RefreshCw, Trash2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { useProject } from '@/lib/hooks/use-projects'

type DomainConfig = {
  domain: string
  status: 'pending' | 'active'
  dnsRecord: {
    type: string
    name: string
    value: string
  }
}

const mockConfig: DomainConfig = {
  domain: 'courses.priya-yoga.com',
  status: 'pending',
  dnsRecord: {
    type: 'CNAME',
    name: 'courses',
    value: 'cname.headless-lms.com',
  },
}

export default function ProjectDomainPage() {
  const projectId = useProjectRouteId()
  const { data: project, isLoading } = useProject(projectId)
  const { toast } = useToast()

  const [domainInput, setDomainInput] = useState('')
  const [domainConfig, setDomainConfig] = useState<DomainConfig | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const statusBadge = useMemo(() => {
    if (!domainConfig) return null
    const isActive = domainConfig.status === 'active'
    return (
      <Badge
        variant='secondary'
        className={isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}
      >
        {isActive ? 'Active' : 'Pending'}
      </Badge>
    )
  }, [domainConfig])

  const handleConnect = async () => {
    if (!domainInput.trim()) {
      toast({
        title: 'Enter a domain',
        description: 'Add the domain you want to map to this project.',
        variant: 'destructive',
      })
      return
    }

    setIsConnecting(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      setDomainConfig({
        ...mockConfig,
        domain: domainInput.trim(),
      })
      toast({
        title: 'Domain connected',
        description: 'Update your DNS to finish verification.',
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard.`,
      })
    } catch {
      toast({
        title: 'Unable to copy',
        description: 'Please copy the value manually.',
        variant: 'destructive',
      })
    }
  }

  const handleRefresh = async () => {
    if (!domainConfig) return
    setIsRefreshing(true)
    // Simulate a status check that could flip to active
    await new Promise((resolve) => setTimeout(resolve, 500))
    setDomainConfig((prev) =>
      prev
        ? {
            ...prev,
            status: prev.status === 'pending' ? 'active' : prev.status,
          }
        : prev
    )
    setIsRefreshing(false)
  }

  const handleRemove = () => {
    setDomainConfig(null)
    setDomainInput('')
    toast({
      title: 'Domain removed',
      description: 'You can connect a new domain anytime.',
    })
  }

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h1 className='text-3xl font-semibold tracking-tight'>Custom Domain</h1>
        <p className='text-sm text-muted-foreground'>
          {isLoading
            ? 'Loading domain settings...'
            : `Brand ${project?.name ?? 'this project'} with your own domain.`}
        </p>
      </div>

      {!domainConfig ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect Domain</CardTitle>
            <CardDescription>
              Map a custom hostname (like courses.example.com) to your LMS portal.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-foreground' htmlFor='domain-input'>
                Domain
              </label>
              <Input
                id='domain-input'
                placeholder='courses.example.com'
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                disabled={isConnecting}
              />
            </div>
          </CardContent>
          <CardFooter className='flex justify-end'>
            <Button
              onClick={handleConnect}
              className='gap-2'
              disabled={isConnecting || !domainInput.trim()}
            >
              {isConnecting ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Globe className='h-4 w-4' />
              )}
              Connect Domain
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader className='space-y-3'>
            <div className='flex flex-wrap items-center gap-3'>
              <CardTitle className='text-xl'>{domainConfig.domain}</CardTitle>
              {statusBadge}
            </div>
            <CardDescription>
              We are verifying your DNS. Keep this page open while you update your records.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='overflow-hidden rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name / Host</TableHead>
                    <TableHead>Value / Target</TableHead>
                    <TableHead>TTL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className='align-middle'>
                    <TableCell className='align-middle font-mono text-xs'>
                      {domainConfig.dnsRecord.type}
                    </TableCell>
                    <TableCell className='align-middle'>
                      <div className='flex items-center gap-2 font-mono text-xs'>
                        {domainConfig.dnsRecord.name}
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          onClick={() => handleCopy(domainConfig.dnsRecord.name, 'Name / Host')}
                        >
                          <Copy className='h-4 w-4' />
                          <span className='sr-only'>Copy name or host</span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className='align-middle'>
                      <div className='flex items-center gap-2 font-mono text-xs'>
                        {domainConfig.dnsRecord.value}
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          onClick={() => handleCopy(domainConfig.dnsRecord.value, 'Value / Target')}
                        >
                          <Copy className='h-4 w-4' />
                          <span className='sr-only'>Copy value or target</span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className='align-middle font-mono text-xs'>Auto</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Alert className='bg-amber-50 text-amber-900 border-amber-200'>
              <AlertDescription>
                DNS changes can take up to 24 hours to propagate.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className='flex flex-wrap justify-end gap-2'>
            <Button
              variant='secondary'
              className='gap-2'
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            <Button variant='destructive' className='gap-2' onClick={handleRemove}>
              <Trash2 className='h-4 w-4' />
              Remove Domain
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
