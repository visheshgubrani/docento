import {
  apiErrorSchema,
  paginationQuerySchema,
  type AcademySummary,
  type ApiError,
  type CourseSummary,
  type ErrorCode,
  type PaginationQuery,
} from '@docento/contracts'

/**
 * Typed client for the Docento API.
 *
 * Licensed Apache-2.0, like `@docento/contracts`, so it can be embedded in
 * proprietary software. It must never import from the AGPL-3.0 application or
 * domain packages — that rule is enforced in CI. See
 * docs/adr/0006-licensing-boundary.md.
 */

export type DocentoClientOptions = {
  /** API origin, without a trailing slash. e.g. `https://api.example.com` */
  baseUrl: string
  /**
   * A publishable key (`pk_…`) for public reads, or a service key (`sk_…`) for
   * server-to-server calls.
   *
   * A publishable key is public: it identifies an academy and grants no access
   * to paid content. Never ship a service key to a browser.
   */
  apiKey?: string
  /** Bearer token for a learner acting on their own data. */
  learnerToken?: string
  /** Injectable for testing and for non-Node runtimes. */
  fetch?: typeof globalThis.fetch
}

/** An API failure carrying the machine-readable code clients branch on. */
export class DocentoApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly requestId: string | null
  readonly details: ApiError['details']

  constructor(
    status: number,
    error: ApiError,
    requestId: string | null,
  ) {
    super(error.message)
    this.name = 'DocentoApiError'
    this.code = error.code
    this.status = status
    this.requestId = requestId
    this.details = error.details
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  /** Required by retryable mutations such as checkout. */
  idempotencyKey?: string
  signal?: AbortSignal
}

export class DocentoClient {
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly learnerToken?: string
  private readonly fetchImpl: typeof globalThis.fetch

  constructor(options: DocentoClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.apiKey = options.apiKey
    this.learnerToken = options.learnerToken
    this.fetchImpl = options.fetch ?? globalThis.fetch
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(`${this.baseUrl}/api/v1${path}`)

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.learnerToken) {
      headers.Authorization = `Bearer ${this.learnerToken}`
    } else if (this.apiKey) {
      headers['x-api-key'] = this.apiKey
    }

    if (options.idempotencyKey) {
      headers['idempotency-key'] = options.idempotencyKey
    }

    const response = await this.fetchImpl(this.buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })

    const requestId = response.headers.get('x-request-id')
    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(
        (payload as { error?: unknown } | null)?.error,
      )

      throw new DocentoApiError(
        response.status,
        parsed.success
          ? parsed.data
          : {
              code: 'internal_error',
              message: `Request failed with status ${response.status}`,
            },
        requestId,
      )
    }

    // The envelope is `{ success, data, meta }`; callers want `data`.
    return (payload as { data: T }).data
  }

  // -------------------------------------------------------------------------
  // Public catalogue
  // -------------------------------------------------------------------------

  /** Read an academy's public profile. Safe to call with a publishable key. */
  async getAcademy(academyId: string): Promise<AcademySummary> {
    return this.request<AcademySummary>(`/catalog/academies/${academyId}`)
  }

  async listCourses(
    academyId: string,
    query: Partial<PaginationQuery> = {},
  ): Promise<CourseSummary[]> {
    const parsed = paginationQuerySchema.parse(query)

    return this.request<CourseSummary[]>(
      `/catalog/academies/${academyId}/courses`,
      { query: parsed },
    )
  }
}

export type {
  AcademySummary,
  ApiError,
  CourseSummary,
  ErrorCode,
  PaginationQuery,
}
