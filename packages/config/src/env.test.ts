import { describe, expect, it } from 'vitest'

import {
  ConfigError,
  describeConfiguration,
  loadEnv,
  loadIntegration,
} from './env.js'

const valid = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/docento',
  APP_URL: 'http://localhost:3000',
  STAFF_AUTH_SECRET: 'a'.repeat(48),
  LEARNER_AUTH_SECRET: 'b'.repeat(48),
  ENCRYPTION_KEY: 'c'.repeat(64),
}

describe('loadEnv', () => {
  it('accepts a minimal valid environment and applies defaults', () => {
    const config = loadEnv(valid)

    expect(config.NODE_ENV).toBe('development')
    expect(config.API_PORT).toBe(4000)
    expect(config.EMAIL_PROVIDER).toBe('console')
    expect(config.TRUSTED_ORIGINS).toEqual([])
    expect(config.TELEMETRY_ENABLED).toBe(false)
  })

  it('reports every problem at once rather than one per restart', () => {
    let thrown: unknown

    try {
      loadEnv({})
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(ConfigError)
    const problems = (thrown as ConfigError).problems.join('\n')

    // All five required values must be reported together.
    expect(problems).toContain('DATABASE_URL')
    expect(problems).toContain('APP_URL')
    expect(problems).toContain('STAFF_AUTH_SECRET')
    expect(problems).toContain('LEARNER_AUTH_SECRET')
    expect(problems).toContain('ENCRYPTION_KEY')
  })

  it('gives an actionable hint for a weak auth secret', () => {
    expect(() => loadEnv({ ...valid, STAFF_AUTH_SECRET: 'short' })).toThrow(
      /openssl rand -base64 48/,
    )
  })

  it('gives an actionable hint for a malformed encryption key', () => {
    expect(() => loadEnv({ ...valid, ENCRYPTION_KEY: 'not-hex' })).toThrow(
      /openssl rand -hex 32/,
    )
  })

  it('rejects a relative APP_URL, which would break auth callbacks', () => {
    expect(() => loadEnv({ ...valid, APP_URL: '/dashboard' })).toThrow(/APP_URL/)
  })

  it('parses comma-separated trusted origins and trims them', () => {
    const config = loadEnv({
      ...valid,
      TRUSTED_ORIGINS: 'https://a.example , https://b.example,,',
    })

    expect(config.TRUSTED_ORIGINS).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('uses distinct defaults for the two realm secrets', () => {
    // The realms must not share a secret, or one leaked secret forges sessions
    // in both. A single shared variable would make that possible by accident.
    const config = loadEnv(valid)
    expect(config.STAFF_AUTH_SECRET).not.toBe(config.LEARNER_AUTH_SECRET)
  })

  describe('boolean flags', () => {
    it.each(['1', 'true', 'YES', 'on'])('treats %s as true', (value) => {
      expect(
        loadEnv({ ...valid, TELEMETRY_ENABLED: value }).TELEMETRY_ENABLED,
      ).toBe(true)
    })

    it.each(['0', 'false', 'NO', 'off'])('treats %s as false', (value) => {
      expect(
        loadEnv({ ...valid, TELEMETRY_ENABLED: value }).TELEMETRY_ENABLED,
      ).toBe(false)
    })

    it('rejects a typo instead of silently reading it as false', () => {
      expect(() => loadEnv({ ...valid, TELEMETRY_ENABLED: 'ture' })).toThrow(
        /expected a boolean/,
      )
    })
  })
})

describe('loadIntegration', () => {
  describe('self-sufficient integrations', () => {
    it('treats local storage as configured with no environment at all', () => {
      const storage = loadIntegration('storage', {})

      expect(storage.configured).toBe(true)
      expect(storage.config).toMatchObject({
        STORAGE_DRIVER: 'local',
        LOCAL_STORAGE_DIR: './.data/uploads',
      })
    })

    it('treats local video as configured with no environment at all', () => {
      const video = loadIntegration('video', {})

      expect(video.configured).toBe(true)
      expect(video.config).toMatchObject({ VIDEO_PROVIDER: 'local' })
    })
  })

  describe('integrations that require credentials', () => {
    it('reports AI as unconfigured, with an explanation, when nothing is set', () => {
      const ai = loadIntegration('ai', {})

      expect(ai.configured).toBe(false)
      expect(ai.config).toBeNull()
      expect(ai.problems.length).toBeGreaterThan(0)
      expect(ai.problems.join('\n')).toMatch(/AI_OPENAI_BASE_URL/)
    })

    it('reports payments as unconfigured when nothing is set', () => {
      const payments = loadIntegration('payments', {})

      expect(payments.configured).toBe(false)
      expect(payments.problems.join('\n')).toMatch(/STRIPE_SECRET_KEY/)
    })

    it('accepts a local OpenAI-compatible endpoint with no API key', () => {
      // Ollama, vLLM, and llama.cpp are reached by base URL with no credential.
      // A schema that demanded a key would make the local-inference path, which
      // is the first-class self-hosted story, impossible to configure.
      const ai = loadIntegration('ai', {
        AI_OPENAI_BASE_URL: 'http://localhost:11434/v1',
        AI_OPENAI_MODEL: 'llama3.1',
      })

      expect(ai.configured).toBe(true)
      expect(ai.config).toMatchObject({
        AI_OPENAI_BASE_URL: 'http://localhost:11434/v1',
      })
    })
  })

  describe('warnings', () => {
    it('warns when a payment key is set with no webhook secret', () => {
      // Checkout works but payments are never confirmed, which is a silent
      // failure the operator needs to be told about rather than discover.
      const payments = loadIntegration('payments', {
        STRIPE_SECRET_KEY: 'sk_test_partial',
      })

      expect(payments.configured).toBe(true)
      expect(payments.warnings.join('\n')).toMatch(/STRIPE_WEBHOOK_SECRET/)
    })

    it('warns when Anthropic is the default provider but has no key', () => {
      const ai = loadIntegration('ai', {
        AI_DEFAULT_PROVIDER: 'anthropic',
        AI_OPENAI_API_KEY: 'sk-unrelated',
      })

      expect(ai.configured).toBe(true)
      expect(ai.warnings.join('\n')).toMatch(/AI_ANTHROPIC_API_KEY/)
    })

    it('warns when a Resend key is set with no sender address', () => {
      const email = loadIntegration('email', { RESEND_API_KEY: 're_abc' })

      expect(email.configured).toBe(true)
      expect(email.warnings.join('\n')).toMatch(/EMAIL_FROM/)
    })

    it('produces no warnings for a complete configuration', () => {
      const ai = loadIntegration('ai', {
        AI_OPENAI_API_KEY: 'sk-test',
        AI_OPENAI_MODEL: 'gpt-4o-mini',
      })

      expect(ai.configured).toBe(true)
      expect(ai.warnings).toEqual([])
    })
  })

  it('never throws, whatever the environment looks like', () => {
    const hostile = [
      { STORAGE_DRIVER: 'nonsense' },
      { AI_OPENAI_BASE_URL: 'not a url' },
      { VIDEO_PROVIDER: '' },
      { STRIPE_SECRET_KEY: ' ' },
      { RESEND_API_KEY: 're_x', EMAIL_FROM: '' },
    ]

    for (const source of hostile) {
      expect(() => loadIntegration('storage', source)).not.toThrow()
      expect(() => loadIntegration('ai', source)).not.toThrow()
      expect(() => loadIntegration('video', source)).not.toThrow()
      expect(() => loadIntegration('payments', source)).not.toThrow()
      expect(() => loadIntegration('email', source)).not.toThrow()
    }
  })
})

describe('describeConfiguration', () => {
  it('reports presence and validity, never secret values', () => {
    const report = describeConfiguration({
      ...valid,
      AI_OPENAI_API_KEY: 'sk-super-secret',
      STRIPE_SECRET_KEY: 'sk_test_secret',
    })

    const serialized = JSON.stringify(report)

    expect(report.core.valid).toBe(true)
    expect(report.integrations.storage).toEqual({
      configured: true,
      problems: [],
      warnings: [],
    })
    expect(report.integrations.ai.configured).toBe(true)

    expect(serialized).not.toContain(valid.STAFF_AUTH_SECRET)
    expect(serialized).not.toContain(valid.ENCRYPTION_KEY)
    expect(serialized).not.toContain('sk-super-secret')
    expect(serialized).not.toContain('sk_test_secret')
  })

  it('summarizes a broken environment without throwing', () => {
    const report = describeConfiguration({})

    expect(report.core.valid).toBe(false)
    expect(report.core.problems.length).toBeGreaterThan(0)
    expect(report.integrations.ai.configured).toBe(false)
  })
})
