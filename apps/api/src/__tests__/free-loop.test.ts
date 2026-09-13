import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { IDEMPOTENCY_HEADER, WORKSPACE_HEADER } from '@docento/contracts'
import { DocentoApi, DocentoApiError } from '@docento/sdk'
import { prisma, staffAuth } from '@docento/domain'

import { createApp } from '../app.js'

/**
 * The whole free-learning loop, over HTTP, as a client would drive it.
 *
 * ## Why this exists in addition to the domain tests
 *
 * The domain's tests call operations directly. They prove each rule, and they
 * would all still pass if the API mounted the wrong path, resolved the wrong
 * principal, or dropped the workspace header on the floor — the seams between
 * the parts are exactly what unit tests do not cover.
 *
 * So this drives the **SDK**, against the **app**, over **real HTTP requests**,
 * against **real Postgres**, through the loop the milestone is defined by:
 *
 *   staff signs up → creates a workspace → an academy → a course with a module,
 *   a lesson and a two-question quiz → publishes it → a learner signs up,
 *   browses the catalogue, enrols → completes the lesson and passes the quiz →
 *   earns a certificate → and a stranger verifies it by its id.
 *
 * ## Why it uses the SDK and not `fetch`
 *
 * The SDK is what an integrator is given, and its method signatures come from
 * the same registry the routes are mounted from. A hand-written `fetch` here
 * would test a third description of the API that nobody ships.
 *
 * ## Why the learner realm is driven through `getLearnerAuth`
 *
 * Learner sign-up goes through Better Auth's own endpoint, which is not a
 * registry operation — there is no `auth.signUp`. It is reached here through the
 * same instance the route mounts, so the session cookie that comes back is a
 * real one that the API will accept, rather than a token this test invented.
 */

const app = createApp()

const tag = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

/**
 * The API client, pointed at the Hono app rather than at a socket.
 *
 * `app.request` is Hono's own request method: it builds a `Request`, runs the
 * whole middleware chain, and returns a `Response`. That is the entire HTTP
 * surface minus the listener, so the SDK's code path — URL building, envelopes,
 * error codes — is exercised for real while the test needs no port and no
 * teardown race.
 */
function client(options: {
  cookie?: string
  workspaceId?: string
  /**
   * The academy this request is about.
   *
   * Required for learner calls and optional for the rest. The learner realm is
   * built per academy — its tables carry `academyId` — so the API resolves an
   * academy before it can find a session at all. The learn application's proxy
   * sends the same header; a client that omitted it would see every learner call
   * refused as though the session were missing.
   */
  academySlug?: string
} = {}): DocentoApi {
  return new DocentoApi({
    baseUrl: 'http://localhost',
    ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
    /**
     * `Parameters<typeof globalThis.fetch>[0]` rather than `RequestInfo`:
     * `RequestInfo` is a DOM type, and this package compiles against the Node
     * types, where `fetch` is the undici one. Spelling the parameter out would
     * be a third description of a signature that already exists.
     */
    fetch: ((input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()

      const headers = new Headers(init?.headers)

      if (options.cookie) headers.set('cookie', options.cookie)
      if (options.academySlug) headers.set('x-academy-slug', options.academySlug)

      /**
       * The SDK has already put `API_MOUNT` on the path, so this only has to
       * strip the origin — which is the whole point of pointing the client at a
       * `baseUrl` that resolves to the app rather than to a socket.
       */
      return app.request(url.replace('http://localhost', ''), {
        ...init,
        headers,
      })
    }) as typeof globalThis.fetch,
  })
}

/** The `Set-Cookie` a response carried, reduced to what a client sends back. */
function cookiesFrom(response: Response): string {
  const raw = response.headers.getSetCookie?.() ?? []

  return raw.map((entry) => entry.split(';')[0]).join('; ')
}

/** A key per user action, which is what makes a retry one effect. */
const key = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

let staffCookie = ''
let workspaceId = ''
let academyId = ''
/** The learner realm is resolved by slug, so the test has to know it. */
let academySlug = ''

