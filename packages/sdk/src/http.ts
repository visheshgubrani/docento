import {
  type ApiError,
  type ErrorCode,
  type OperationInput,
  type OperationName,
  type OperationOutput,
  API_MOUNT,
  OPERATIONS,
  REQUEST_ID_HEADER,
  WORKSPACE_HEADER,
  apiErrorSchema,
  buildPath,
} from '@docento/contracts'

/**
 * The HTTP transport for `@docento/sdk`.
 *
 * Licensed Apache-2.0, like `@docento/contracts`, and deliberately free of any
 * import from the AGPL application — see docs/adr/0006-licensing-boundary.md.
 * The consequence worth stating: this package knows the API's *shapes* because
 * the contracts describe them, and knows nothing about how they are produced.
 *
 * ## What this layer is responsible for
 *
 * Exactly four things, each of which every caller would otherwise reimplement
 * slightly differently:
 *
 * 1. building a URL from an operation's registry entry, so a path cannot drift
 *    from the one the API serves;
 * 2. attaching the credential;
 * 3. unwrapping the response envelope, so callers get `data` rather than
 *    `data.data`;
 * 4. turning a failure into a typed error carrying the machine-readable code,
 *    because branching on prose is how a client breaks when a message is
 *    reworded.
 */

export type DocentoClientOptions = {
  /**
   * The API's origin, without a trailing slash and without the mount:
   * `https://api.example.com`. The client appends `API_MOUNT` itself.
   *
   * The empty string is a value rather than an omission: it names the origin
   * this code is already running in, so every request is issued as a relative
   * `/api/v1/…` path. That is what a browser wants when the application proxies
   * the API mount to the API — the cookie is first-party and there is no CORS.
   * It requires a runtime with a document origin to resolve against.
   */
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
  /**
   * The workspace a staff request acts in.
   *
   * A staff identity spans workspaces, so the client says which one it means —
   * and the API checks that against the membership table rather than trusting
   * it. Omitted for learners and for public reads, which have no workspace to
   * name.
   */
  workspaceId?: string
  /**
   * Send cookies.
   *
   * Needed when the caller is a browser talking to the API directly, which is
   * the case for the two applications in this repository. A server-side caller
   * using a service key should leave it off.
   */
  credentials?: 'include' | 'omit' | 'same-origin'
  /** Injectable for testing and for runtimes with their own `fetch`. */
  fetch?: typeof globalThis.fetch
  /** Called with every response, for tracing. */
  onResponse?: (info: {
    operation: OperationName
    requestId: string | null
    status: number
  }) => void
}

/** An API failure, carrying the code clients branch on. */
export class DocentoApiError extends Error {
  /** Machine-readable. Branch on this, never on `message`. */
  readonly code: ErrorCode
  readonly status: number
  /** Matches the server logs, which is what makes a report findable. */
  readonly requestId: string | null
  /** Field-level detail, present on `validation_failed`. */
  readonly details: ApiError['details']

  constructor(
    status: number,
    error: ApiError,
    requestId: string | null,
    options?: { cause?: unknown },
  ) {
    super(error.message, options)
    this.name = 'DocentoApiError'
    this.code = error.code
    this.status = status
    this.requestId = requestId
    this.details = error.details
  }

  /**
   * Whether the same request could succeed later.
   *
   * A conflict or a rate limit is worth retrying; a validation failure is not,
   * and retrying it is how a client turns one problem into a request storm.
   */
  get isRetryable(): boolean {
    return (
      this.status >= 500 ||
      this.code === 'rate_limited' ||
      this.code === 'conflict'
    )
  }
}

/**
 * A failure that never reached the API.
 *
 * Distinct from `DocentoApiError` because there is no status and no request id —
 * and because a caller may reasonably retry a network failure but not a
 * rejected one.
 */
export class DocentoTransportError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DocentoTransportError'
  }
}

type CallOptions = {
  /** Required by operations the registry marks `retryable`. */
  idempotencyKey?: string
  signal?: AbortSignal
  /** Overrides the client's credential for one call. */
  learnerToken?: string
  /**
   * What to call this request in an error message.
   *
   * The generated methods pass their own name, because a caller who wrote
   * `api.listLearnerCourses()` should not be told that `learner.courses`
   * failed — the registry name is an internal coordinate, and asking a
   * developer to translate it back is work the client can do for them.
   */
  describeAs?: string
}

export class DocentoClient {
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly learnerToken?: string
  private readonly workspaceId?: string
  private readonly credentials: 'include' | 'omit' | 'same-origin'
  private readonly fetchImpl: typeof globalThis.fetch
  private readonly onResponse?: DocentoClientOptions['onResponse']

  constructor(options: DocentoClientOptions) {
    /**
     * A base URL is required — but `''` is a value, not an omission.
     *
     * An empty base URL means "the origin this code is already running in", and
     * it is how a browser in this repository's applications reaches the API:
     * the request goes to the application's own origin and is rewritten to the
     * API, so the session cookie is first-party. The falsy check this replaces
     * rejected it, which made every browser-side write in both applications
     * throw before a request was sent — no request in the API's log, nothing in
     * the network tab, and only a generic sentence shown to the operator.
     *
     * It only works in a runtime that resolves a relative URL against a
     * document origin, which is to say a browser. A server-side caller still
     * passes an absolute origin.
     */
    if (typeof options.baseUrl !== 'string') {
      throw new Error(
        'A baseUrl is required. Pass the API origin, e.g. http://localhost:4000, or the empty string for the origin this code is running in.',
      )
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKey = options.apiKey
    this.learnerToken = options.learnerToken
    this.workspaceId = options.workspaceId
    this.credentials = options.credentials ?? 'omit'
    this.fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis)
    this.onResponse = options.onResponse

    if (!this.fetchImpl) {
      throw new Error(
        'No fetch implementation found. Pass one explicitly for this runtime.',
      )
    }
  }

