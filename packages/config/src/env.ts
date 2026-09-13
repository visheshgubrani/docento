import { z } from 'zod'

/**
 * Environment loading.
 *
 * Two rules shape this module:
 *
 * 1. Core configuration fails loudly at startup, listing *every* problem at
 *    once. A missing `DATABASE_URL` should not be discovered one variable per
 *    restart.
 * 2. An unconfigured integration is normal, not broken. A self-hoster who never
 *    configures S3, a payment provider, or an AI provider must get a working
 *    install, and must never see a crash from a module that happens to import a
 *    provider it does not use.
 *
 * Rule 2 is why nothing here throws at import time. `validateEnv()` is called
 * explicitly from each application's entrypoint.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ConfigError extends Error {
  readonly problems: readonly string[]

  constructor(problems: readonly string[], hint?: string) {
    const unique = [...new Set(problems)]
    const header =
      unique.length === 1
        ? 'The environment is not valid.'
        : `The environment is not valid (${unique.length} problems).`

    super(
      [
        header,
        '',
        ...unique.map((problem) => `  - ${problem}`),
        hint ? `\n${hint}` : '',
      ]
        .filter((line) => line !== '')
        .join('\n'),
    )

    this.name = 'ConfigError'
    this.problems = unique
  }
}

// ---------------------------------------------------------------------------
// Reusable field builders
// ---------------------------------------------------------------------------

const httpUrl = (description = 'an absolute http(s) URL') =>
  z.string().refine(
    (value) => {
      try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: `must be ${description}` },
  )

const port = (fallback: number) =>
  z.coerce.number().int().min(1).max(65535).default(fallback)

/**
 * Accepts the truthy/falsy spellings people actually write in `.env` files, and
 * rejects anything else rather than silently treating a typo as `false`.
 */
const flag = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value.trim() === '') return fallback

      const normalized = value.trim().toLowerCase()
      if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
      if (['0', 'false', 'no', 'off'].includes(normalized)) return false

      ctx.addIssue({
        code: 'custom',
        message: `expected a boolean (true/false/1/0/yes/no), got "${value}"`,
      })
      return z.NEVER
    })

/** Comma-separated list, e.g. `https://a.example,https://b.example`. */
const csvList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )

const secret = (minLength: number, name: string) =>
  z
    .string()
    .min(
      minLength,
      `${name} must be at least ${minLength} characters. Generate one with: openssl rand -base64 48`,
    )

/** AES-256 key material: exactly 32 bytes, hex encoded. */
const encryptionKey = z
  .string()
  .regex(
    /^[0-9a-fA-F]{64}$/,
    'ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate one with: openssl rand -hex 32',
  )

const optionalUrl = z.string().optional()

// ---------------------------------------------------------------------------
// Core configuration
// ---------------------------------------------------------------------------

export const coreEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required. It must point at a Postgres database.'),

  /** Public origin of the Studio application. */
  APP_URL: httpUrl('the public origin of the Studio app'),

  /**
   * Public origin of the API, used as the authentication base URL. Must be set
   * explicitly in any deployment behind a proxy or with a separate API host:
   * without it Better Auth derives the origin from each request, which breaks
   * callbacks and redirects.
   */
  API_URL: httpUrl('the public origin of the API').default(
    'http://localhost:4000',
  ),

  API_PORT: port(4000),

  /**
   * The two authentication realms use separate secrets so that a leaked or
   * rotated secret in one realm cannot forge a session in the other.
   * See docs/adr/0003-two-authentication-realms.md.
   */
  STAFF_AUTH_SECRET: secret(32, 'STAFF_AUTH_SECRET'),
  LEARNER_AUTH_SECRET: secret(32, 'LEARNER_AUTH_SECRET'),

  /** Encrypts provider credentials at rest. Losing it loses those credentials. */
  ENCRYPTION_KEY: encryptionKey,

  /** Extra origins allowed to make credentialed browser requests. */
  TRUSTED_ORIGINS: csvList,

  EMAIL_PROVIDER: z.enum(['console', 'resend', 'smtp']).default('console'),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  /** Opt-in. Telemetry is off unless this is explicitly enabled. */
  TELEMETRY_ENABLED: flag(false),

  SENTRY_DSN: z.string().optional(),
})

export type CoreEnv = z.infer<typeof coreEnvSchema>

// ---------------------------------------------------------------------------
// Integration configuration
// ---------------------------------------------------------------------------

export const storageEnvSchema = z.object({
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./.data/uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: optionalUrl,
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: optionalUrl,
})

/**
 * Note there is no requirement that an OpenAI-compatible endpoint has an API
 * key: a local inference server (Ollama, vLLM, llama.cpp) is reached by base URL
 * with no credentials, and that is a first-class configuration here.
 */