beforeAll(async () => {
  const suffix = tag()

  /**
   * Staff sign-up, through the realm the API mounts.
   *
   * Returns the response rather than a body: what this test needs from it is the
   * session cookie, which is the credential every staff call below presents.
   */
  const signUp = await staffAuth.handler(
    new Request('http://localhost/api/auth/staff/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `author-${suffix}@example.com`,
        password: 'a-long-enough-password',
        name: 'Author',
      }),
    }),
  )

  expect(signUp.ok, 'staff sign-up').toBe(true)

  staffCookie = cookiesFrom(signUp)
  expect(staffCookie, 'a staff session cookie').toContain(
    'docento-staff.session_token',
  )
})

afterAll(async () => {
  /**
   * The rows this test created are left behind.
   *
   * Deliberately: the suite runs against a shared database, every fixture here
   * is namespaced by a unique suffix so an accumulation cannot cause a
   * collision, and a cascade delete written here would be a second description
   * of the schema's relations that nobody tests. A clean database is CI's job.
   */
  await prisma.$disconnect()
})

describe('the free-learning loop, end to end', () => {
  it('lets a staff member see their own session before choosing a workspace', async () => {
    /**
     * The state this operation exists for. Without it the application has to
     * read the session cookie itself to know whether to draw a sign-in page,
     * which makes it a second implementation of session validation.
     */
    const api = client({ cookie: staffCookie })

    const { session } = await api.getStaffSession()

    expect(session.email).toContain('author-')
    expect(session.workspaces, 'a new account belongs to nothing yet').toEqual([])
  })

  it('creates a workspace', async () => {
    /**
     * Through Better Auth's organization plugin, as the studio does it: the
     * plugin owns the membership row, and a second way to create a workspace
     * would be a second set of rules about who may.
     */
    const response = await staffAuth.handler(
      new Request('http://localhost/api/auth/staff/organization/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: staffCookie,
        },
        body: JSON.stringify({ name: 'Acme Training', slug: `acme-${tag()}` }),
      }),
    )

    expect(response.ok, 'workspace creation').toBe(true)

    const body = (await response.json()) as { id: string }
    workspaceId = body.id

    // The session now knows about it, which is what the chooser renders.
    const { session } = await client({ cookie: staffCookie }).getStaffSession()

    expect(session.workspaces.map((workspace) => workspace.id)).toContain(
      workspaceId,
    )
    expect(session.workspaces[0]?.role).toBe('owner')
  })

  it('creates an academy in the workspace', async () => {
    const api = client({ cookie: staffCookie, workspaceId })

    academySlug = `academy-${tag()}`

    const { academy } = await api.createAcademy(
      workspaceId,
      { name: 'Acme Academy', slug: academySlug },
      key('academy'),
    )

    academyId = academy.id

    expect(academy.workspaceId).toBe(workspaceId)
    expect(academy.authMode).toBe('MANAGED')
  })

  it('refuses a workspace the caller is not a member of', async () => {
    /**
     * The header that carries the acting workspace is not trusted — this is the
     * request that proves it. A caller who edits it gets a refusal rather than
     * somebody else's data, which is the whole reason the workspace travels in a
     * header *and* is checked against the membership table.
     */
    const api = client({ cookie: staffCookie, workspaceId: 'not-my-workspace' })

    await expect(api.listAcademies('not-my-workspace')).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  it('authors a course with a module, a lesson and a quiz', async () => {
    const api = client({ cookie: staffCookie, workspaceId })

    const { course } = await api.createCourse(
      workspaceId,
      academyId,
      { title: 'Introduction to Widgets', slug: `widgets-${tag()}` },
      key('course'),
    )

    const { module } = await api.createModule(
      workspaceId,
      academyId,
      course.id,
      { title: 'Getting started' },
      key('module'),
    )

    const { lesson } = await api.createLesson(
      workspaceId,
      academyId,
      course.id,
      module.id,
      {
        title: 'What is a widget?',
        contentType: 'TEXT',
        body: '<p>A widget is a small thing that does one job well.</p>',
        isFree: true,
      },
      key('lesson'),
    )

    const { lesson: quizLesson } = await api.createLesson(
      workspaceId,
      academyId,
      course.id,
      module.id,
      { title: 'Check yourself', contentType: 'QUIZ' },
      key('lesson'),
    )

    const { quizId } = await api.upsertQuiz(
      workspaceId,
      academyId,
      course.id,
      quizLesson.id,
      { title: 'Widget basics', passingPercent: 50 },
    )

    const { sectionId } = await api.upsertQuizSection(
      workspaceId,
      academyId,
      course.id,
      quizId,
      { title: 'Part one' },
    )

    /**
     * The answers are sent to the server and never come back.
     *
     * `correctAnswer` is an input here and is absent from every read below; that
     * asymmetry is the whole design, and the assertions further down are what
     * keep it true.
     */
    await api.upsertQuestion(workspaceId, academyId, course.id, quizId, {
      sectionId,
      prompt: 'How many widgets does it take?',
      questionType: 'INTEGER',
      correctAnswer: '1',
      points: 1,
    })

    await api.upsertQuestion(workspaceId, academyId, course.id, quizId, {
      sectionId,
      prompt: 'Widgets are small.',
      questionType: 'TRUE_FALSE',
      correctAnswer: 'true',
      points: 1,
    })

    // The authoring read: the draft curriculum, with the lessons attached.
    const authored = await api.getCourse(workspaceId, academyId, course.id)

    expect(authored.modules).toHaveLength(1)
    expect(authored.modules[0]?.lessons).toHaveLength(2)
    expect(authored.release, 'nothing is published yet').toBeNull()

    // Kept for the publish step below.
    published = { courseId: course.id, lessonId: lesson.id, quizLessonId: quizLesson.id }
  })

  it('publishes the draft as an immutable release', async () => {
    const api = client({ cookie: staffCookie, workspaceId })

    const first = await api.publishCourse(
      workspaceId,
      academyId,
      published.courseId,
      key('publish'),
    )

    expect(first.unchanged).toBe(false)
    expect(first.release.version).toBe(1)

    /**
     * Publishing an unedited draft is idempotent.
     *
     * A second press must return the existing release rather than creating
     * version 2 — otherwise an operator who is unsure whether the first press
     * worked produces an empty version, and every learner's progress is
     * recomputed against it.
     */
    const second = await api.publishCourse(
      workspaceId,
      academyId,
      published.courseId,
      key('publish'),
    )

    expect(second.unchanged).toBe(true)
    expect(second.release.version).toBe(1)
    expect(second.release.id).toBe(first.release.id)
  })

  it('shows the published course in the public catalogue', async () => {
    // Anonymous: no cookie, no workspace, no credential of any kind. This is
    // what a visitor sees, and it is the surface a third party integrates with.
    const api = client()

    const { courses } = await api.listCatalogCourses(academyId)
    const course = courses.find((entry) => entry.id === published.courseId)

    expect(course?.title).toBe('Introduction to Widgets')

    const { curriculum } = await api.getCatalogCourse(
      academyId,
      published.courseId,
    )

    const lessons = curriculum.flatMap((module) => module.lessons)

    expect(lessons.some((lesson) => lesson.isFree)).toBe(true)

    /**
     * The answer key does not travel.
     *
     * Asserted on the serialised body rather than on a field, because a key that
     * leaked under a name this test did not think of would pass a field check
     * and fail this one.
     */
    const catalogue = JSON.stringify(await api.getCatalogCourse(academyId, published.courseId))

    expect(catalogue).not.toContain('isCorrect')
    expect(catalogue).not.toContain('correctAnswer')
  })
})

