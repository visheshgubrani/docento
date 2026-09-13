'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { isUnauthenticated, messageFor } from '@/lib/client-api'

/**
 * A write, with the four pieces of state every write in this application needs.
 *
 * ## Why this exists
 *
 * Every authoring form does the same four things: track whether it is in flight,
 * hold a message when it fails, refresh the server component so the page shows
 * what changed, and send the user to sign in if their session expired. Written
 * out per form that is four `useState` calls and a `try/catch` repeated a dozen
 * times — and the one that gets skipped is the refresh, which produces a form
 * that looks like it did nothing.
 *
 * ## The idempotency key is part of the state, not of the call
 *
 * A retryable operation needs a key that is stable across retries of *one*
 * action. So it is minted on first use and kept until the action settles, at
 * which point it is discarded — pressing the button again is then a new action
 * with a new key, while a double-click or a network retry reuses the first. A
 * key generated inside the call would be a random string, which is the failure
 * mode the whole mechanism exists to prevent.
 *
 * ## Why the options are held in a ref, and written in an effect
 *
 * They are an object literal at each call site, so a new identity every render.
 * As dependencies they would rebuild `run` every render, which makes `run`
 * unusable in an effect and defeats memoisation for no benefit — the values
 * inside are read once per call, so the ref holds the current ones.
 *
 * The write happens in an effect rather than during render. Assigning
 * `ref.current = options` in the component body is a render-phase side effect:
 * it mutates during the pass React may discard and repeat, and the compiler
 * rules refuse it for exactly that reason. An effect runs after the commit, so
 * the callback a *later* event reads is always the current render's.
 */
export function useAsyncAction(options: {
  /** Prefix for the generated idempotency key, e.g. `course-create`. */
  keyPrefix?: string
  /** Where to land on success. Omit to refresh the current page instead. */
  redirectTo?: string
  /**
   * Called with the result, for a form that wants to show or select it.
   *
   * Typed as `unknown` because the result's type is the *call's*, not the
   * hook's: one hook instance drives one action, and making the hook generic
   * would mean writing the type twice at every call site to say something the
   * callback already knows. A caller that reads a field narrows it — which is
   * where the shape of its own API response belongs anyway.
   */
  onSuccess?: (result: unknown) => void
}) {
  const router = useRouter()

  const latest = useRef(options)

  useEffect(() => {
    latest.current = options
  })

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState<string | null>(null)

  const run = useCallback(
    async <T>(
      work: (idempotencyKey: string) => Promise<T>,
    ): Promise<T | null> => {
      setPending(true)
      setError(null)

      const idempotencyKey =
        key ?? `${latest.current.keyPrefix ?? 'action'}-${crypto.randomUUID()}`

      if (!key) setKey(idempotencyKey)

      try {
        const result = await work(idempotencyKey)

        setKey(null)
        latest.current.onSuccess?.(result)

        if (latest.current.redirectTo) {
          router.push(latest.current.redirectTo)
        } else {
          /**
           * The server components on this page are now stale — they were
           * rendered before the write. Refreshing is what makes the form's
           * result visible without the operator reloading by hand.
           */
          router.refresh()
        }

        return result
      } catch (caught) {
        /**
         * An expired session is recovered from, not reported. The API refused
         * because the cookie is gone or revoked, and no message to the operator
         * changes that — signing in again does.
         */
        if (isUnauthenticated(caught)) {
          const next =
            typeof window === 'undefined'
              ? '/workspaces'
              : window.location.pathname

          router.push(`/login?next=${encodeURIComponent(next)}`)

          return null
        }

        setError(messageFor(caught))

        return null
      } finally {
        setPending(false)
      }
    },
    // `key` is a dependency on purpose: clearing it after success has to be
    // visible to the next call, and a stale closure would reuse a spent key.
    [key, router],
  )

  return { run, pending, error, setError }
}