export const aiEnvSchema = z.object({
  AI_DEFAULT_PROVIDER: z.enum(['openai-compatible', 'anthropic']).optional(),
  AI_OPENAI_BASE_URL: optionalUrl,
  AI_OPENAI_API_KEY: z.string().optional(),
  AI_OPENAI_MODEL: z.string().optional(),
  AI_ANTHROPIC_API_KEY: z.string().optional(),
  AI_ANTHROPIC_MODEL: z.string().optional(),
})

export const paymentsEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
})

export const videoEnvSchema = z.object({
  VIDEO_PROVIDER: z.enum(['local', 'openvod', 's3']).default('local'),
  OPENVOD_API_URL: optionalUrl,
  OPENVOD_API_KEY: z.string().optional(),
  OPENVOD_WEBHOOK_SECRET: z.string().optional(),
})

export const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
})

export type IntegrationSchemas = {
  storage: typeof storageEnvSchema
  video: typeof videoEnvSchema
  ai: typeof aiEnvSchema
  payments: typeof paymentsEnvSchema
  email: typeof emailEnvSchema
}

/**
 * How to decide whether an integration is usable.
 *
 * `selfSufficient: true` means the integration works with nothing configured —
 * local storage and local video playback are complete without any external
 * service, which is the default install.
 *
 * `requiresAny` names the fields that indicate the user intends to use this
 * integration. If none is present and the integration is not self-sufficient,
 * it is reported as unconfigured rather than as broken. Without this, a schema
 * where every field is optional would always look "configured" while having no
 * credentials at all.
 */
const integrationDefinitions = {
  storage: {
    schema: storageEnvSchema,
    selfSufficient: true,
    requiresAny: [],
    diagnose: () => [],
  },
  video: {
    schema: videoEnvSchema,
    selfSufficient: true,
    requiresAny: [],
    diagnose: () => [],
  },
  ai: {
    schema: aiEnvSchema,
    selfSufficient: false,
    requiresAny: [
      'AI_OPENAI_BASE_URL',
      'AI_OPENAI_API_KEY',
      'AI_ANTHROPIC_API_KEY',
    ],
    diagnose: (config: z.infer<typeof aiEnvSchema>): string[] => {
      const warnings: string[] = []

      if (
        config.AI_DEFAULT_PROVIDER === 'anthropic' &&
        !config.AI_ANTHROPIC_API_KEY
      ) {
        warnings.push(
          'ai → AI_DEFAULT_PROVIDER is "anthropic" but AI_ANTHROPIC_API_KEY is not set.',
        )
      }

      // Note deliberately absent: a warning for a model with no base URL. That
      // is the normal way to use the public OpenAI endpoint, not a mistake.

      return warnings
    },
  },
  payments: {
    schema: paymentsEnvSchema,
    selfSufficient: false,
    requiresAny: ['STRIPE_SECRET_KEY', 'RAZORPAY_KEY_ID'],
    diagnose: (config: z.infer<typeof paymentsEnvSchema>): string[] => {
      const warnings: string[] = []

      if (config.STRIPE_SECRET_KEY && !config.STRIPE_WEBHOOK_SECRET) {
        warnings.push(
          'payments → STRIPE_SECRET_KEY is set without STRIPE_WEBHOOK_SECRET; checkout will work but payments will never be confirmed.',
        )
      }

      if (config.RAZORPAY_KEY_ID && !config.RAZORPAY_WEBHOOK_SECRET) {
        warnings.push(
          'payments → RAZORPAY_KEY_ID is set without RAZORPAY_WEBHOOK_SECRET; checkout will work but payments will never be confirmed.',
        )
      }

      return warnings
    },
  },
  email: {
    schema: emailEnvSchema,
    selfSufficient: true,
    requiresAny: [],
    diagnose: (config: z.infer<typeof emailEnvSchema>): string[] => {
      const warnings: string[] = []

      if (config.RESEND_API_KEY && !config.EMAIL_FROM) {
        warnings.push(
          'email → RESEND_API_KEY is set without EMAIL_FROM; the sender address is required.',
        )
      }

      return warnings
    },
  },
} as const

export const integrationSchemas = {
  storage: storageEnvSchema,
  video: videoEnvSchema,
  ai: aiEnvSchema,
  payments: paymentsEnvSchema,
  email: emailEnvSchema,
} as const

export type IntegrationName = keyof typeof integrationSchemas

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export type EnvSource = Record<string, string | undefined>

const formatIssues = (error: z.ZodError, prefix: string) =>
  error.issues.map(
    (issue) => `${prefix}${issue.path.join('.')}: ${issue.message}`,
  )

