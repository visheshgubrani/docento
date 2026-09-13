import { AsyncLocalStorage } from 'node:async_hooks'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

type LogMeta = Record<string, unknown>

type RequestLogContext = {
  requestId: string
  method?: string
  path?: string
  ip?: string | null
  userAgent?: string | null
}

type StructuredLogEntry = {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  environment: string
  pid: number
  requestId?: string
  request?: {
    method?: string
    path?: string
    ip?: string | null
    userAgent?: string | null
  }
  meta?: JsonValue
}

const MAX_SERIALIZE_DEPTH = 5
const MAX_OBJECT_KEYS = 50
const MAX_ARRAY_ITEMS = 50
const REQUEST_ID_HEADER = 'x-request-id'

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const normalizeLevel = (value: string | undefined, fallback: LogLevel) => {
  if (!value) return fallback
  const normalized = value.toLowerCase()
  if (
    normalized === 'debug' ||
    normalized === 'info' ||
    normalized === 'warn' ||
    normalized === 'error'
  ) {
    return normalized
  }
  return fallback
}

const configuredLevel = normalizeLevel(process.env.LOG_LEVEL, 'info')
const configuredProviderLevel = normalizeLevel(
  process.env.LOG_PROVIDER_LEVEL,
  configuredLevel
)
const serviceName = process.env.LOG_SERVICE_NAME || 'docento-api'
const environment = process.env.NODE_ENV || 'development'

const nativeConsole = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

const requestContextStorage = new AsyncLocalStorage<RequestLogContext>()

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const serializeError = (
  error: Error,
  seen: WeakSet<object>,
  depth: number
): JsonValue => {
  const serialized: Record<string, JsonValue> = {
    name: error.name,
    message: error.message,
  }

  if (error.stack) serialized.stack = error.stack

  const errorWithCause = error as Error & { cause?: unknown }
  if (errorWithCause.cause !== undefined) {
    serialized.cause = sanitizeValue(errorWithCause.cause, seen, depth + 1)
  }

  const additionalKeys = Object.keys(error).slice(0, MAX_OBJECT_KEYS)
  additionalKeys.forEach((key) => {
    if (key in serialized) return
    serialized[key] = sanitizeValue(
      (error as unknown as Record<string, unknown>)[key],
      seen,
      depth + 1
    )
  })

  return serialized
}