  /**
   * Call an operation by name.
   *
   * Prefer the generated methods on `DocentoClient` — they exist so a caller
   * writes `client.publishCourse({...})` and gets a signature rather than
   * discovering the inputs from documentation. This is the escape hatch for an
   * operation not yet given a method, and it is what those methods delegate to.
   */
  async call<Name extends OperationName>(
    name: Name,
    input: OperationInput<Name> = {},
    options: CallOptions = {},
  ): Promise<OperationOutput<Name>> {
    const operation = OPERATIONS[name]
    const described = options.describeAs ?? name

    const path = buildPath(operation.path, {
      ...(input.params as Record<string, string> | undefined),
    })

    const query = new URLSearchParams()

    for (const [key, value] of Object.entries(
      (input.query ?? {}) as Record<string, unknown>,
    )) {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value))
      }
    }

    /**
     * The registry's paths are relative to the API mount, so the mount is
     * restored here — once, for every call. A client that expected callers to
     * include it would put the prefix in a configuration value, and a
     * deployment that got it slightly wrong would produce 404s that look like a
     * proxy problem.
     */
    const url = `${this.baseUrl}${API_MOUNT}${path}${query.size > 0 ? `?${query.toString()}` : ''}`

    const headers: Record<string, string> = { Accept: 'application/json' }

    if (input.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const token = options.learnerToken ?? this.learnerToken

    if (token) {
      headers.Authorization = `Bearer ${token}`
    } else if (this.apiKey) {
      /**
       * A publishable key and a service key go in different headers.
       *
       * They are not interchangeable: the API treats `pk_` as an identifier
       * that grants nothing and `sk_` as a credential with scopes. Sending the
       * wrong one produces a refusal that names the problem, which is better
       * than a silent downgrade.
       */
      headers[
        this.apiKey.startsWith('pk_') ? 'x-publishable-key' : 'x-api-key'
      ] = this.apiKey
    }

    if (this.workspaceId) {
      headers[WORKSPACE_HEADER] = this.workspaceId
    }

    if (options.idempotencyKey) {
      headers['idempotency-key'] = options.idempotencyKey
    }

    let response: Response

    try {
      response = await this.fetchImpl(url, {
        method: operation.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        credentials: this.credentials,
        signal: options.signal,
      })
    } catch (error) {
      /**
       * A network failure is not an API failure.
       *
       * Wrapping it keeps a caller from having to distinguish `TypeError:
       * fetch failed` from an envelope, and keeps `isRetryable` meaningful —
       * a request that never arrived may be worth repeating.
       */
      throw new DocentoTransportError(
        `The request to ${described} could not be sent.`,
        { cause: error },
      )
    }

    const requestId = response.headers.get(REQUEST_ID_HEADER)
    this.onResponse?.({ operation: name, requestId, status: response.status })

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
              code: fallbackCodeFor(response.status),
              message: `The request to ${described} failed with status ${response.status}.`,
            },
        requestId,
      )
    }

    const envelope = payload as { data?: unknown; success?: boolean } | null

    if (!envelope || envelope.success !== true) {
      /**
       * A 200 that is not an envelope means something other than the API
       * answered — a proxy's error page, a misconfigured rewrite. Reported as a
       * transport failure rather than returning `undefined` to a caller who
       * would then fail somewhere unrelated.
       */
      throw new DocentoTransportError(
        `The response from ${described} was not an API envelope. Check that baseUrl points at the API and not at a proxy or a frontend.`,
      )
    }

    return envelope.data as OperationOutput<Name>
  }

  /**
   * Call an operation with its response validated against the contract.
   *
   * Off by default in the generated methods because validating every response
   * in production costs a parse per call. Available because a test *should*
   * validate — a mismatch between what the API returns and what the contract
   * promises is exactly the drift this package exists to make impossible, and
   * a test is where it is cheapest to find.
   */
  async callValidated<Name extends OperationName>(
    name: Name,
    input: OperationInput<Name> = {},
    options: CallOptions = {},
  ): Promise<OperationOutput<Name>> {
    const data = await this.call(name, input, options)
    const parsed = OPERATIONS[name].response.safeParse(data)

    if (!parsed.success) {
      throw new DocentoTransportError(
        `The response from ${options.describeAs ?? name} does not match its contract: ${parsed.error.issues
          .map((issue) => `${issue.path.join('.')} ${issue.message}`)
          .join('; ')}`,
      )
    }

    return parsed.data as OperationOutput<Name>
  }
}

/**
 * A code for a response that carried no envelope.
 *
 * Guesses from the status rather than defaulting to `internal_error`, because a
 * `401` from a proxy is a very different situation from a `500` and a caller
 * may reasonably act on the difference.
 */
function fallbackCodeFor(status: number): ErrorCode {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 422 || status === 400) return 'validation_failed'
  if (status === 429) return 'rate_limited'

  return 'internal_error'
}