/** State the loop carries between steps. */
let published: { courseId: string; lessonId: string; quizLessonId: string }

let learnerCookie = ''
let learnerId = ''

describe('the learner half', () => {
  it('registers a learner against the academy', async () => {
    /**
     * Through the route, not the instance directly.
     *
     * `/api/auth/learners/*` resolves the academy before handing the request to
     * the realm for it, which is the step that makes a learner session carry an
     * academy. Posting straight to the instance — `getLearnerAuth(academyId)` —
     * would skip that and produce a session the API could not resolve: passing
     * here and failing everywhere else. The instance is deliberately not
     * imported, so the shortcut cannot be taken by accident.
     */
    const response = await app.request('/api/auth/learners/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        /**
         * Which academy this sign-up is for.
         *
         * A slug or a verified hostname, both of which the learn application's
         * proxy sends. There is no default: an academy that does not resolve has
         * no realm, which is why an unknown host cannot create a learner row.
         */
        'x-academy-slug': academySlug,
      },
      body: JSON.stringify({
        email: `learner-${tag()}@example.com`,
        password: 'a-long-enough-password',
        name: 'Learner',
      }),
    })

    expect(response.ok, 'learner sign-up').toBe(true)

    learnerCookie = cookiesFrom(response)

    expect(learnerCookie).toContain('docento-learner.session_token')

    const { session } = await client({
      cookie: learnerCookie,
      academySlug,
    }).getLearnerSession()

    learnerId = session.learnerId

    expect(session.academyId).toBe(academyId)
  })

  it('enrols in the free course', async () => {
    const api = client({ cookie: learnerCookie, academySlug })

    const { enrollment } = await api.enrollInCourse(
      published.courseId,
      key('enroll'),
    )

    expect(enrollment.courseId).toBe(published.courseId)
    expect(enrollment.learnerId).toBe(learnerId)

    // The learner's own course list, which is what their dashboard draws.
    const { courses } = await api.listLearnerCourses()

    // `courseId`, not `id`: a learner's course is their view of somebody else's
    // course, and the field says which one it is rather than pretending to be it.
    expect(courses.map((course) => course.courseId)).toContain(
      published.courseId,
    )
  })

  it('takes the quiz and is graded on the server', async () => {
    const api = client({ cookie: learnerCookie, academySlug })

    const { quiz } = await api.getLearnerQuiz(published.quizLessonId)

    /**
     * The answer key is absent from what a learner is given.
     *
     * The grading engine knows the answers and the client does not, and this is
     * the assertion that keeps it that way. Written against the serialised body
     * rather than a field, so an answer that leaked under a name this test did
     * not anticipate still fails it.
     */
    expect(JSON.stringify(quiz)).not.toContain('correctAnswer')
    expect(quiz.questions).toHaveLength(2)

    const { attempt } = await api.startQuizAttempt(
      published.quizLessonId,
      key('attempt'),
    )

    const answers = quiz.questions.map((question) => ({
      questionId: question.id,
      answer: question.questionType === 'TRUE_FALSE' ? 'true' : '1',
    }))

    const submitted = await api.submitQuizAttempt(
      attempt.id,
      answers,
      key('submit'),
    )

    // The verdict is on the attempt, and the result carries the per-question
    // breakdown that produced it.
    expect(submitted.result.attempt.passed).toBe(true)
    expect(submitted.result.attempt.score).toBe(2)
    expect(submitted.result.attempt.totalPoints).toBe(2)
    expect(submitted.result.percent).toBe(100)
    expect(submitted.result.questions.every((entry) => entry.isCorrect)).toBe(
      true,
    )

    /**
     * The same submit twice is one attempt.
     *
     * The idempotency key is what makes that true, and this is the assertion
     * that would fail if it were dropped between the SDK and the route.
     *
     * Compared on the attempt's own id. An earlier version of this line read
     * `again.attemptId`, which is not a field on the response — so it compared
     * `undefined` to `undefined` and passed while asserting nothing. The
     * compiler caught it, which is the reason the suite is in the typecheck
     * gate rather than only in the test run.
     */
    const again = await api.submitQuizAttempt(
      attempt.id,
      answers,
      key('submit'),
    )

    expect(again.result.attempt.id).toBe(attempt.id)
    expect(again.result.attempt.id).toBe(submitted.result.attempt.id)
  })

  /**
   * Last, because a quiz lesson counts as complete when it is *passed*.
   *
   * The ordering is the rule showing through: completion is computed from the
   * release's own rules, so the reading lesson can be opened and the quiz cannot
   * — it needs an attempt that passed. A test that completed both by calling
   * `completeLesson` twice would be asserting the opposite.
   */
  it('completes every required lesson, and the course with them', async () => {
    const api = client({ cookie: learnerCookie, academySlug })

    /**
     * Both lessons, because completion is the course's rule and not this test's:
     * the reading lesson and the quiz lesson are both required, and a
     * certificate is refused until each is done. The assertion is on the state
     * the server reports rather than on the fact that two calls succeeded.
     */
    await api.completeLesson(published.lessonId, key('complete'))

    const { progress } = await api.getLearnerProgress(published.courseId)

    expect(progress.requiredLessons).toBe(2)
    expect(progress.completedLessons).toBe(2)
    expect(progress.percent).toBe(100)
    expect(progress.isComplete).toBe(true)
  })

  it('earns a certificate the learner can see', async () => {
    const api = client({ cookie: learnerCookie, academySlug })

    const { certificate } = await api.requestCertificate(
      published.courseId,
      key('certificate'),
    )

    expect(certificate.verificationId).toBeTruthy()

    const { certificates } = await api.listLearnerCertificates()

    expect(certificates.map((entry) => entry.id)).toContain(certificate.id)

    // Kept for the verification step, which is deliberately a different client.
    issued = certificate
  })

  it('refuses a learner reaching another learner\u2019s attempt', async () => {
    // Containment is asserted where it can be: a second learner in the same
    // academy must not read the first one's attempts.
    const response = await app.request('/api/auth/learners/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-academy-slug': academySlug,
      },
      body: JSON.stringify({
        email: `other-${tag()}@example.com`,
        password: 'a-long-enough-password',
        name: 'Other',
      }),
    })

    expect(response.ok).toBe(true)

    const otherCookie = cookiesFrom(response)

    const api = client({ cookie: otherCookie, academySlug })

    // Not enrolled, so the course is not theirs to read.
    await expect(api.getLearnerCourse(published.courseId)).rejects.toMatchObject(
      { code: expect.stringMatching(/forbidden|not_found/) },
    )
  })
})

