import axios from 'axios'

/**
 * Transactional email utilities.
 *
 * Provider selection:
 * - EMAIL_PROVIDER=resend  -> send via Resend API
 * - EMAIL_PROVIDER=console -> log email payload to console
 * - default: resend when RESEND_API_KEY is configured, else console
 *
 * Example API key format (replace with your real key):
 * RESEND_API_KEY=re_xxxxxxxxx
 */

type SendEmailInput = {
  to: string
  subject: string
  html: string
}

type EmailProvider = {
  send(input: SendEmailInput): Promise<void>
}

type ResendProviderConfig = {
  apiKey: string
  from: string
}

class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    console.log('[EMAIL:CONSOLE] Sending email')
    console.log(`To: ${input.to}`)
    console.log(`Subject: ${input.subject}`)
    console.log('HTML:')
    console.log(input.html)
  }
}

class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string
  private readonly from: string

  constructor(config: ResendProviderConfig) {
    this.apiKey = config.apiKey
    this.from = config.from
  }

  async send(input: SendEmailInput): Promise<void> {
    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: this.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
    } catch (error) {
      const status =
        axios.isAxiosError(error) && error.response
          ? error.response.status
          : 'unknown'
      const body =
        axios.isAxiosError(error) && error.response
          ? JSON.stringify(error.response.data)
          : String(error)
      throw new Error(
        `Resend email send failed with status ${status}${
          body ? `: ${body}` : ''
        }`
      )
    }
  }
}

const createEmailProvider = (): EmailProvider => {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase()
  const resendApiKey = process.env.RESEND_API_KEY?.trim()

  const shouldUseResend = provider === 'resend' || (!provider && !!resendApiKey)

  if (shouldUseResend) {
    if (!resendApiKey) {
      console.warn('[EMAIL] EMAIL_PROVIDER is resend but RESEND_API_KEY is missing')
      return new ConsoleEmailProvider()
    }

    return new ResendEmailProvider({
      apiKey: resendApiKey,
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    })
  }

  return new ConsoleEmailProvider()
}

const emailProvider = createEmailProvider()
const CLIENT_BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderEmailShell = ({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaUrl,
  fallbackLabel,
}: {
  eyebrow: string
  title: string
  body: string
  ctaLabel: string
  ctaUrl: string
  fallbackLabel: string
}) => {
  const safeEyebrow = escapeHtml(eyebrow)
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body)
  const safeCtaLabel = escapeHtml(ctaLabel)
  const safeCtaUrl = escapeHtml(ctaUrl)
  const safeFallbackLabel = escapeHtml(fallbackLabel)

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 32px 16px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
        <div style="padding: 32px 32px 12px; background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #2563eb; font-weight: 700;">
            ${safeEyebrow}
          </p>
          <h1 style="margin: 0; font-size: 26px; line-height: 1.2; color: #111827;">
            ${safeTitle}
          </h1>
        </div>
        <div style="padding: 20px 32px 32px;">
          <p style="margin: 0 0 24px; color: #374151;">
            ${safeBody}
          </p>
          <p style="margin: 0 0 24px;">
            <a href="${safeCtaUrl}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">
              ${safeCtaLabel}
            </a>
          </p>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
            ${safeFallbackLabel}
          </p>
          <p style="margin: 0; color: #111827; font-size: 14px; word-break: break-all;">
            ${safeCtaUrl}
          </p>
        </div>
      </div>
    </div>
  `
}

export const sendEmail = async (input: SendEmailInput): Promise<void> => {
  await emailProvider.send(input)
}

export const sendAuthVerificationEmail = async ({
  email,
  verificationUrl,
}: {
  email: string
  verificationUrl: string
}): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Verify your email address',
    html: renderEmailShell({
      eyebrow: 'Docento Account Security',
      title: 'Verify your email address',
      body:
        'Confirm your email address to activate your account and continue into your dashboard.',
      ctaLabel: 'Verify email',
      ctaUrl: verificationUrl,
      fallbackLabel: 'If the button does not work, open this link in your browser:',
    }),
  })
}

export const sendAuthPasswordResetEmail = async ({
  email,
  resetUrl,
}: {
  email: string
  resetUrl: string
}): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Reset your password',
    html: renderEmailShell({
      eyebrow: 'Docento Account Security',
      title: 'Reset your password',
      body:
        'We received a request to reset your password. Use the link below to choose a new one.',
      ctaLabel: 'Reset password',
      ctaUrl: resetUrl,
      fallbackLabel: 'If the button does not work, open this link in your browser:',
    }),
  })
}

interface ProjectInvitationEmailParams {
  email: string
  projectName: string
  inviterName: string
  role: string
  token: string
  expiresAt: Date
  accountExists: boolean
}

export const sendProjectInvitationEmail = async ({
  email,
  projectName,
  inviterName,
  role,
  token,
  expiresAt,
  accountExists,
}: ProjectInvitationEmailParams): Promise<void> => {
  const safeProjectName = escapeHtml(projectName)
  const safeInviterName = escapeHtml(inviterName)
  const safeRole = escapeHtml(role)

  const tokenParam = encodeURIComponent(token)
  const acceptPath = `/invitations/respond?token=${tokenParam}&action=accept`
  const rejectPath = `/invitations/respond?token=${tokenParam}&action=reject`
  const acceptUrl = `${CLIENT_BASE_URL}${acceptPath}`
  const rejectUrl = `${CLIENT_BASE_URL}${rejectPath}`
  const loginAcceptUrl = `${CLIENT_BASE_URL}/login?redirect=${encodeURIComponent(acceptPath)}`
  const loginRejectUrl = `${CLIENT_BASE_URL}/login?redirect=${encodeURIComponent(rejectPath)}`
  const signupUrl = `${CLIENT_BASE_URL}/signup?email=${encodeURIComponent(email)}&token=${tokenParam}&redirect=${encodeURIComponent(acceptPath)}`

  const ctaCopy = accountExists
    ? `<p>You already have an account. Sign in to respond:</p>
       <p><a href="${loginAcceptUrl}">Sign in and accept</a></p>
       <p><a href="${loginRejectUrl}">Sign in and reject</a></p>`
    : `<p>Create your account first, then you can accept or reject this invitation.</p>
       <p><a href="${signupUrl}">Create account</a></p>`

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p>Hi,</p>
      <p><strong>${safeInviterName}</strong> invited you to join <strong>${safeProjectName}</strong> as <strong>${safeRole}</strong>.</p>
      <p>
        <a href="${acceptUrl}" style="display:inline-block;padding:10px 14px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">Accept invitation</a>
        <a href="${rejectUrl}" style="display:inline-block;padding:10px 14px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;">Reject invitation</a>
      </p>
      ${ctaCopy}
      <p>This invitation expires on ${escapeHtml(expiresAt.toLocaleString())}.</p>
      <p>If the buttons do not work, copy and paste this link into your browser:</p>
      <p>${acceptUrl}</p>
    </div>
  `

  await sendEmail({
    to: email,
    subject: `Invitation to join "${projectName}"`,
    html,
  })
}
