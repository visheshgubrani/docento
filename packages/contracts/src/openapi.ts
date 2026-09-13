import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import {
  ERROR_CODES,
  IDEMPOTENCY_HEADER,
  REQUEST_ID_HEADER,
  apiFailureSchema,
  apiResponseSchema,
} from './envelope'
import { OPERATIONS, OPERATION_NAMES } from './operations'

/**
 * The OpenAPI document, generated from the operation registry.
 *
 * Generated rather than written, because a hand-maintained specification is a
 * second description of the API that drifts silently. A field added to a
 * response and not to the document is a lie told to every integrator, and it is
 * a lie nobody catches because the document is internally consistent.
 *
 * `ARCHITECTURE.md` has described this as generated since before it was true.
 * This is the part that makes the claim honest.
 *
 * The document is OpenAPI 3.1, which is JSON Schema-compatible — 3.0 would
 * require translating Zod's output, and every translation is a place for the
 * document to say something the schema does not.
 */

extendZodWithOpenApi(z)

export type OpenApiDocumentOptions = {
  /** Public origin, used for `servers`. */
  apiUrl: string
  title?: string
  version?: string
}

/**
 * Build the document.
 *
 * Pure: no filesystem, no network, no environment beyond the options. That is
 * what lets a test assert the document matches the registry, and what lets the
 * API serve it and CI check it in as an artifact without three code paths.
 */
export function buildOpenApiDocument(
  options: OpenApiDocumentOptions,
): Record<string, unknown> {
  const registry = new OpenAPIRegistry()

  registry.registerComponent('securitySchemes', 'learnerSession', {
    type: 'apiKey',
    in: 'cookie',
    name: 'docento-learner.session_token',
    description:
      'A learner session issued by /api/auth/learners. Scoped to one academy; a token from another cannot resolve.',
  })

  registry.registerComponent('securitySchemes', 'staffSession', {
    type: 'apiKey',
    in: 'cookie',
    name: 'docento-staff.session_token',
    description:
      'A staff session issued by /api/auth/staff. Spans workspaces; the active workspace lives on the session.',
  })

  registry.registerComponent('securitySchemes', 'serviceKey', {
    type: 'http',
    scheme: 'bearer',
    description:
      'A service key (sk_…) for server-to-server calls. Carries scopes and never stands in for a person: billing, credentials and membership require a staff session.',
  })

  registry.registerComponent('securitySchemes', 'publishableKey', {
    type: 'apiKey',
    in: 'header',
    name: 'x-publishable-key',
    description:
      'A publishable key (pk_…) identifying an academy in a browser. Public by definition, and not an authenticator.',
  })

  for (const name of OPERATION_NAMES) {
    const operation = OPERATIONS[name]
    const isPublic = operation.action === 'public'

    registry.registerPath({
      method: operation.method.toLowerCase() as
        'get' | 'post' | 'patch' | 'put' | 'delete',
      path: operation.path,
      summary: operation.summary,
      operationId: name,
      tags: [name.split('.')[0] ?? 'api'],
      security: isPublic ? [] : securityFor(operation, name),
      /**
       * Only the parts this operation has.
       *
       * `params`, `query` and `body` are declared where they apply rather than
       * on every operation, so the generator asks instead of assuming — which
       * is also what keeps an operation with no body from being documented with
       * one.
       */
      request: {
        ...('params' in operation ? { params: operation.params } : {}),
        ...('query' in operation ? { query: operation.query } : {}),
        ...('body' in operation
          ? {
              body: {
                content: { 'application/json': { schema: operation.body } },
                required: true,
              },
            }
          : {}),
        headers: requestHeadersFor(name),
      },
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: apiResponseSchema(operation.response),
            },
          },
        },
        /**
         * Documented once, as a union, rather than per operation.
         *
         * Every failure uses the same envelope, so repeating it per endpoint
         * would be forty copies of the same schema and a document nobody scans
         * for the part that matters — the error codes.
         */
        default: {
          description: `Failure. \`error.code\` is one of: ${ERROR_CODES.join(', ')}.`,
          content: {
            'application/json': { schema: apiFailureSchema },
          },
        },
      },
    })
  }

  const generator = new OpenApiGeneratorV31(registry.definitions)

  const document = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: options.title ?? 'Docento API',
      version: options.version ?? '0.1.0',
      description: [
        'A self-hostable course platform.',
        '',
        'Every response carries a `requestId` matching the server logs, which is what makes a user-reported failure findable.',
        `Retryable mutations require an \`${IDEMPOTENCY_HEADER}\` header: the same key twice produces one business effect.`,
        'Collections use cursor pagination.',
      ].join('\n'),
      license: {
        name: 'AGPL-3.0-only for the application, Apache-2.0 for this SDK',
      },
    },
    servers: [{ url: options.apiUrl }],
  })

  return document as unknown as Record<string, unknown>
}

/**
 * Which credential an operation accepts.
 *
 * A learner operation accepts only the learner session. A workspace operation
 * accepts a staff session or a service key, because a service key is a
 * legitimate way for an integration to manage content — and the domain refuses
 * the operations a key must never perform regardless of what is advertised
 * here.
 */
function securityFor(
  operation: { action: string },
  name: string,
): Record<string, string[]>[] {
  if (operation.action.startsWith('learner:')) {
    return [{ learnerSession: [] }]
  }

  if (name.startsWith('catalog.')) {
    return []
  }

  return [{ staffSession: [] }, { serviceKey: [] }]
}

/**
 * Headers an operation documents.
 *
 * A Zod object rather than a description map, because that is what the
 * generator consumes — and building it per operation means a GET is not
 * documented as accepting an idempotency key it would ignore.
 */
function requestHeadersFor(
  name: string,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {
    [REQUEST_ID_HEADER]: z
      .string()
      .min(1)
      .max(128)
      .optional()
      .describe(
        'Optional caller-chosen request id, echoed back and logged. Pass your own tracing id to correlate a support report with the server logs.',
      ),
  }

  const definition = OPERATIONS[name as keyof typeof OPERATIONS] as {
    retryable?: true
  }

  if (definition.retryable === true) {
    shape[IDEMPOTENCY_HEADER] = z
      .string()
      .min(8)
      .max(255)
      .describe(
        'Required on this operation. The same key twice returns the stored response rather than performing the work again.',
      )
  }

  return z.object(shape)
}
