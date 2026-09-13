import { EmailError, type EmailMessage, type EmailProvider } from './types.js'

/**
 * Resend, over its HTTP API.
 *
 * Chosen as the hosted option because it needs one key and no domain
 * configuration to start, and because a plain `fetch` beats an SDK dependency
 * for a request this small — the API is one endpoint, and an SDK would be a
 * supply-chain surface for `POST` with a JSON body.
 *
 * `fetch` is injectable so the tests exercise the real request-building code
 * against a stub rather than a mocked module.
 */

export type ResendOptions = {
  apiKey: string
  /** Must be a verified domain, or Resend refuses the send. */
  from: string
  /** Overridable for tests and for a self-hosted Resend-compatible gateway. */
  baseUrl?: string
  fetch?: typeof globalThis.fetch
}

export function createResendEmail(options: ResendOptions): EmailProvider {
  const baseUrl = (options.baseUrl ?? 'https://api.resend.com').replace(
    /\/+$/,
    '',
  )
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis)

  if (!fetchImpl) {
    throw new EmailError(
      'not_configured',
      'No fetch implementation available for the Resend provider.',
    )
  }

  return {
    name: 'resend',

    async send(message: EmailMessage): Promise<void> {
      let response: Response

      try {
        response = await fetchImpl(`${baseUrl}/emails`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            from: options.from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          }),
        })
      } catch (error) {
        // A network failure is worth retrying; the caller decides, but the code
        // has to say which kind of failure this was.
        throw new EmailError(
          'provider_error',
          'The email provider could not be reached.',
          {
            cause: error,
          },
        )
      }

      if (response.ok) return

      const body = await response.text().catch(() => '')

      /**
       * `4xx` is permanent and `5xx` is not.
       *
       * A refused recipient or an unverified sender will fail again on every
       * retry, and retrying it burns the queue's budget until the job lands in
       * the terminal-failure list — where nobody looks, because the real
       * problem was visible on the first attempt.
       */
      if (response.status >= 400 && response.status < 500) {
        throw new EmailError(
          'rejected',
          `The email provider refused the message (${response.status}): ${body.slice(0, 300)}`,
        )
      }

      throw new EmailError(
        'provider_error',
        `The email provider failed (${response.status}): ${body.slice(0, 300)}`,
      )
    },
  }
}
