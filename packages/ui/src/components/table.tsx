'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * Table primitives that keep the semantics.
 *
 * `Table` renders a real `<table>` rather than a grid of divs: dense data is
 * exactly where a screen reader user benefits most from a row and column
 * relationship, and where a div grid loses it. The horizontal scroll container is
 * part of the component because a table that overflows is the case that always
 * arrives late — and the scrolling region must be reachable by keyboard, so it is
 * focusable and labelled.
 */
function Table({
  className,
  label,
  ...props
}: React.ComponentProps<'table'> & { label: string }) {
  return (
    <div
      data-slot="table-container"
      role="region"
      aria-label={label}
      tabIndex={0}
      className="w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn('text-ink w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('border-border-decorative border-b', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-border-decorative bg-surface-subtle border-t font-medium',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-border-decorative hover:bg-surface-subtle/60 border-b transition-colors',
        'data-[state=selected]:bg-surface-subtle',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        'text-ink-muted h-10 px-3 text-left align-middle text-xs font-medium tracking-wide uppercase whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('text-ink px-3 py-3 align-middle', className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-ink-muted mt-3 text-sm', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
