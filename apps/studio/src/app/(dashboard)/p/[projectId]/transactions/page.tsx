'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { ProjectTransaction } from '@/lib/api'
import { downloadCsv, type CsvColumn } from '@/lib/csv-export'
import { useProjectAnalyticsRecentSales } from '@/lib/hooks/use-analytics'
import { downloadPdfReport } from '@/lib/pdf-export'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { useProject } from '@/lib/hooks/use-projects'
import { FaMoneyBill } from 'react-icons/fa'
import { IoMdDownload } from 'react-icons/io'

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatCurrency(amount?: number | null, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

function formatExportCurrency(amount?: number | null, currency = 'INR') {
  const normalizedCurrency = currency.toUpperCase()
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount ?? 0)

  if (normalizedCurrency === 'INR') {
    return `Rs. ${formattedAmount}`
  }

  return `${normalizedCurrency} ${formattedAmount}`
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available'

  try {
    return dateTimeFormatter.format(new Date(value))
  } catch {
    return 'Not available'
  }
}

function getStudentName(transaction: ProjectTransaction) {
  return (
    transaction.student?.name?.trim() ||
    transaction.student?.email ||
    transaction.student?.externalId ||
    'Unknown student'
  )
}

function getStudentContact(transaction: ProjectTransaction) {
  return (
    transaction.student?.email ||
    transaction.student?.externalId ||
    'Not provided'
  )
}

function truncateCourseName(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) return 'Unknown course'

  const words = normalized.split(/\s+/)
  if (words.length <= 3) {
    return normalized
  }

  return `${words.slice(0, 3).join(' ')}...`
}

function getStatusVariant(
  status?: string | null,
): 'default' | 'secondary' | 'destructive' {
  switch ((status ?? '').toUpperCase()) {
    case 'COMPLETED':
      return 'default'
    case 'PENDING':
      return 'secondary'
    default:
      return 'destructive'
  }
}

function TransactionsTableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((item) => (
        <TableRow key={item}>
          <TableCell className="pl-4">
            <div className="space-y-2">
              <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-right">
            <div className="ml-auto h-3.5 w-20 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell className="text-right pr-4">
            <div className="ml-auto h-3.5 w-28 rounded bg-muted animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function ProjectTransactionsPage() {
  const projectId = useProjectRouteId()
  const { data: project } = useProject(projectId)
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [downloadingFormat, setDownloadingFormat] = useState<
    'pdf' | 'csv' | null
  >(null)
  const deferredSearch = useDeferredValue(searchTerm)

  const {
    data: transactions = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useProjectAnalyticsRecentSales(projectId)

  const filteredTransactions = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) {
      return transactions
    }

    return transactions.filter((transaction) => {
      const haystack = [
        transaction.id,
        transaction.provider,
        transaction.providerTxId,
        transaction.status,
        transaction.course?.title,
        transaction.student?.name,
        transaction.student?.email,
        transaction.student?.externalId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [deferredSearch, transactions])

  const exportRows = filteredTransactions.map((transaction) => ({
    transactionId: transaction.id,
    provider: transaction.provider,
    providerReference: transaction.providerTxId ?? 'Not provided',
    studentName: getStudentName(transaction),
    studentContact: getStudentContact(transaction),
    course: transaction.course?.title ?? 'Unknown course',
    status: transaction.status,
    amount: formatExportCurrency(transaction.amount, transaction.currency),
    date: formatDateTime(transaction.createdAt),
  }))

  const handleDownload = async (format: 'pdf' | 'csv') => {
    if (filteredTransactions.length === 0) {
      toast({
        title: 'No transactions to export',
        description: 'Adjust your filters or wait for payments to come in.',
        variant: 'destructive',
      })
      return
    }

    setDownloadingFormat(format)

    try {
      if (format === 'pdf') {
        await downloadPdfReport({
          title: `${project?.name ?? 'Project'} Transactions`,
          subtitle: `${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? '' : 's'} exported`,
          filename: `${project?.slug ?? 'project'}-transactions.pdf`,
          columns: [
            { key: 'transactionId', label: 'Transaction', weight: 1.6 },
            { key: 'studentName', label: 'Student', weight: 1.4 },
            { key: 'studentContact', label: 'Contact', weight: 1.5 },
            { key: 'course', label: 'Course', weight: 1.5 },
            { key: 'status', label: 'Status', weight: 1, align: 'center' },
            { key: 'amount', label: 'Amount', weight: 1, align: 'right' },
            { key: 'date', label: 'Date', weight: 1.4, align: 'right' },
          ],
          rows: exportRows,
        })

        toast({
          title: 'Transactions downloaded',
          description: 'Your PDF export is ready.',
        })
        return
      }

      downloadCsv('transactions.csv', exportRows, [
        { label: 'Transaction ID', value: (row) => row.transactionId },
        { label: 'Provider', value: (row) => row.provider },
        { label: 'Reference', value: (row) => row.providerReference },
        { label: 'Student', value: (row) => row.studentName },
        { label: 'Contact', value: (row) => row.studentContact },
        { label: 'Course', value: (row) => row.course },
        { label: 'Status', value: (row) => row.status },
        { label: 'Amount', value: (row) => row.amount },
        { label: 'Date', value: (row) => row.date },
      ])

      toast({
        title: 'Transactions downloaded',
        description: 'Your CSV export is ready.',
      })
    } catch (error) {
      toast({
        title: 'Unable to download transactions',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingFormat(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold font-literata tracking-wide">
            Transactions
          </h2>
          <p className="text-lg font-stix text-foreground/80 max-w-2xl tracking-wide">
            Review the latest payments for {project?.name ?? 'this project'}.
            <br />
            Search by learner, course, payment provider, or transaction
            reference.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions by student, course, payment ID, or provider..."
            className="pl-11 h-12 text-base bg-background border-neutral-300 rounded-xs shadow-none"
            aria-label="Filter transactions"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {isFetching && !isLoading ? (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 h-12 px-5 rounded-xs font-medium shrink-0 hover:text-foreground cursor-pointer"
              disabled={downloadingFormat !== null}
            >
              {downloadingFormat ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <IoMdDownload className="size-5" />
              )}
              {downloadingFormat
                ? `Downloading ${downloadingFormat === 'pdf' ? 'PDF' : 'CSV'}...`
                : 'Download'}
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={downloadingFormat !== null}
              onClick={() => handleDownload('pdf')}
            >
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={downloadingFormat !== null}
              onClick={() => handleDownload('csv')}
            >
              Download CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground/80">
          {isLoading
            ? 'Loading transactions...'
            : filteredTransactions.length === 1
              ? 'Showing 1 transaction'
              : `Showing ${filteredTransactions.length} transactions`}
        </p>
        {isFetching && !isLoading && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-neutral-200">
                <TableHead className="text-foreground/90 font-medium pl-4">
                  Transaction
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Student
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Course
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Status
                </TableHead>
                <TableHead className="text-right text-foreground/90 font-medium">
                  Amount
                </TableHead>
                <TableHead className="text-right text-foreground/90 font-medium pr-4">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TransactionsTableSkeleton />
            </TableBody>
          </Table>
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-neutral-200 bg-background p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                Unable to load transactions
              </p>
              <p className="text-sm text-muted-foreground">
                {error?.message ?? 'Please try again in a moment.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="w-full bg-background rounded-sm border border-neutral-200 py-16 px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-5 mb-5">
              <FaMoneyBill className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No transactions yet
            </h3>
            <p className="text-base text-foreground/60 max-w-md">
              {searchTerm
                ? `No transactions match "${searchTerm}". Try a different search term.`
                : 'Learner payments will appear here once purchases start coming in.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-neutral-200">
                <TableHead className="text-foreground/90 font-medium pl-4">
                  Transaction
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Student
                </TableHead>
                <TableHead className="text-foreground/90 font-medium">
                  Course
                </TableHead>
                <TableHead className="text-foreground/90 text-center font-medium">
                  Status
                </TableHead>
                <TableHead className="text-right text-foreground/90 font-medium">
                  Amount
                </TableHead>
                <TableHead className="text-right text-foreground/90 font-medium pr-4">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className="border-b border-neutral-100 hover:bg-muted/70"
                >
                  <TableCell className="pl-4 align-top">
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-medium text-foreground">
                        {transaction.id}
                      </p>
                      <p className="text-xs text-foreground/60">
                        {transaction.provider}
                        {transaction.providerTxId
                          ? ` • ${transaction.providerTxId}`
                          : ''}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {getStudentName(transaction)}
                      </p>
                      <p className="text-sm text-foreground/60">
                        {getStudentContact(transaction)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-center text-foreground font-medium">
                    {truncateCourseName(transaction.course?.title)}
                  </TableCell>
                  <TableCell className="align-center text-center">
                    <Badge
                      variant={getStatusVariant(transaction.status)}
                      className="text-xs"
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right align-center font-medium text-foreground">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </TableCell>
                  <TableCell className="text-right align-center pr-4 text-foreground/75">
                    {formatDateTime(transaction.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
