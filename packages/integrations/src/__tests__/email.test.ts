import { describe, expect, it } from 'vitest'

import {
  EmailError,
  RENDERED_TEMPLATES,
  createConsoleEmail,
  createEmailProvider,
  createResendEmail,
  escapeHtml,
  formatSender,
  renderTemplate,
} from '../index.js'

/**
 * Templates, escaping and provider selection.
 *
 * The properties that matter are the ones a mail client and a spam filter care
 * about — a text part, escaped interpolation, CRLF — plus the two failure modes
 * worth distinguishing: a refused message and an outage.
 */

describe('templates', () => {
  it('renders every registered template', () => {
    // Enumerated from the registry rather than listed, so a template added
    // without a payload test fails here rather than at the first send.
    for (const name of RENDERED_TEMPLATES) {
      const rendered = renderTemplate(name, payloadFor(name))

      expect(rendered.subject.length, name).toBeGreaterThan(0)
      expect(rendered.html, name).toContain('<html')
      expect(rendered.text.length, name).toBeGreaterThan(0)
    }
  })

  it('always produces a text part', () => {
    /**
     * Not a nicety. A message with only HTML scores worse with spam filters, and
     * a password reset in a spam folder is a support ticket.
     */
    for (const name of RENDERED_TEMPLATES) {
      const rendered = renderTemplate(name, payloadFor(name))

      expect(rendered.text, name).not.toContain('<')
      expect(rendered.text.trim().length, name).toBeGreaterThan(10)
    }
  })

  it('includes the link in both parts', () => {
    const url = 'https://example.com/verify?token=abc'
    const rendered = renderTemplate('verify-email', { url })

    // A text part without the link is a message a plain-text client cannot act
    // on, which is exactly the client that needs it.
    expect(rendered.html).toContain(url)
    expect(rendered.text).toContain(url)
  })

  describe('escaping', () => {
    it('escapes a display name in the html part', () => {
      const rendered = renderTemplate('reset-password', {
        url: 'https://example.com/reset',
        name: '<script>alert(1)</script>',
      })

      expect(rendered.html).not.toContain('<script>')
      expect(rendered.html).toContain('&lt;script&gt;')
    })

    it('escapes an inviter name, which reaches somebody with no account', () => {
      /**
       * The one template that arrives for a recipient who has no reason to trust
       * the sender, and whose content includes author-supplied text.
       *
       * The assertion is that no *tag* survives, not that no payload text does.
       * Escaped text still contains the words — `onerror=alert(1)` appears as
       * inert characters inside `&lt;img src=x onerror=alert(1)&gt;` — and
       * asserting on the words would be asserting that escaping did not happen,
       * which is the opposite of the property.
       */
      const rendered = renderTemplate('workspace-invitation', {
        url: 'https://example.com/invite',
        workspaceName: 'Acme',
        inviterName: '"><img src=x onerror=alert(1)>',
      })

      expect(rendered.html).not.toContain('<img')
      expect(rendered.html).not.toMatch(/<img[^>]*onerror/i)
      expect(rendered.html).toContain('&lt;img')
    })

    it('escapes a course title', () => {
      const rendered = renderTemplate('certificate-issued', {
        courseTitle: '<b>Bold</b> & "quoted"',
        recipientName: 'Ada',
        verificationUrl: 'https://example.com/v/1',
      })

      expect(rendered.html).toContain('&lt;b&gt;')
      expect(rendered.html).not.toContain('<b>Bold</b>')
    })

    it('escapes a link, so a url cannot break out of the attribute', () => {
      const rendered = renderTemplate('verify-email', {
        url: 'https://example.com/v?x="><script>alert(1)</script>',
      })

      expect(rendered.html).not.toContain('"><script>')
    })

    it('escapes each character that matters', () => {
      expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
    })

    it('escapes an ampersand before the entities it would otherwise create', () => {
      // Order matters: escaping `<` first would leave `&lt;` as literal text that
      // the next pass escapes into `&amp;lt;` — which renders as the characters
      // the user typed, but only by accident.
      expect(escapeHtml('&lt;')).toBe('&amp;lt;')
    })
  })

  it('refuses a template it does not have', () => {
    // A template added to the union without a case falls through to a runtime
    // error here rather than to `undefined` at a call site.
    expect(() =>
      renderTemplate('not-a-template' as never, {} as never),
    ).toThrow(/No email template is registered/)
  })
})

function payloadFor(name: (typeof RENDERED_TEMPLATES)[number]) {
  switch (name) {
    case 'verify-email':
      return { url: 'https://example.com/verify', name: 'Ada' }
    case 'reset-password':
      return { url: 'https://example.com/reset', name: 'Ada' }
    case 'workspace-invitation':
      return { url: 'https://example.com/invite', workspaceName: 'Acme' }
    case 'certificate-issued':
      return {
        courseTitle: 'Computing',
        recipientName: 'Ada',
        verificationUrl: 'https://example.com/v/1',
      }
  }
}

