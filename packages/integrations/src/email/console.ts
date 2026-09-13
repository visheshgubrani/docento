import type { EmailMessage, EmailProvider } from './types.js'

/**
 * The console provider, and the default.
 *
 * Prints the message to stdout rather than sending it. That is not a stub — it
 * is what makes a self-hosted install complete with no account anywhere: a
 * contributor signs up, reads the verification code out of the terminal, and
 * continues. An operator on a small install can do the same from the container
 * log.
 *
 * ## What it deliberately does not do
 *
 * It does not pretend to succeed silently. A development provider that swallows
 * messages makes "why did no email arrive" unanswerable, which is exactly the
 * confusion this avoids by printing everything.
 *
 * It does not print secrets in production without saying so. The line carries
 * the provider name, so a log shipped to an aggregator makes it obvious that
 * real messages are being written to a log rather than delivered — which is a
 * deployment mistake worth noticing.
 */
export function createConsoleEmail(
  options: { log?: (line: string) => void } = {},
): EmailProvider {
  const log = options.log ?? ((line: string) => console.log(line))

  return {
    name: 'console',

    async send(message: EmailMessage): Promise<void> {
      /**
       * One line per message, structured.
       *
       * The body is included because that is the whole point — a verification
       * code the operator cannot read is a delivery failure with extra steps.
       */
      log(
        JSON.stringify({
          level: 'info',
          service: 'email',
          message: 'email_console_delivery',
          /**
           * Not delivered, and labelled that way.
           *
           * A log search for "delivered" must not match a message that only
           * reached stdout.
           */
          delivery: 'not_sent',
          to: message.to,
          subject: message.subject,
          body: message.text,
          timestamp: new Date().toISOString(),
        }),
      )
    },
  }
}
