/**
 * Email.
 *
 * Three providers: `console` (the default, which prints to stdout), `resend`,
 * and a small SMTP client. The console provider is what makes a self-hosted
 * install complete without an account anywhere — sign-up verification and
 * password reset work, and an operator reads the code out of the container log.
 *
 * ## Templates are data, not inline strings
 *
 * The application this replaces built HTML with string concatenation at each
 * call site, which meant the shell drifted between messages and every new email
 * was a new chance to forget an escaping call. A template is a function from
 * data to `{ subject, html, text }`, registered once.
 *
 * ## Every message has a text part
 *
 * Not a nicety: a message with only HTML scores worse with spam filters, and a
 * password reset that lands in a spam folder is a support ticket. The text part
 * is generated from the same data rather than written twice.
 */

export type EmailMessage = {
  to: string
  subject: string
  html: string
  /** Always present, because a message without one is more likely to be filtered. */
  text: string
  /** Overrides the configured sender. Used by nothing yet; here for invitations. */
  replyTo?: string
}

export { EmailError } from './types.js'
export type { EmailProvider } from './types.js'
export { createConsoleEmail } from './console.js'
export { createResendEmail } from './resend.js'
export type { ResendOptions } from './resend.js'
export { createSmtpEmail } from './smtp.js'
export type { SmtpOptions } from './smtp.js'
export { createEmailProvider, formatSender } from './provider.js'
export type { EmailConfig } from './provider.js'
export { RENDERED_TEMPLATES, escapeHtml, renderTemplate } from './templates.js'
export type {
  RenderedEmail,
  TemplateName,
  TemplatePayload,
} from './templates.js'