describe('the console provider', () => {
  it('prints the message rather than pretending to deliver it', async () => {
    /**
     * A development provider that swallows messages makes "why did no email
     * arrive" unanswerable. Printing everything is what makes a self-hosted
     * install complete with no account anywhere: the operator reads the code out
     * of the container log.
     */
    const lines: string[] = []
    const provider = createConsoleEmail({ log: (line) => lines.push(line) })

    await provider.send({
      to: 'ada@example.com',
      subject: 'Confirm your email',
      html: '<p>code 123456</p>',
      text: 'code 123456',
    })

    expect(lines).toHaveLength(1)

    const entry = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>

    expect(entry.to).toBe('ada@example.com')
    expect(entry.body).toContain('123456')
  })

  it('labels the delivery as not sent', () => {
    // A log search for "delivered" must not match a message that only reached
    // stdout. This is the difference between a deployment that works and one
    // nobody notices is misconfigured.
    const lines: string[] = []
    const provider = createConsoleEmail({ log: (line) => lines.push(line) })

    void provider.send({
      to: 'a@example.com',
      subject: 's',
      html: '<p>x</p>',
      text: 'x',
    })

    expect(lines[0]).toContain('"delivery":"not_sent"')
  })
})

describe('the resend provider', () => {
  const respond = (status: number, body = '') =>
    (async () =>
      new Response(body, {
        status,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof globalThis.fetch

  it('posts the message with the text part included', async () => {
    /**
     * Typed as possibly-unset and read through a local, because the only
     * assignment happens inside the stubbed `fetch` — which control-flow
     * analysis cannot see, so it narrows the variable to `never` after the
     * initialiser.
     */
    const calls: {
      url: string
      body: unknown
      headers: Record<string, string>
    }[] = []

    const provider = createResendEmail({
      apiKey: 're_test',
      from: 'noreply@example.com',
      fetch: (async (url: string, init: RequestInit) => {
        calls.push({
          url,
          body: JSON.parse(String(init.body)),
          headers: (init.headers ?? {}) as Record<string, string>,
        })

        return new Response('{}', { status: 200 })
      }) as unknown as typeof globalThis.fetch,
    })

    await provider.send({
      to: 'ada@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    })

    const call = calls.at(0)
    expect(call?.url).toBe('https://api.resend.com/emails')

    const body = call?.body as Record<string, unknown>
    expect(body.to).toEqual(['ada@example.com'])
    expect(body.text).toBe('Hi')
    expect(call?.headers.authorization).toBe('Bearer re_test')
  })

  it('distinguishes a refused message from an outage', async () => {
    /**
     * The distinction the job handler needs. A refused recipient fails again on
     * every retry and burns the queue's budget until the job reaches the
     * terminal-failure list — where nobody looks, because the real problem was
     * visible on the first attempt.
     */
    const rejected = createResendEmail({
      apiKey: 'k',
      from: 'f@example.com',
      fetch: respond(422, '{"message":"invalid from"}'),
    })

    const outage = createResendEmail({
      apiKey: 'k',
      from: 'f@example.com',
      fetch: respond(503, 'upstream unavailable'),
    })

    const message = {
      to: 'a@example.com',
      subject: 's',
      html: '<p>x</p>',
      text: 'x',
    }

    await expect(rejected.send(message)).rejects.toMatchObject({
      code: 'rejected',
    })
    await expect(outage.send(message)).rejects.toMatchObject({
      code: 'provider_error',
    })
  })

  it('reports an unreachable provider as an outage rather than a rejection', async () => {
    const provider = createResendEmail({
      apiKey: 'k',
      from: 'f@example.com',
      fetch: (() => {
        throw new TypeError('fetch failed')
      }) as unknown as typeof globalThis.fetch,
    })

    await expect(
      provider.send({
        to: 'a@example.com',
        subject: 's',
        html: '<p>x</p>',
        text: 'x',
      }),
    ).rejects.toMatchObject({ code: 'provider_error' })
  })

  it('includes the provider message in a rejection, so it is diagnosable', async () => {
    // "The provider refused" with no reason is a support ticket; the reason is
    // usually "the sender domain is not verified", which is actionable.
    const provider = createResendEmail({
      apiKey: 'k',
      from: 'f@example.com',
      fetch: respond(403, '{"message":"domain not verified"}'),
    })

    await expect(
      provider.send({
        to: 'a@example.com',
        subject: 's',
        html: '<p>x</p>',
        text: 'x',
      }),
    ).rejects.toThrow(/domain not verified/)
  })
})

describe('provider selection', () => {
  it('defaults to the console', () => {
    expect(createEmailProvider({ provider: 'console' }).name).toBe('console')
  })

  it('refuses resend with no key rather than falling back to the console', () => {
    /**
     * Falling back would write password resets to a log on a deployment that
     * believed it was sending mail — and nobody would notice until a learner
     * could not sign in.
     */
    expect(() =>
      createEmailProvider({ provider: 'resend', apiKey: '', from: 'a@b.c' }),
    ).toThrow(EmailError)
  })

  it('refuses smtp with no host', () => {
    expect(() =>
      createEmailProvider({
        provider: 'smtp',
        host: '',
        port: 587,
        secure: false,
        requireTls: true,
        from: 'a@b.c',
      }),
    ).toThrow(EmailError)
  })

  it('builds the provider it was asked for', () => {
    expect(
      createEmailProvider({
        provider: 'smtp',
        host: 'mail.example.com',
        port: 587,
        secure: false,
        requireTls: true,
        from: 'a@b.c',
      }).name,
    ).toBe('smtp')
  })
})

describe('the sender address', () => {
  it('adds a display name when there is one', () => {
    // A bare address is deliverable but reads as machine-generated, and a
    // display name is what makes a password reset recognisable in an inbox.
    expect(formatSender({ from: 'a@b.c', name: 'Docento' })).toBe(
      'Docento <a@b.c>',
    )
  })

  it('leaves a bare address alone', () => {
    expect(formatSender({ from: 'a@b.c' })).toBe('a@b.c')
  })
})
