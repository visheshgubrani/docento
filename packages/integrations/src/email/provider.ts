import { createConsoleEmail } from './console.js'
import { EmailError, type EmailProvider } from './types.js'
import { createResendEmail } from './resend.js'
import { createSmtpEmail } from './smtp.js'

/**
 * Which provider to use.
 *
 * ## The default is the console, and that is a product decision
 *
 * A fresh install with no mail account still completes sign-up and password
 * reset: the code is printed to the container log and an operator reads it. The
 * alternative — refusing to start, or silently dropping messages — makes the
 * first five minutes of a self-hosted install a configuration exercise.
 *
 * ## No provider is ever guessed
 *
 * Choosing Resend because a `RESEND_API_KEY` happens to be present would send
 * real mail from a development machine to real addresses. The provider is named
 * in the environment, and an unusable configuration raises rather than falling
 * back: a deployment that asked for SMTP and cannot get it should say so, not
 * quietly write password resets to a log that nobody is reading.
 */

export type EmailConfig =
  | { provider: 'console' }
  | { provider: 'resend'; apiKey: string; from: string }
  | {
      provider: 'smtp'
      host: string
      port: number
      secure: boolean
      requireTls: boolean
      username?: string
      password?: string
      from: string
    }

export function createEmailProvider(config: EmailConfig): EmailProvider {
  switch (config.provider) {
    case 'console':
      return createConsoleEmail()

    case 'resend':
      if (!config.apiKey || !config.from) {
        throw new EmailError(
          'not_configured',
          'Resend is selected but no API key or sender address is configured.',
        )
      }

      return createResendEmail({ apiKey: config.apiKey, from: config.from })

    case 'smtp':
      if (!config.host || !config.from) {
        throw new EmailError(
          'not_configured',
          'SMTP is selected but no host or sender address is configured.',
        )
      }

      return createSmtpEmail(config)

    default: {
      const unreachable: never = config

      throw new EmailError(
        'not_configured',
        `No email provider is registered for "${String(
          (unreachable as { provider?: string }).provider,
        )}".`,
      )
    }
  }
}

/**
 * The sender address, with a display name when one is configured.
 *
 * A bare address is deliverable but reads as machine-generated, and a display
 * name is what makes a password reset recognisable in an inbox. `Name <a@b>` is
 * the format both Resend and SMTP accept; the SMTP client extracts the bare
 * address for the envelope and keeps the display name in the header.
 */
export function formatSender(input: { from: string; name?: string }): string {
  if (!input.name) return input.from

  return `${input.name} <${input.from}>`
}