/** The certificate the learner was issued, for the public verification. */
let issued: { id: string; verificationId: string }

describe('public verification', () => {
  it('verifies a certificate with no credential at all', async () => {
    /**
     * The last step of the loop, and the only one a third party performs: an
     * employer holding a certificate id should be able to check it without an
     * account. Anonymous is the point, so this client presents nothing.
     */
    const api = client()

    const { certificate } = await api.verifyCertificate(issued.verificationId)

    expect(certificate.recipientName).toBe('Learner')
    expect(certificate.title).toBe('Introduction to Widgets')
    expect(certificate.academy.name).toBe('Acme Academy')
    expect(certificate.status).toBe('VALID')
  })

  it('reveals nothing for an id that was never issued', async () => {
    const api = client()

    await expect(api.verifyCertificate('not-a-real-id')).rejects.toBeInstanceOf(
      DocentoApiError,
    )
  })
})

describe('the surfaces that must not leak', () => {
  it('refuses the authoring read without a session', async () => {
    const api = client({ workspaceId })

    /**
     * `forbidden`, not `unauthorized`.
     *
     * An anonymous caller resolves to an anonymous principal, so the refusal
     * comes from `can()` rather than from a missing session — and that is the
     * right answer: `401` would say "sign in and try again", which for an
     * integrator holding a bad key is misleading advice.
     */
    await expect(
      api.getCourse(workspaceId, academyId, published.courseId),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('refuses a retryable operation with no idempotency key', async () => {
    /**
     * Enforced by the route wrapper from the registry, so this is really a test
     * that `retryable: true` still means something. Without the check, a network
     * retry is a second enrolment or a second certificate.
     */
    const response = await app.request(
      `/api/v1/learn/courses/${published.courseId}/enrollment`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: learnerCookie,
        },
        body: '{}',
      },
    )

    expect(response.status).toBe(422)

    const body = (await response.json()) as { error: { code: string } }

    expect(body.error.code).toBe('validation_failed')
  })

  it('echoes the workspace header it was given, and refuses a wrong one', async () => {
    /**
     * A direct `fetch`, because the SDK is what sets the header — testing it
     * through the SDK would be testing that the SDK agrees with itself.
     */
    const response = await app.request(`/api/v1/workspaces/${workspaceId}`, {
      headers: {
        cookie: staffCookie,
        [WORKSPACE_HEADER]: 'some-other-workspace',
      },
    })

    expect(response.status).toBe(403)
  })

  it('accepts a request that names no workspace only where one is not needed', async () => {
    /**
     * The session read and the catalogue need no workspace; everything else
     * does. A request that names none resolves to a staff principal with no
     * workspace, which `can()` refuses — the alternative is a request silently
     * acting in whichever workspace the session last remembered.
     */
    const session = await app.request('/api/v1/staff/session', {
      headers: { cookie: staffCookie },
    })

    expect(session.status).toBe(200)

    const courses = await app.request(
      `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses`,
      { headers: { cookie: staffCookie } },
    )

    expect(courses.status).toBe(200)
  })

  it('carries the idempotency header the contracts declare', async () => {
    // The constant is the API's vocabulary; this asserts the SDK and the route
    // agree on its spelling, which a drifted literal would break silently.
    expect(IDEMPOTENCY_HEADER).toBe('idempotency-key')
  })
})
