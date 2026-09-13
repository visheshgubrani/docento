import { loadIntegration } from '@docento/config'
import type { EnvSource } from '@docento/config'

import { createEmailProvider, formatSender } from './email/index.js'
import type { EmailProvider } from './email/index.js'
import { createStorage } from './storage/index.js'
import type { StorageAdapter } from './storage/index.js'

/**
 * Building adapters from the environment, in one place.
 *
 * ## Why this is here rather than in each process
 *
 * The API serves media, so it needs storage; the worker sweeps and emails, so it
 * needs both. Before this existed the assembly lived in the worker's entry
 * point, which meant the API would have grown its own copy — and two copies of
 * "how is S3 configured" drift in exactly the way that produces an upload that
 * lands and a download that 404s.
 *
 * ## Why the integrations package reads the config, and not the reverse
 *
 * `@docento/config` owns validation; `@docento/integrations` owns the adapters.
 * Putting this factory in the config package would invert that — it would have
 * to know what an `S3StorageOptions` is — so the dependency stays one-way:
 * integrations depends on config, and neither depends on the other's internals.
 *
 * ## Why the raw environment and not the validated object
 *
 * `STORAGE_DRIVER` and `EMAIL_PROVIDER` live in their integration's own schema,
 * because they are only meaningful together with the fields beside them. The
 * core schema strips those keys, so a factory handed the validated object would
 * report every integration as unconfigured while the variables were set.
 */

/**
 * The storage adapter the environment describes.
 *
 * ## Storage has no silent fallback
 *
 * A `configured: false` result with S3 selected is a deployment problem, and
 * `createStorage` raises for it rather than quietly writing to local disk — a
 * fallback would scatter files across a container's ephemeral filesystem and
 * lose them on the next deploy, while the deployment reported itself healthy.
 *
 * Local storage is genuinely self-sufficient: it has a default directory, so an
 * installation that configures nothing gets working uploads on disk.
 */
export function createStorageFromEnv(
  source: EnvSource,
  options: { apiUrl: string },
): StorageAdapter {
  const result = loadIntegration('storage', source)

  const config = result.config ?? {
    STORAGE_DRIVER: 'local' as const,
    LOCAL_STORAGE_DIR: './.data/uploads',
  }

  return createStorage({
    driver: config.STORAGE_DRIVER,
    localDirectory: config.LOCAL_STORAGE_DIR,
    apiUrl: options.apiUrl,
    ...(config.STORAGE_DRIVER === 's3'
      ? {
          s3: {
            bucket: config.S3_BUCKET ?? '',
            region: config.S3_REGION ?? '',
            ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
            accessKeyId: config.S3_ACCESS_KEY_ID ?? '',
            secretAccessKey: config.S3_SECRET_ACCESS_KEY ?? '',
          },
        }
      : {}),
  })
}

/**
 * The email provider the environment describes.
 *
 * ## Email has a default, because having none is a supported state
 *
 * An installation with no mail server still needs password resets to work
 * somehow, so an unconfigured email provider is the console one: the message is
 * written to the process log, and the operator can read it. That is a poor
 * arrangement for production and a perfectly good one for a self-hosted install
 * being set up — and it is visible, which a silent no-op would not be.
 *
 * The exception is a provider that was *selected* and is missing a credential:
 * `resend` with no key raises, because a deployment that chose Resend and forgot
 * the key would otherwise write password resets into a log nobody reads while
 * reporting itself healthy.
 */
export function createEmailFromEnv(
  source: EnvSource,
  options: { onProblem?: (problems: readonly string[]) => void } = {},
): EmailProvider {
  const result = loadIntegration('email', source)

  if (!result.config) {
    options.onProblem?.(result.problems)

    return createEmailProvider({ provider: 'console' })
  }

  const config = result.config

  const from = formatSender({
    from: config.EMAIL_FROM ?? 'noreply@localhost',
    ...(config.EMAIL_FROM_NAME ? { name: config.EMAIL_FROM_NAME } : {}),
  })

  if (config.EMAIL_PROVIDER === 'resend') {
    return createEmailProvider({
      provider: 'resend',
      apiKey: config.RESEND_API_KEY ?? '',
      from,
    })
  }

  if (config.EMAIL_PROVIDER === 'smtp') {
    return createEmailProvider({
      provider: 'smtp',
      host: config.SMTP_HOST ?? '',
      port: config.SMTP_PORT ?? 587,
      secure: config.SMTP_SECURE ?? false,
      /**
       * Defaults to requiring TLS.
       *
       * Sending a password reset in plaintext because a server did not offer
       * STARTTLS is a downgrade nobody would notice from the configuration and
       * everybody would notice in a breach report.
       */
      requireTls: config.SMTP_REQUIRE_TLS ?? true,
      ...(config.SMTP_USERNAME ? { username: config.SMTP_USERNAME } : {}),
      ...(config.SMTP_PASSWORD ? { password: config.SMTP_PASSWORD } : {}),
      from,
    })
  }

  return createEmailProvider({ provider: 'console' })
}
