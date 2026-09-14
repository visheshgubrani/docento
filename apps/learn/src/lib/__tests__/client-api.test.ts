import { describe, expect, it } from 'vitest'

import { browserApiClient } from '../client-api'

/**
 * The learner application's browser client.
 *
 * Every write a learner makes — enrolling, recording progress, submitting a quiz
 * or an assignment, requesting a certificate — begins by building this client.
 * For a while it could not be built at all: the SDK refused an empty `baseUrl`,
 * so the constructor threw before a request was sent. Each of those buttons
 * failed with a generic message and left no trace in the API's log.
 *
 * The proxy these relative paths depend on is asserted separately, in
 * `next-config.test.ts`. What is asserted here is that the client the components
 * build actually exists.
 */
describe('the browser client', () => {
  it('can be built, which is where every learner write starts', () => {
    expect(() => browserApiClient()).not.toThrow()
  })
})
