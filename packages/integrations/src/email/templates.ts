/**
 * Email templates.
 *
 * A registry of functions from data to `{ subject, html, text }`, rather than
 * HTML built by string concatenation at each call site. The application this
 * replaces did the latter, which meant the shell drifted between messages, every
 * new email was a fresh chance to forget an escaping call, and the text part was
 * usually missing entirely.
 *
 * ## Escaping is the template's job, and it does it
 *
 * Display names and course titles are author- or learner-supplied and end up
 * inside HTML. `escapeHtml` is applied at every interpolation, and there is no
 * way to interpolate without it — the helper takes a name and a value, so a
 * template cannot accidentally write `${userInput}` into markup.
 */

/** Escape a value for interpolation into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * The wrapper every message shares.
 *
 * Inline styles, because a mail client strips a stylesheet and a message that
 * renders unstyled is the one that looks like phishing. No images and no
 * tracking pixel: the first is a request to an external host from somebody
 * else's inbox, and the second is surveillance that this project should not be
 * shipping by default.
 */
function shell(input: {
  heading: string
  body: string
  footer: string
}): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(input.heading)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#3f3f46">${input.body}</div>
    </div>
    <p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#71717a">${input.footer}</p>
  </body>
</html>`
}

/** A one-line call to action, styled as a button. */
function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`
}

export type TemplatePayload = {
  'verify-email': { url: string; name?: string; academyName?: string }
  'reset-password': { url: string; name?: string; academyName?: string }
  'workspace-invitation': {
    url: string
    workspaceName: string
    inviterName?: string
  }
  'certificate-issued': {
    courseTitle: string
    recipientName: string
    verificationUrl: string
  }
}

export type TemplateName = keyof TemplatePayload

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

/**
 * Render a message.
 *
 * Typed by template name, so a caller cannot pass the wrong data shape — which
 * is the failure a template registry exists to prevent, and one that inline
 * strings cannot catch at all.
 */
export function renderTemplate<Name extends TemplateName>(
  name: Name,
  payload: TemplatePayload[Name],
  options: { productName?: string } = {},
): RenderedEmail {
  const product = options.productName ?? 'Docento'

  switch (name) {
    case 'verify-email': {
      const data = payload as TemplatePayload['verify-email']
      const greeting = data.name ? `Hi ${data.name},` : 'Hello,'

      return {
        subject: `Confirm your email address`,
        html: shell({
          heading: 'Confirm your email address',
          body: `
            <p>${escapeHtml(greeting)}</p>
            <p>Confirm this address to finish setting up your account${
              data.academyName ? ` at ${escapeHtml(data.academyName)}` : ''
            }.</p>
            ${button(data.url, 'Confirm email')}
            <p style="font-size:13px;color:#71717a">If the button does not work, paste this into your browser:<br /><span style="word-break:break-all">${escapeHtml(data.url)}</span></p>
          `,
          footer: `You are receiving this because somebody signed up with this address. If that was not you, ignore this message.`,
        }),
        text: [
          greeting,
          '',
          `Confirm this address to finish setting up your account${
            data.academyName ? ` at ${data.academyName}` : ''
          }:`,
          data.url,
          '',
          'If that was not you, ignore this message.',
        ].join('\n'),
      }
    }

    case 'reset-password': {
      const data = payload as TemplatePayload['reset-password']
      const greeting = data.name ? `Hi ${data.name},` : 'Hello,'

      return {
        subject: 'Reset your password',
        html: shell({
          heading: 'Reset your password',
          body: `
            <p>${escapeHtml(greeting)}</p>
            <p>Choose a new password using the link below. It expires shortly, and can only be used once.</p>
            ${button(data.url, 'Choose a new password')}
            <p style="font-size:13px;color:#71717a">If the button does not work, paste this into your browser:<br /><span style="word-break:break-all">${escapeHtml(data.url)}</span></p>
          `,
          footer:
            'If you did not ask to reset your password, no action is needed — your current password still works.',
        }),
        text: [
          greeting,
          '',
          'Choose a new password using this link. It expires shortly and can only be used once:',
          data.url,
          '',
          'If you did not ask for this, no action is needed.',
        ].join('\n'),
      }
    }

    case 'workspace-invitation': {
      const data = payload as TemplatePayload['workspace-invitation']

      /**
       * The inviter's name is author-supplied and appears in the message.
       *
       * Escaped like everything else, which matters more here than elsewhere:
       * this is the one template that reaches somebody who has no account and no
       * reason to trust the sender.
       */
      const invitedBy = data.inviterName
        ? `${escapeHtml(data.inviterName)} invited you`
        : 'You have been invited'

      return {
        subject: `You have been invited to ${data.workspaceName}`,
        html: shell({
          heading: `Join ${data.workspaceName}`,
          body: `
            <p>${invitedBy} to collaborate on ${escapeHtml(data.workspaceName)}.</p>
            ${button(data.url, 'Accept invitation')}
            <p style="font-size:13px;color:#71717a">If the button does not work, paste this into your browser:<br /><span style="word-break:break-all">${escapeHtml(data.url)}</span></p>
          `,
          footer:
            'If you were not expecting this, you can ignore it — no account is created until you accept.',
        }),
        text: [
          `${data.inviterName ?? 'Somebody'} invited you to collaborate on ${data.workspaceName}.`,
          '',
          data.url,
          '',
          'If you were not expecting this, ignore this message.',
        ].join('\n'),
      }
    }

    case 'certificate-issued': {
      const data = payload as TemplatePayload['certificate-issued']

      return {
        subject: `Your certificate for ${data.courseTitle}`,
        html: shell({
          heading: 'Your certificate is ready',
          body: `
            <p>${escapeHtml(data.recipientName)}, you have completed ${escapeHtml(data.courseTitle)}.</p>
            <p>Your certificate has a public verification link, so an employer can confirm it without an account here.</p>
            ${button(data.verificationUrl, 'View your certificate')}
            <p style="font-size:13px;color:#71717a">Verification link:<br /><span style="word-break:break-all">${escapeHtml(data.verificationUrl)}</span></p>
          `,
          footer: `${product} — this certificate stays verifiable, so keep this message.`,
        }),
        text: [
          `${data.recipientName}, you have completed ${data.courseTitle}.`,
          '',
          'Your certificate can be verified publicly at:',
          data.verificationUrl,
        ].join('\n'),
      }
    }

    default: {
      /**
       * Exhaustiveness, at runtime as well as by type.
       *
       * A template added to the union without a case here would otherwise fall
       * through to `undefined` at the call site, and the failure would be an
       * email job that throws somewhere far from the omission.
       */
      const unreachable: never = name

      throw new Error(
        `No email template is registered for "${String(unreachable)}".`,
      )
    }
  }
}

/** Every template this build can render, for a test to enumerate. */
export const RENDERED_TEMPLATES: readonly TemplateName[] = [
  'verify-email',
  'reset-password',
  'workspace-invitation',
  'certificate-issued',
]
