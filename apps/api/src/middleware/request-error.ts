import { type OperationName, IDEMPOTENCY_HEADER } from '@docento/contracts'

// ---------------------------------------------------------------------------
// Malformed requests
// ---------------------------------------------------------------------------

/**
 * A malformed request.
 *
 * These extend `Error` rather than reusing a domain error because they are not
 * domain conditions: the domain is never reached, and nothing about a business
 * rule is involved. `handleError` maps them to `validation_failed` with the
 * field detail the contracts promise.
 */
export class RequestError extends Error {
  readonly code = 'validation_failed'
  readonly details: { path: string; message: string }[]

  constructor(
    message: string,
    details: { path: string; message: string }[] = [],
  ) {
    super(message)
    this.name = 'RequestError'
    this.details = details
  }
}

export class ParamValidationError extends RequestError {
  constructor(name: OperationName, _received: unknown) {
    super(`The parameters for "${name}" are not valid.`, [
      { path: 'params', message: 'one or more path parameters are malformed' },
    ])
    this.name = 'ParamValidationError'
  }
}

export class BodyParseError extends RequestError {
  constructor(name: OperationName) {
    super(`The body of "${name}" is not valid JSON.`, [
      { path: '(body)', message: 'must be a JSON object' },
    ])
    this.name = 'BodyParseError'
  }
}

export class BodyValidationError extends RequestError {
  constructor(name: OperationName, details: { path: string; message: string }[]) {
    super(`The request to "${name}" is not valid.`, details)
    this.name = 'BodyValidationError'
  }
}

export class IdempotencyKeyError extends RequestError {
  constructor(name: OperationName) {
    super(`"${name}" requires an idempotency key.`, [
      {
        path: IDEMPOTENCY_HEADER,
        message: 'provide a stable value so a retry does not repeat the effect',
      },
    ])
    this.name = 'IdempotencyKeyError'
  }
}
