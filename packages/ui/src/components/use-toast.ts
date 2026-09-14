'use client'

import * as React from 'react'

import type { ToastVariant } from './toast'

/**
 * The toast queue.
 *
 * A module-level store rather than context, because a toast is raised from an
 * event handler that may be far from the component that renders the viewport —
 * a failed save, a copied link — and threading a context through every one of
 * those is how a codebase ends up with three toast systems.
 *
 * The actions are a discriminated union rather than an object of functions,
 * which is what the reducer actually reads: this file previously shipped a
 * runtime API object that was only ever used for its type.
 */
export type ToastRecord = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: ToastVariant
  /** Milliseconds before it dismisses itself; `Infinity` keeps it open. */
  duration?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export type ToastInput = Omit<ToastRecord, 'id' | 'open' | 'onOpenChange'>

type Action =
  | { type: 'add'; toast: ToastRecord }
  | { type: 'update'; id: string; toast: Partial<ToastRecord> }
  | { type: 'dismiss'; id: string }
  | { type: 'remove'; id: string }

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 400

let counter = 0
function nextId() {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER
  return String(counter)
}

const listeners: Array<(toasts: ToastRecord[]) => void> = []
const removals = new Map<string, ReturnType<typeof setTimeout>>()
let memory: ToastRecord[] = []

function reduce(state: ToastRecord[], action: Action): ToastRecord[] {
  switch (action.type) {
    case 'add':
      return [action.toast, ...state].slice(0, TOAST_LIMIT)
    case 'update':
      return state.map((toast) =>
        toast.id === action.id ? { ...toast, ...action.toast } : toast,
      )
    case 'dismiss':
      return state.map((toast) =>
        toast.id === action.id ? { ...toast, open: false } : toast,
      )
    case 'remove':
      return state.filter((toast) => toast.id !== action.id)
  }
}

function publish(next: ToastRecord[]) {
  memory = next
  for (const listener of listeners) listener(next)
}

function dispatch(action: Action) {
  publish(reduce(memory, action))
}

function scheduleRemoval(id: string) {
  if (removals.has(id)) return

  removals.set(
    id,
    setTimeout(() => {
      removals.delete(id)
      dispatch({ type: 'remove', id })
    }, TOAST_REMOVE_DELAY),
  )
}

export function toast(input: ToastInput) {
  const id = nextId()

  const record: ToastRecord = {
    ...input,
    id,
    open: true,
    duration: input.duration ?? 5000,
    onOpenChange: (open: boolean) => {
      if (!open) {
        dispatch({ type: 'dismiss', id })
        scheduleRemoval(id)
      } else {
        dispatch({ type: 'update', id, toast: { open: true } })
      }
    },
  }

  dispatch({ type: 'add', toast: record })

  return {
    id,
    dismiss: () => record.onOpenChange(false),
    update: (next: Partial<ToastRecord>) =>
      dispatch({ type: 'update', id, toast: next }),
  }
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastRecord[]>(memory)

  React.useEffect(() => {
    listeners.push(setToasts)

    return () => {
      const index = listeners.indexOf(setToasts)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    toasts,
    toast,
    dismiss: (id: string) => {
      const record = memory.find((entry) => entry.id === id)
      record?.onOpenChange(false)
    },
  }
}