const sanitizeValue = (
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): JsonValue => {
  if (value === null || value === undefined) return null
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`
  }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return serializeError(value, seen, depth)
  if (Buffer.isBuffer(value)) return value.toString('base64')

  if (depth >= MAX_SERIALIZE_DEPTH) return '[Truncated]'

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, seen, depth + 1))
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)

    const output: Record<string, JsonValue> = {}
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS)
    entries.forEach(([key, nestedValue]) => {
      output[key] = sanitizeValue(nestedValue, seen, depth + 1)
    })
    seen.delete(value)

    return output
  }

  return String(value)
}

const sanitizeMeta = (meta?: LogMeta): JsonValue | undefined => {
  if (!meta || !Object.keys(meta).length) return undefined
  return sanitizeValue(meta)
}

const getHeaderValue = (value: string | string[] | undefined) => {
  if (!value) return null
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const trimmed = raw.trim()
  return trimmed || null
}

const parseProviderHeaders = () => {
  const rawHeaders = process.env.LOG_PROVIDER_HEADERS
  if (!rawHeaders) return {} as Record<string, string>

  try {
    const parsed = JSON.parse(rawHeaders) as Record<string, unknown>
    return Object.entries(parsed).reduce<Record<string, string>>(
      (headers, [key, value]) => {
        headers[key] = String(value)
        return headers
      },
      {}
    )
  } catch (error) {
    nativeConsole.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'Failed to parse LOG_PROVIDER_HEADERS',
        service: serviceName,
        environment,
        pid: process.pid,
        meta: sanitizeMeta({ error }),
      })
    )
    return {}
  }
}

class HttpLogTransport {
  private readonly url = process.env.LOG_PROVIDER_URL
  private readonly token = process.env.LOG_PROVIDER_TOKEN
  private readonly headers = parseProviderHeaders()
  private readonly format = (process.env.LOG_PROVIDER_FORMAT || 'ndjson')
    .trim()
    .toLowerCase()
  private readonly flushIntervalMs = Number(
    process.env.LOG_PROVIDER_FLUSH_INTERVAL_MS || 2000
  )
  private readonly batchSize = Number(process.env.LOG_PROVIDER_BATCH_SIZE || 25)
  private readonly maxQueueSize = Number(
    process.env.LOG_PROVIDER_MAX_QUEUE_SIZE || 1000
  )
  private readonly timeoutMs = Number(
    process.env.LOG_PROVIDER_TIMEOUT_MS || 5000
  )

  private queue: StructuredLogEntry[] = []
  private timer: NodeJS.Timeout | null = null
  private isFlushing = false

  get enabled() {
    return Boolean(this.url)
  }

  enqueue(entry: StructuredLogEntry) {
    if (!this.enabled) return

    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift()
      nativeConsole.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: 'Dropping oldest log entry because the provider queue is full',
          service: serviceName,
          environment,
          pid: process.pid,
          requestId: entry.requestId,
          meta: {
            maxQueueSize: this.maxQueueSize,
            providerUrl: this.url,
          },
        })
      )
    }

    this.queue.push(entry)

    if (this.queue.length >= this.batchSize) {
      void this.flush()
      return
    }

    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null
        void this.flush()
      }, this.flushIntervalMs)
      this.timer.unref?.()
    }
  }

  async flush() {
    if (!this.enabled || this.isFlushing || !this.queue.length) return

    this.isFlushing = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const batch = this.queue.splice(0, this.batchSize)
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs)

    try {
      const response = await fetch(this.url!, {
        method: 'POST',
        headers: {
          'content-type':
            this.format === 'json'
              ? 'application/json'
              : 'application/x-ndjson',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
          ...this.headers,
        },
        body:
          this.format === 'json'
            ? JSON.stringify(batch.length === 1 ? batch[0] : batch)
            : batch.map((entry) => JSON.stringify(entry)).join('\n'),
        signal: abortController.signal,
      })

      if (!response.ok) {
        nativeConsole.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Log provider responded with a non-success status',
            service: serviceName,
            environment,
            pid: process.pid,
            meta: {
              providerUrl: this.url,
              status: response.status,
              statusText: response.statusText,
            },
          })
        )
      }
    } catch (error) {
      nativeConsole.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Failed to ship logs to provider',
          service: serviceName,
          environment,
          pid: process.pid,
          meta: {
            providerUrl: this.url,
            error: sanitizeValue(error),
          },
        })
      )
    } finally {
      clearTimeout(timeout)
      this.isFlushing = false

      if (this.queue.length) {
        void this.flush()
      }
    }
  }
}

const providerTransport = new HttpLogTransport()

const shouldLog = (level: LogLevel) =>
  levelWeights[level] >= levelWeights[configuredLevel]

const shouldShipToProvider = (level: LogLevel) =>
  providerTransport.enabled &&
  levelWeights[level] >= levelWeights[configuredProviderLevel]

const writeToConsole = (level: LogLevel, entry: StructuredLogEntry) => {
  const output = JSON.stringify(entry)

  if (level === 'error') {
    nativeConsole.error(output)
    return
  }

  if (level === 'warn') {
    nativeConsole.warn(output)
    return
  }

  if (level === 'debug') {
    nativeConsole.debug(output)
    return
  }

  nativeConsole.log(output)
}

const buildLogEntry = (
  level: LogLevel,
  message: string,
  meta?: LogMeta
): StructuredLogEntry => {
  const requestContext = requestContextStorage.getStore()

  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: serviceName,
    environment,
    pid: process.pid,
    ...(requestContext?.requestId && { requestId: requestContext.requestId }),
    ...(requestContext && {
      request: {
        method: requestContext.method,
        path: requestContext.path,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
      },
    }),
    ...(sanitizeMeta(meta) && { meta: sanitizeMeta(meta) }),
  }
}

const log = (level: LogLevel, message: string, meta?: LogMeta) => {
  if (!shouldLog(level) && !shouldShipToProvider(level)) return

  const entry = buildLogEntry(level, message, meta)

  if (shouldLog(level)) {
    writeToConsole(level, entry)
  }

  if (shouldShipToProvider(level)) {
    providerTransport.enqueue(entry)
  }
}

const normalizeConsoleArguments = (args: unknown[]) => {
  if (!args.length) {
    return { message: 'Console output', meta: undefined as LogMeta | undefined }
  }

  const [first, ...rest] = args

  if (typeof first === 'string') {
    if (!rest.length) return { message: first, meta: undefined }
    if (rest.length === 1 && isPlainObject(rest[0])) {
      return { message: first, meta: rest[0] }
    }
    if (rest.length === 1 && rest[0] instanceof Error) {
      return {
        message: first,
        meta: { error: rest[0] },
      }
    }
    return {
      message: first,
      meta: { args: rest },
    }
  }

  if (first instanceof Error && !rest.length) {
    return {
      message: first.message || 'Unhandled error',
      meta: { error: first },
    }
  }

  return {
    message: 'Console output',
    meta: { args },
  }
}

let consoleBridgeInstalled = false

export const installConsoleBridge = () => {
  if (consoleBridgeInstalled) return
  consoleBridgeInstalled = true

  console.debug = (...args: unknown[]) => {
    const { message, meta } = normalizeConsoleArguments(args)
    log('debug', message, meta)
  }

  console.info = (...args: unknown[]) => {
    const { message, meta } = normalizeConsoleArguments(args)
    log('info', message, meta)
  }

  console.log = (...args: unknown[]) => {
    const { message, meta } = normalizeConsoleArguments(args)
    log('info', message, meta)
  }

  console.warn = (...args: unknown[]) => {
    const { message, meta } = normalizeConsoleArguments(args)
    log('warn', message, meta)
  }

  console.error = (...args: unknown[]) => {
    const { message, meta } = normalizeConsoleArguments(args)
    log('error', message, meta)
  }
}

export const runWithLogContext = <T>(
  context: RequestLogContext,
  callback: () => T
) => requestContextStorage.run(context, callback)

export const getLogContext = () => requestContextStorage.getStore()

export const getRequestIdFromHeaders = (
  headers: Record<string, string | string[] | undefined>
) =>
  getHeaderValue(headers[REQUEST_ID_HEADER]) ||
  getHeaderValue(headers['x-correlation-id'])

export const logger = {
  info: (message: string, meta?: LogMeta) => log('info', message, meta),
  warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
  error: (message: string, meta?: LogMeta) => log('error', message, meta),
  debug: (message: string, meta?: LogMeta) => log('debug', message, meta),
  flush: () => providerTransport.flush(),
}

installConsoleBridge()
