import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '@docento/domain'

import { createApp } from '../app.js'

/**
 * Authoring reads, over HTTP.
 *
 * ## What this covers that the domain tests cannot
 *
 * The point of `quiz.get` is the answer key: it is the one response in the API
 * that returns one, and everything else is arranged so that none does. A domain
 * test can assert the function returns the key; only a route test can assert
 * that the *learner* route for the same quiz still does not, which is the
 * property that matters and the one a mistaken refactor would break.
 *
 * `assignment.get` is milder — its write is keyed by `lessonId`, so an editor
 * works without it — but it is what stops a form resetting the brief it did not
 * read back.
 *
 * ## Why the fixtures are written directly
 *
 * A staff session is real (the routes need one), and everything below it is a
 * row: this file is about two reads, and building the whole authoring flow
 * through the API first would test that flow a fourth time and hide which
 * assertion failed behind twenty lines of setup.
 */

const app = createApp()

const tag = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

function cookiesFrom(response: Response): string {
  return (response.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(';')[0])
    .join('; ')
}

/**
 * Assert a request succeeded, reading the body only when it did not.
 *
 * `expect(response.ok, await response.text())` reads the body to build the
 * failure message and then leaves it unreadable for the `json()` call that
 * follows — which fails as "Body is unusable" whether or not the request
 * worked, hiding the real error behind a second one.
 */
async function expectOk(response: Response, what: string): Promise<void> {
  if (response.ok) return

  throw new Error(`${what} failed: ${response.status} ${await response.text()}`)
}

let staffCookie = ''
let otherStaffCookie = ''
let workspaceId = ''
let academyId = ''
let courseId = ''
let lessonId = ''
let quizId = ''
let answeredQuestionId = ''
let plainQuestionId = ''

