/**
 * The email contract, in a module that imports nothing.
 *
 * `console.ts`, `resend.ts`, `smtp.ts` and `provider.ts` all need these, and
 * taking them from `index.js` would make every one of them part of a cycle —
 * `index` re-exports them, so a cycle here is a load-order dependency rather
 * than a design one. The same reason `contracts/envelope.ts` exists.
 */

export type EmailMessage = {
  to: string
  subject: string
  html: string
  /** Always present: a message without one is more likely to be filtered. */
  text: string
  /** Overrides the configured sender. Used for invitations. */
  replyTo?: string
}

export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage): Promise<void>
}

/**
 * A send that did not happen.
 *
 * Typed so a job handler can decide whether to retry: a refused recipient is
 * permanent and a provider outage is not. Retrying a permanent failure burns the
 * queue's budget until the job reaches the terminal-failure list, where nobody
 * looks — because the real problem was visible on the first attempt.
 */
export class EmailError extends Error {
  readonly code: 'not_configured' | 'rejected' | 'provider_error'

  constructor(
    code: EmailError['code'],
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'EmailError'
    this.code = code
  }
}
