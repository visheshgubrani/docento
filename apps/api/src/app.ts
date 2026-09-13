import { Hono } from 'hono'

import { buildOpenApiDocument } from '@docento/contracts'
import {
  LEARNER_AUTH_BASE_PATH,
  STAFF_AUTH_BASE_PATH,
  getLearnerAuth,
  staffAuth,
} from '@docento/domain'

import { resolveAcademyFor } from './auth/principal.js'
import { requestContext } from './middleware/request-context.js'
import { fail } from './middleware/respond.js'
import { createRoutes } from './routes/index.js'

/**
 * The application.
 *
 * Assembled here rather than in the entry point so a test can build it without
 * binding a port — and so the composition is one readable list rather than
 * something spread across a bootstrap file.
 *
 * ## The two realms are mounted, not merged
 *
 * Staff and learners are separate Better Auth instances with separate tables and
 * separate cookie prefixes. Mounting them at separate paths is what keeps that
 * true at the HTTP layer: a learner session presented to the staff path cannot
 * resolve, because the staff instance does not consult the learner tables at
 * all. A single mount with a scoping adapter would make that a behavioural
 * property — every read path would have to remember the filter.
 *
 * ## The learner realm is resolved per request
 *
 * There is one staff instance and one learner instance *per academy*, because
 * the learner realm is built around academy-scoped tables. So the learner mount
 * resolves the academy first and picks the instance for it. An unknown host
 * resolves to no academy, and no academy means no instance to hand the request
 * to — which is the fail-closed behaviour, expressed as a type rather than as a
 * branch somebody has to remember to write.
 */
export function createApp(): Hono {
  const app = new Hono()

  app.use('*', requestContext())

  // --- Authentication realms ----------------------------------------------

  app.on(['GET', 'POST'], `${STAFF_AUTH_BASE_PATH}/*`, (c) => {
    /**
     * Better Auth handles its own sub-paths, so the wildcard is passed through
     * rather than enumerated: adding a plugin that registers a new endpoint
     * should not require changing this file.
     */
    return staffAuth.handler(c.req.raw)
  })

  app.on(['GET', 'POST'], `${LEARNER_AUTH_BASE_PATH}/*`, async (c) => {
    const academy = await resolveAcademyFor(c)

    if (!academy) {
      /**
       * The same not-found an unknown host gets everywhere else, and the reason
       * the resolution happens before the realm is consulted: a sign-in attempt
       * for an academy that does not resolve must not reach a realm that could
       * create a row.
       */
      return fail(c, 'not_found', 'There is no academy at this address.')
    }

    return getLearnerAuth(academy.id).handler(c.req.raw)
  })

  // --- API ----------------------------------------------------------------

  app.route('/api/v1', createRoutes())

  /**
   * The generated document, and a viewer for it.
   *
   * Generated from the contracts at request time rather than checked in as a
   * static file, so the served document cannot be a stale copy of one that was
   * regenerated in the repository — the two are the same code path.
   */
  app.get('/openapi.json', (c) =>
    c.json(
      buildOpenApiDocument({
        apiUrl: process.env.API_URL ?? new URL(c.req.url).origin,
      }),
    ),
  )

  app.get('/api-docs', (c) =>
    c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Docento API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>body { margin: 0 }</style>
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
    <script>
      // The viewer is a convenience for a self-hoster reading their own API.
      // It loads from a CDN, so a deployment that blocks third-party scripts
      // simply gets a blank page here — nothing else in the application
      // depends on it, and the document at /openapi.json is always available.
      window.addEventListener('load', function () {
        window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger' })
      })
    </script>
  </body>
</html>`),
  )

  // --- No route matched ---------------------------------------------------

  app.notFound((c) => {
    /**
     * A JSON envelope, not Hono's default text.
     *
     * A client that unwraps `data` and checks `error.code` should not have to
     * recognise a plain-text 404 as a special case — and the one time it matters
     * is the one time nobody tested.
     */
    return fail(c, 'not_found', `No route matches ${c.req.method} ${new URL(c.req.url).pathname}.`)
  })

  /**
   * Hono's `onError` is a backstop, not the main path.
   *
   * Every operation handler catches its own errors so it can log the action and
   * the reason. This catches what escapes that — a middleware throwing, or a
   * bug in the wrapper itself — and still returns the envelope.
   */
  app.onError((error, c) => {
    console.error(
      JSON.stringify({
        level: 'error',
        service: 'api',
        message: 'uncaught_error',
        path: new URL(c.req.url).pathname,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      }),
    )

    return fail(c, 'internal_error', 'Something went wrong on our side.')
  })

  return app
}
