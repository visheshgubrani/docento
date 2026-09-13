import { createConnection, type Socket } from 'node:net'
import { connect as connectTls, type TLSSocket } from 'node:tls'

import { EmailError, type EmailMessage, type EmailProvider } from './types.js'

/**
 * A minimal SMTP client.
 *
 * ## Why this exists rather than a dependency
 *
 * A self-hoster with a mail server already running — which is most of the people
 * who would self-host a course platform — has an SMTP host and no interest in a
 * third-party API. The alternative, `nodemailer`, is a large dependency for the
 * small subset of SMTP this needs: EHLO, optional STARTTLS, AUTH PLAIN or LOGIN,
 * MAIL FROM, RCPT TO, DATA.
 *
 * It is about two hundred lines, it has no transitive dependencies, and the
 * supply chain it removes is one an operator would otherwise have to trust. No
 * attachments, no DKIM signing, no connection pooling — a provider that needs
 * those should use Resend or a real mail infrastructure.
 *
 * ## What it does carefully
 *
 * - **Replies are read properly.** A multi-line reply is `250-first\r\n250
 *   last`, and a parser that reads one line at a time desynchronises on the
 *   first one. That bug shows up as a timeout on the *second* message.
 * - **Dot-stuffing.** A body line of `.` ends the message; a line *starting*
 *   with `.` has to be escaped or the message is silently truncated.
 * - **CRLF only.** A bare `\n` inside DATA is tolerated by some servers and
 *   mangled by others.
 * - **Timeouts on everything.** A hung server must not hold a worker's job
 *   slot.
 */

export type SmtpOptions = {
  host: string
  port: number
  /** `true` for implicit TLS on connect (usually port 465). */
  secure?: boolean
  /** `true` to upgrade with STARTTLS when the server offers it. */
  requireTls?: boolean
  username?: string
  password?: string
  from: string
  /** Milliseconds to wait for any single step. */
  timeoutMs?: number
}

/** The subset of a socket the client uses, so TLS and plain are interchangeable. */
type MailSocket = Socket | TLSSocket

export function createSmtpEmail(options: SmtpOptions): EmailProvider {
  const timeoutMs = options.timeoutMs ?? 15_000

  return {
    name: 'smtp',

    async send(message: EmailMessage): Promise<void> {
      const session = await openSession(options, timeoutMs)

      try {
        await session.expect(220)
        await session.command(`EHLO ${clientName()}`, 250)

        if (!options.secure && options.requireTls) {
          const capabilities = session.capabilities()

          if (!capabilities.has('STARTTLS')) {
            /**
             * Refused rather than downgraded.
             *
             * Sending a password reset over a plaintext connection because the
             * server did not offer TLS is the kind of fallback that is invisible
             * in a config file and obvious in a breach report.
             */
            throw new EmailError(
              'not_configured',
              'The SMTP server does not offer STARTTLS, and the configuration requires it.',
            )
          }

          await session.command('STARTTLS', 220)
          await session.upgradeToTls(options.host)
          await session.command(`EHLO ${clientName()}`, 250)
        }

        if (options.username && options.password) {
          await authenticate(session, options.username, options.password)
        }

        const from = options.from
        const envelopeFrom = extractAddress(from)

        await session.command(`MAIL FROM:<${envelopeFrom}>`, 250)
        await session.command(
          `RCPT TO:<${extractAddress(message.to)}>`,
          [250, 251],
        )
        await session.command('DATA', 354)

        await session.writeData(buildMessage(from, message))

        // The server's final acceptance. A failure here means the message was
        // not queued, which is the one thing worth raising about.
        await session.expect(250)

        await session.command('QUIT', 221).catch(() => undefined)
      } finally {
        // Always, including on the error path: a leaked socket holds a worker
        // slot until the process restarts.
        session.close()
      }
    },
  }
}

function clientName(): string {
  // The literal `localhost` is what RFC 5321 suggests when a client has no
  // meaningful name, and servers reject a bare IP less often than a made-up one.
  return 'localhost'
}