function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  source: EnvSource,
  scope: string,
): z.infer<T> {
  const result = schema.safeParse(source)

  if (!result.success) {
    throw new ConfigError(
      formatIssues(result.error, scope ? `${scope} → ` : ''),
      scope
        ? `See .env.example for the ${scope} settings, or leave the entire group unset to run without it.`
        : 'See .env.example for the complete list, or run: cp .env.example .env',
    )
  }

  return result.data
}

/**
 * Load and validate core configuration.
 *
 * Call this once from an application entrypoint so problems surface immediately
 * with a complete report.
 */
export function loadEnv(source: EnvSource = process.env): CoreEnv {
  return parseOrThrow(coreEnvSchema, source, '')
}

export type IntegrationResult<T> = {
  /** Whether the integration can actually be used. */
  configured: boolean
  config: T | null
  /** Reasons it cannot work. A non-empty list implies `configured: false`. */
  problems: readonly string[]
  /** Incomplete or suspicious, but functional. Surfaced as actionable status. */
  warnings: readonly string[]
}

/**
 * Load an optional integration. Never throws.
 *
 * A broken integration disables a feature and explains itself; it does not take
 * down the process, and it does not leave a caller to discover the problem as a
 * runtime error three layers down.
 */
export function loadIntegration<K extends IntegrationName>(
  name: K,
  source: EnvSource = process.env,
): IntegrationResult<z.infer<IntegrationSchemas[K]>> {
  type Config = z.infer<IntegrationSchemas[K]>

  const definition = integrationDefinitions[name] as unknown as {
    schema: z.ZodType<Config>
    selfSufficient: boolean
    requiresAny: readonly string[]
    diagnose: (config: Config) => string[]
  }

  const intendedToUse =
    definition.requiresAny.length === 0 ||
    definition.requiresAny.some((key) => {
      const value = source[key]
      return value !== undefined && value.trim() !== ''
    })

  if (!intendedToUse) {
    if (!definition.selfSufficient) {
      return {
        configured: false,
        config: null,
        problems: [
          `${name} → not configured. Set ${definition.requiresAny.join(' or ')} to enable it.`,
        ],
        warnings: [],
      }
    }
  }

  const parsed = definition.schema.safeParse(source)

  if (!parsed.success) {
    return {
      configured: false,
      config: null,
      problems: formatIssues(parsed.error, `${name} → `),
      warnings: [],
    }
  }

  const warnings = definition.diagnose(parsed.data)

  // Any diagnostic that is phrased as a hard misconfiguration disables the
  // integration; the rest are advisories. `diagnose` only returns advisories
  // today, so a parse failure above is the only fatal path.
  return {
    configured: true,
    config: parsed.data,
    problems: [],
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Lazy accessor
// ---------------------------------------------------------------------------

let cached: CoreEnv | null = null

/**
 * Validated core configuration, resolved on first access.
 *
 * Reading a property before the environment is valid throws a `ConfigError`
 * rather than returning `undefined`, so a misconfiguration cannot silently
 * become a runtime bug three layers down.
 */
export const env: CoreEnv = new Proxy({} as CoreEnv, {
  get(_target, property: string | symbol) {
    if (typeof property === 'symbol') return undefined
    if (!cached) cached = loadEnv()
    return cached[property as keyof CoreEnv]
  },

  has(_target, property) {
    if (!cached) cached = loadEnv()
    return property in cached
  },

  ownKeys() {
    if (!cached) cached = loadEnv()
    return Reflect.ownKeys(cached)
  },

  getOwnPropertyDescriptor(_target, property) {
    if (!cached) cached = loadEnv()
    return Reflect.getOwnPropertyDescriptor(cached, property)
  },
})

/** Reset the memoized configuration. Intended for tests. */
export function resetEnvCache(): void {
  cached = null
}

/**
 * Produce a redacted, human-readable report of what is configured.
 *
 * Safe to expose on an admin-only status endpoint: it reports presence and
 * validity, never values.
 */
export function describeConfiguration(source: EnvSource = process.env) {
  const core = coreEnvSchema.safeParse(source)

  const integrations: Record<
    string,
    { configured: boolean; problems: string[]; warnings: string[] }
  > = {}

  for (const name of Object.keys(integrationSchemas) as IntegrationName[]) {
    const result = loadIntegration(name, source)

    integrations[name] = {
      configured: result.configured,
      problems: [...result.problems],
      warnings: [...result.warnings],
    }
  }

  return {
    core: core.success
      ? { valid: true as const, problems: [] as readonly string[] }
      : { valid: false as const, problems: formatIssues(core.error, '') },
    integrations,
  }
}