beforeAll(async () => {
  const suffix = tag()

  const signUp = async (label: string) => {
    const response = await app.request('/api/auth/staff/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `author-read-${label}-${suffix}@example.com`,
        password: 'a-long-enough-password',
        name: label,
      }),
    })

    await expectOk(response, `staff sign-up (${label})`)

    return { cookie: cookiesFrom(response), userId: '' }
  }

  const owner = await signUp('owner')
  staffCookie = owner.cookie

  const other = await signUp('other')
  otherStaffCookie = other.cookie

  /** The owner's workspace and academy, through the routes they exist on. */
  const workspace = await app.request(
    '/api/auth/staff/organization/create',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: staffCookie },
      body: JSON.stringify({ name: 'Authoring', slug: `authoring-${tag()}` }),
    },
  )

  await expectOk(workspace, 'workspace creation')
  workspaceId = ((await workspace.json()) as { id: string }).id

  const academy = await app.request(
    `/api/v1/workspaces/${workspaceId}/academies`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: staffCookie,
        'x-workspace-id': workspaceId,
        'idempotency-key': `academy-${tag()}`,
      },
      body: JSON.stringify({
        name: 'Academy',
        slug: `authoring-academy-${tag()}`,
      }),
    },
  )

  await expectOk(academy, 'academy creation')
  academyId = ((await academy.json()) as { data: { academy: { id: string } } })
    .data.academy.id

  const course = await app.request(
    `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: staffCookie,
        'x-workspace-id': workspaceId,
        'idempotency-key': `course-${tag()}`,
      },
      body: JSON.stringify({
        title: 'Assessment course',
        slug: `assessment-${tag()}`,
      }),
    },
  )

  await expectOk(course, 'course creation')
  courseId = ((await course.json()) as { data: { course: { id: string } } }).data
    .course.id

  const module = await app.request(
    `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/modules`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: staffCookie,
        'x-workspace-id': workspaceId,
        'idempotency-key': `module-${tag()}`,
      },
      body: JSON.stringify({ title: 'Module' }),
    },
  )

  await expectOk(module, 'module creation')
  const moduleId = ((await module.json()) as { data: { module: { id: string } } })
    .data.module.id

  const lesson = await app.request(
    `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/modules/${moduleId}/lessons`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: staffCookie,
        'x-workspace-id': workspaceId,
        'idempotency-key': `lesson-${tag()}`,
      },
      body: JSON.stringify({
        title: 'Quiz lesson',
        contentType: 'QUIZ',
      }),
    },
  )

  await expectOk(lesson, 'lesson creation')
  lessonId = ((await lesson.json()) as { data: { lesson: { id: string } } }).data
    .lesson.id

  const quiz = await app.request(
    `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/lessons/${lessonId}/quiz`,
    {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie: staffCookie,
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify({
        title: 'Widgets',
        passingPercent: 60,
        timeLimitMinutes: 30,
        negativeMarking: true,
      }),
    },
  )

  await expectOk(quiz, 'quiz creation')
  quizId = ((await quiz.json()) as { data: { quizId: string } }).data.quizId

  /** Two questions, so deletion can be proved by the count changing. */
  const addQuestion = async (prompt: string, answer: string) => {
    const response = await app.request(
      `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/quizzes/${quizId}/questions`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: staffCookie,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          prompt,
          questionType: 'INTEGER',
          correctAnswer: answer,
          points: 2,
        }),
      },
    )

    await expectOk(response, `question ${prompt}`)

    return ((await response.json()) as { data: { questionId: string } }).data
      .questionId
  }

  answeredQuestionId = await addQuestion('How many?', '7')
  plainQuestionId = await addQuestion('And how many now?', '8')

  /**
   * An answer to the first question, written directly.
   *
   * The rule under test is "refuse to delete a question somebody has answered",
   * and this is the row that makes that true. Driving a whole enrolment and
   * attempt submission to produce it would test the enrolment path again and
   * make the failure harder to read.
   */
  const learner = await prisma.learner.create({
    data: {
      // No default: the learner realm assigns this id at sign-up.
      id: `learner-answered-${tag()}`,
      academyId,
      email: `answered-${tag()}@example.com`,
      name: 'Answered',
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      learnerId: learner.id,
      attemptNumber: 1,
      gradingSnapshot: { questions: [] },
    },
    select: { id: true },
  })

  await prisma.quizAnswer.create({
    data: {
      attemptId: attempt.id,
      questionId: answeredQuestionId,
      answer: '7',
      isCorrect: true,
      pointsEarned: 2,
    },
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

/** A request as the owner, with the workspace header the API requires. */
function asOwner(path: string, init: RequestInit = {}) {
  return app.request(path, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      cookie: staffCookie,
      'x-workspace-id': workspaceId,
    },
  })
}

const quizPath = () =>
  `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/lessons/${lessonId}/quiz`

describe('reading a quiz to edit it', () => {
  it('returns the quiz with its answer keys and settings', async () => {
    const response = await asOwner(quizPath())

    expect(response.status).toBe(200)

    const { data } = (await response.json()) as {
      data: { quiz: { id: string; passingPercent: number; timeLimitMinutes: number; negativeMarking: boolean; questions: { id: string; correctAnswer: string; points: number }[] } }
    }

    expect(data.quiz.id).toBe(quizId)

    /**
     * Every setting that could be written, read back.
     *
     * An edit form that can only write resets whatever it did not read, so the
     * assertion is not "the quiz comes back" but "the fields the form needs are
     * all here".
     */
    expect(data.quiz.passingPercent).toBe(60)
    expect(data.quiz.timeLimitMinutes).toBe(30)
    expect(data.quiz.negativeMarking).toBe(true)

    expect(data.quiz.questions).toHaveLength(2)

    /**
     * The key, which is the entire reason this operation exists.
     *
     * Without it an author cannot see what they wrote, and an editor can only
     * append and blind-overwrite by id.
     */
    const keys = data.quiz.questions.map((question) => question.correctAnswer).sort()

    expect(keys).toEqual(['7', '8'])
  })

  it('is the only projection that carries a key', async () => {
    /**
     * The counterpart assertion, and the one that would catch a careless
     * refactor: the same quiz, read by a learner, must not contain the key.
     *
     * Asserted against the serialised body rather than a field name, so a key
     * that leaked under a name this test did not think of still fails it.
     */
    const learnerPath = `/api/v1/learn/lessons/${lessonId}/quiz`

    const response = await app.request(learnerPath)

    // Anonymous is refused, so the body is not a quiz at all — which is itself
    // the point: there is no route by which a caller without a session reads
    // this quiz, key or no key.
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(await response.text()).not.toContain('correctAnswer')
  })

  it('answers with a null quiz rather than a 404 when there is none', async () => {
    /**
     * A separate lesson, so the quiz already built above is untouched.
     */
    const plainLesson = await prisma.lesson.create({
      data: {
        moduleId: (
          await prisma.module.findFirstOrThrow({
            where: { courseId },
            select: { id: true },
          })
        ).id,
        title: 'No quiz yet',
        contentType: 'QUIZ',
        position: 99,
      },
      select: { id: true },
    })

    const response = await asOwner(
      `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/lessons/${plainLesson.id}/quiz`,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: { quiz: null } })
  })

  it('refuses a caller who is not a member of the workspace', async () => {
    const response = await app.request(quizPath(), {
      headers: { cookie: otherStaffCookie, 'x-workspace-id': workspaceId },
    })

    expect(response.status).toBe(403)
  })

  it('refuses an anonymous caller', async () => {
    const response = await app.request(quizPath())

    expect(response.status).toBe(403)
  })
})

describe('deleting a question', () => {
  it('removes a question nobody has answered', async () => {
    const before = await asOwner(quizPath())

    const beforeCount = (
      (await before.json()) as { data: { quiz: { questions: unknown[] } } }
    ).data.quiz.questions.length

    const response = await asOwner(
      `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/quizzes/${quizId}/questions/${plainQuestionId}`,
      { method: 'DELETE' },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: { ok: true } })

    const after = await asOwner(quizPath())

    const afterCount = (
      (await after.json()) as { data: { quiz: { questions: unknown[] } } }
    ).data.quiz.questions.length

    /**
     * A count rather than a status, because the interesting failure is a delete
     * that reports success and removes nothing.
     */
    expect(afterCount).toBe(beforeCount - 1)
  })

  it('refuses once a learner has answered, and says why', async () => {
    /**
     * `QuizAnswer.questionId` cascades. Deleting this question would remove the
     * answer from a graded attempt, so the attempt would keep its score while
     * losing the breakdown that produced it — and a gradebook would show a
     * submission graded against fewer questions than it had.
     */
    const response = await asOwner(
      `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/quizzes/${quizId}/questions/${answeredQuestionId}`,
      { method: 'DELETE' },
    )

    expect(response.status).toBe(409)

    const body = (await response.json()) as { error: { message: string } }

    // The message has to tell the author what to do instead, because "delete" is
    // not the only way to stop asking a question.
    expect(body.error.message).toMatch(/edit it instead/i)

    // And the question is still there.
    const quiz = await asOwner(quizPath())

    const ids = (
      (await quiz.json()) as { data: { quiz: { questions: { id: string }[] } } }
    ).data.quiz.questions.map((question) => question.id)

    expect(ids).toContain(answeredQuestionId)
  })
})

describe('reading and writing an assignment', () => {
  const assignmentPath = () =>
    `/api/v1/workspaces/${workspaceId}/academies/${academyId}/courses/${courseId}/lessons/${lessonId}/assignment`

  it('is null before the brief exists', async () => {
    const response = await asOwner(assignmentPath())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: { assignment: null },
    })
  })

  it('round-trips the brief, the due date and the points', async () => {
    const dueAt = '2026-06-01T09:00:00.000Z'

    const written = await asOwner(assignmentPath(), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Write a widget',
        instructions: 'Two pages, no more.',
        dueAt,
        totalPoints: 40,
      }),
    })

    expect(written.status).toBe(200)

    const read = await asOwner(assignmentPath())

    expect(read.status).toBe(200)

    /**
     * Through the envelope: `data` wraps the payload, and destructuring
     * `assignment` from the top level yields `undefined` rather than failing —
     * which is how the first version of this test asserted nothing.
     */
    const { data } = (await read.json()) as {
      data: {
        assignment: {
          title: string
          instructions: string | null
          dueAt: string | null
          totalPoints: number
          submissionCount: number
          gradedCount: number
        } | null
      }
    }

    const assignment = data.assignment

    expect(assignment, 'the brief was written').not.toBeNull()

    expect(assignment?.title).toBe('Write a widget')
    expect(assignment?.instructions).toBe('Two pages, no more.')
    expect(assignment?.dueAt).toBe(dueAt)
    expect(assignment?.totalPoints).toBe(40)

    // The counts an author asks about right after editing the brief.
    expect(assignment?.submissionCount).toBe(0)
    expect(assignment?.gradedCount).toBe(0)
  })

  it('refuses a caller who is not a member of the workspace', async () => {
    const response = await app.request(assignmentPath(), {
      headers: { cookie: otherStaffCookie, 'x-workspace-id': workspaceId },
    })

    expect(response.status).toBe(403)
  })
})