/**
 * Something that looks like `Name <a@b>` or `a@b`.
 *
 * SMTP's envelope takes a bare address, so a display name in `MAIL FROM` is a
 * syntax error on servers that are strict about it.
 */
function extractAddress(value: string): string {
  const angled = /<([^>]+)>/.exec(value)

  return (angled?.[1] ?? value).trim()
}

/** RFC 5322 requires CRLF line endings, including inside DATA. */
function buildMessage(from: string, message: EmailMessage): string {
  const headers = [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    ...(message.replyTo ? [`Reply-To: ${message.replyTo}`] : []),
    'MIME-Version: 1.0',
    // A multipart alternative, so a client that cannot render HTML still reads
    // the text part — and so filters see a text part at all.
    'Content-Type: multipart/alternative; boundary="docento-boundary"',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${messageId()}>`,
  ]

  const body = [
    '--docento-boundary',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(message.text),
    '--docento-boundary',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(message.html),
    '--docento-boundary--',
  ].join('\r\n')

  return `${headers.join('\r\n')}\r\n\r\n${body}`
}

/**
 * Escape a leading dot.
 *
 * A line consisting of a single `.` terminates the message, and a line
 * *beginning* with one is a terminator with extra characters — so the message
 * ends several lines early and the rest is interpreted as SMTP commands. Silent
 * truncation, and the failure looks like a malformed-command error at the end of
 * a successful send.
 */
function dotStuff(body: string): string {
  return body
    .split(/\r?\n/)
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n')
}

/**
 * Encode a header that is not plain ASCII.
 *
 * A subject with an accented name or an em dash has to be encoded, or a strict
 * server rejects the message and a lenient one shows mojibake.
 */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(value)) return value

  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function messageId(): string {
  const random = Buffer.from(
    crypto.getRandomValues(new Uint8Array(12)),
  ).toString('hex')

  return `${Date.now()}.${random}@docento`
}

/**
 * AUTH PLAIN, falling back to AUTH LOGIN.
 *
 * PLAIN is one round trip and what most servers expose. LOGIN is what some older
 * ones offer instead, and it is three lines to support.
 */
async function authenticate(
  session: Session,
  username: string,
  password: string,
): Promise<void> {
  const capabilities = session.capabilities()
  const authLine = capabilities.get('AUTH') ?? ''

  if (authLine.length > 0 && !authLine.toUpperCase().includes('PLAIN')) {
    if (authLine.toUpperCase().includes('LOGIN')) {
      await session.command('AUTH LOGIN', 334)
      await session.command(Buffer.from(username).toString('base64'), 334)
      await session.command(Buffer.from(password).toString('base64'), 235)

      return
    }
  }

  const payload = Buffer.from(`\0${username}\0${password}`).toString('base64')
  await session.command(`AUTH PLAIN ${payload}`, 235)
}

// ---------------------------------------------------------------------------
// The session
// ---------------------------------------------------------------------------

type Session = {
  expect: (...accepted: number[]) => Promise<string>
  command: (line: string, expected: number | number[]) => Promise<string>
  writeData: (body: string) => Promise<void>
  upgradeToTls: (host: string) => Promise<void>
  capabilities: () => Map<string, string>
  close: () => void
}

async function openSession(
  options: SmtpOptions,
  timeoutMs: number,
): Promise<Session> {
  let socket: MailSocket = options.secure
    ? connectTls({
        host: options.host,
        port: options.port,
        servername: options.host,
      })
    : createConnection({ host: options.host, port: options.port })

  socket.setTimeout(timeoutMs)

  /**
   * A buffer rather than a line reader.
   *
   * Replies arrive in chunks that do not respect line boundaries, and a
   * line-by-line reader misses the tail of one that spans two packets. The
   * buffer is the whole reason this works on a real server rather than only
   * against `nc`.
   */
  let buffer = ''
  const capabilities = new Map<string, string>()
  let pending: {
    expected: number[]
    resolve: (reply: string) => void
    reject: (error: Error) => void
  } | null = null
  let fatal: Error | null = null

  /** Record `EHLO` keywords so `STARTTLS` and `AUTH` can be chosen from them. */
  function recordCapabilities(lines: string[]): void {
    for (const line of lines) {
      const text = line.slice(4).trim()

      if (text.length === 0) continue

      const [keyword = '', ...rest] = text.split(/\s+/)

      capabilities.set(keyword.toUpperCase(), rest.join(' '))
    }
  }

  /**
   * A complete reply, or `null` while more is needed.
   *
   * `250-first\r\n250 last` is *one* reply. Treating each line as a reply
   * desynchronises the session, and the symptom is a timeout on the next command
   * rather than an error on this one — which is why the continuation character
   * is checked rather than the line count.
   */
  function takeReply(): string | null {
    const lines = buffer.split('\r\n')

    // The final element is an incomplete line, unless the buffer ended exactly
    // on a CRLF — in which case it is empty and skipping it is still correct.
    const lines_ = lines.slice(0, -1)

    if (lines_.length === 0) return null

    for (let index = 0; index < lines_.length; index += 1) {
      const line = lines_[index] ?? ''

      // A continuation line, so the reply is not finished.
      if (line.length >= 4 && line[3] === '-') continue

      const replyLines = lines_.slice(0, index + 1)
      buffer = lines.slice(index + 1).join('\r\n')

      recordCapabilities(replyLines)

      return replyLines.join('\n')
    }

    return null
  }

  /** Settle a waiting `expect` if a full reply is now buffered. */
  function settle(): void {
    if (!pending) return

    const reply = takeReply()
    if (reply === null) return

    const waiting = pending
    pending = null

    const code = Number.parseInt(reply.slice(0, 3), 10)

    if (waiting.expected.includes(code)) {
      waiting.resolve(reply)
      return
    }

    waiting.reject(
      new EmailError(
        'provider_error',
        `The SMTP server replied ${code} where ${waiting.expected.join(' or ')} was expected: ${
          reply.split('\n')[0]?.slice(0, 200) ?? ''
        }`,
      ),
    )
  }

  function fail(error: Error): void {
    fatal ??= error

    if (pending) {
      const waiting = pending
      pending = null
      waiting.reject(fatal)
    }
  }

  function attach(target: MailSocket): void {
    target.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      settle()
    })

    target.on('error', (error: Error) => {
      fail(
        new EmailError(
          'provider_error',
          `SMTP connection failed: ${error.message}`,
          {
            cause: error,
          },
        ),
      )
    })

    target.on('timeout', () => {
      fail(
        new EmailError(
          'provider_error',
          'The SMTP server did not respond in time.',
        ),
      )
    })

    target.on('close', () => {
      fail(
        new EmailError(
          'provider_error',
          'The SMTP server closed the connection.',
        ),
      )
    })
  }

  attach(socket)

  /** Wait for one of the accepted codes. */
  async function expect(...accepted: number[]): Promise<string> {
    if (fatal) throw fatal

    return new Promise<string>((resolve, reject) => {
      pending = { expected: accepted, resolve, reject }

      // The reply may already be buffered, in which case no `data` event is
      // coming and waiting for one would hang until the timeout.
      settle()
    })
  }

  return {
    expect: (...accepted: number[]) => expect(...accepted),

    async command(line: string, accepted: number | number[]): Promise<string> {
      socket.write(`${line}\r\n`)

      return expect(...(Array.isArray(accepted) ? accepted : [accepted]))
    },

    async writeData(body: string): Promise<void> {
      /**
       * The terminator is `.` on its own line. The body ends without a trailing
       * CRLF, so one is added before it.
       */
      socket.write(`${body}\r\n.\r\n`)
    },

    async upgradeToTls(host: string): Promise<void> {
      const upgraded = await new Promise<TLSSocket>((resolve, reject) => {
        const tls = connectTls({ socket, servername: host }, () => resolve(tls))

        tls.once('error', reject)
      })

      socket = upgraded
      socket.setTimeout(timeoutMs)
      attach(upgraded)
    },

    capabilities: () => capabilities,

    close: () => {
      socket.destroy()
    },
  }
}
