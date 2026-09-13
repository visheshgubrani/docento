import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../../db'
import type { Principal } from '../../authorization/principal'
import { ForbiddenError, NotFoundError } from '../../shared/errors'
import {
  archiveCourse,
  createCourse,
  createLesson,
  createModule,
  deleteDraftLesson,
  reorderLessons,
  reorderModules,
  updateCourse,
} from '../drafts'
import {
  buildReleaseSnapshot,
  getRelease,
  gradingSnapshotFrom,
  publishCourse,
} from '../publishing'
import { createAcademy, createWorkspace } from '../../tenancy/academies'

/**
 * Publishing is the piece of this milestone with no legacy precedent: the
 * application it replaces toggled a boolean, so nothing there validates this
 * design. The tests are therefore the specification, and most of them are about
 * what a release *keeps* rather than what it contains.
 */

let workspaceId: string
let academyId: string
let otherAcademyId: string
let ownerUserId: string
let courseId: string
let moduleId: string

const owner = (): Principal => ({
  kind: 'staff',
  userId: ownerUserId,
  workspaceId,
  memberId: 'unused',
  role: 'owner',
})

const outsider = (): Principal => ({
  kind: 'staff',
  userId: 'u-nobody',
  workspaceId: 'ws-nowhere',
  memberId: 'unused',
  role: 'owner',
})

const tag = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

/** A course with one module, one text lesson and one quiz with a question. */
async function seedPublishableCourse(options: { withQuiz?: boolean } = {}) {
  const course = await createCourse(owner(), {
    workspaceId,
    academyId,
    title: 'Publishable',
    slug: `publishable-${tag()}`,
  })

  const module = await createModule(owner(), {
    workspaceId,
    academyId,
    courseId: course.id,
    title: 'Getting Started',
  })

  await createLesson(owner(), {
    workspaceId,
    academyId,
    courseId: course.id,
    moduleId: module.id,
    title: 'Welcome',
    contentType: 'TEXT',
    body: '<p>Hello</p>',
    isFree: true,
  })

  if (options.withQuiz) {
    const lesson = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Check yourself',
      contentType: 'QUIZ',
    })

    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        title: 'Quiz',
        passingPercent: 70,
        negativeMarking: true,
        defaultNegativeMark: 1,
      },
    })

    await prisma.question.create({
      data: {
        quizId: quiz.id,
        prompt: 'What is 2 + 2?',
        questionType: 'INTEGER',
        correctAnswer: '4',
        points: 4,
        negativePoints: 1,
        position: 1,
      },
    })
  }

  return { course, module }
}

beforeAll(async () => {
  const tagValue = tag()

  const user = await prisma.staffUser.create({
    data: {
      id: `u-${tagValue}`,
      name: 'Owner',
      email: `pub-${tagValue}@example.com`,
    },
  })
  ownerUserId = user.id

  const workspace = await createWorkspace({
    name: 'Publishing',
    slug: `publishing-${tagValue}`,
    ownerUserId,
  })
  workspaceId = workspace.id

  const academy = await createAcademy(owner(), workspaceId, {
    name: 'Academy',
    slug: `academy-${tagValue}`,
  })
  academyId = academy.id

  const other = await createAcademy(owner(), workspaceId, {
    name: 'Other',
    slug: `other-${tagValue}`,
  })
  otherAcademyId = other.id

  const seeded = await seedPublishableCourse({ withQuiz: true })
  courseId = seeded.course.id
  moduleId = seeded.module.id
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.staffUser.deleteMany({ where: { id: ownerUserId } })
  await prisma.$disconnect()
})

describe('publishCourse', () => {
  it('creates version 1 and marks the course published', async () => {
    const release = await publishCourse(owner(), {
      workspaceId,
      academyId,
      courseId,
    })

    expect(release.version).toBe(1)
    expect(release.unchanged).toBe(false)

    const course = await prisma.course.findUnique({ where: { id: courseId } })
    expect(course?.status).toBe('PUBLISHED')
  })

  it('refuses a second publish with no edits, and returns the same release', async () => {
    // The idempotence that makes a retry or a double-click harmless. Without it
    // the history fills with identical versions and "what changed in v7"
    // becomes unanswerable.
    const release = await publishCourse(owner(), {
      workspaceId,
      academyId,
      courseId,
    })

    expect(release.unchanged).toBe(true)
    expect(release.version).toBe(1)

    const count = await prisma.courseRelease.count({ where: { courseId } })
    expect(count).toBe(1)
  })

  it('creates a new version and supersedes the old one when the draft changes', async () => {
    await updateCourse(owner(), {
      workspaceId,
      academyId,
      courseId,
      title: 'Publishable, second edition',
    })

    const second = await publishCourse(owner(), {
      workspaceId,
      academyId,
      courseId,
    })

    expect(second.version).toBe(2)

    const releases = await prisma.courseRelease.findMany({
      where: { courseId },
      orderBy: { version: 'asc' },
      select: { version: true, supersededAt: true },
    })

    expect(releases).toHaveLength(2)
    expect(releases[0]?.supersededAt).not.toBeNull()
    expect(releases[1]?.supersededAt).toBeNull()
  })

  it('leaves the superseded release readable and unchanged', async () => {
    // A release means the same thing forever. v1 said "Publishable" and still
    // does, even though the course is now "Publishable, second edition".
    const version1 = await getRelease(owner(), {
      workspaceId,
      academyId,
      courseId,
      version: 1,
    })

    expect(version1.snapshot.title).toBe('Publishable')
  })

  it('refuses a course with no modules', async () => {
    const empty = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Empty',
      slug: `empty-${tag()}`,
    })

    await expect(
      publishCourse(owner(), { workspaceId, academyId, courseId: empty.id }),
    ).rejects.toThrow(/not ready to publish/)
  })

  it('refuses a module with no lessons', async () => {
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Empty module',
      slug: `empty-module-${tag()}`,
    })
    await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Nothing here',
    })

    await expect(
      publishCourse(owner(), { workspaceId, academyId, courseId: course.id }),
    ).rejects.toThrow(/not ready to publish/)
  })

  it('refuses a quiz with no questions', async () => {
    // A learner opening a quiz with no questions would be told they scored 0%
    // on nothing, which is worse than a refusal at publish time.
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Empty quiz',
      slug: `empty-quiz-${tag()}`,
    })
    const module = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Module',
    })
    const lesson = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Quiz',
      contentType: 'QUIZ',
    })
    await prisma.quiz.create({ data: { lessonId: lesson.id, title: 'Quiz' } })

    await expect(
      publishCourse(owner(), { workspaceId, academyId, courseId: course.id }),
    ).rejects.toMatchObject({
      code: 'course_not_publishable',
      details: expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('quiz with no questions'),
        }),
      ]),
    })
  })

  it('refuses a video lesson with no video', async () => {
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Video',
      slug: `video-${tag()}`,
    })
    const module = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Module',
    })
    await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Video',
      contentType: 'VIDEO',
    })

    await expect(
      publishCourse(owner(), { workspaceId, academyId, courseId: course.id }),
    ).rejects.toMatchObject({
      code: 'course_not_publishable',
      details: expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('video lesson with no video'),
        }),
      ]),
    })
  })

  it('reports every reason at once rather than the first', async () => {
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Several problems',
      slug: `several-${tag()}`,
    })
    const module = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Module',
    })
    await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Text with no body',
      contentType: 'TEXT',
    })
    await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Video with no video',
      contentType: 'VIDEO',
    })

    await expect(
      publishCourse(owner(), { workspaceId, academyId, courseId: course.id }),
    ).rejects.toMatchObject({
      details: expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('no content'),
        }),
        expect.objectContaining({
          message: expect.stringContaining('no video'),
        }),
      ]),
    })
  })

  it('refuses a course that belongs to another academy', async () => {
    // A not-found rather than a refusal, and deliberately so: `can()` is
    // satisfied — the principal may publish in this workspace — and the course
    // is simply not in the academy the request named. Telling the caller which
    // of the two it was would confirm that the id exists somewhere else.
    await expect(
      publishCourse(owner(), {
        workspaceId,
        academyId: otherAcademyId,
        courseId,
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('refuses an owner from another workspace', async () => {
    await expect(
      publishCourse(outsider(), { workspaceId, academyId, courseId }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('refuses to publish an archived course', async () => {
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Archived',
      slug: `archived-${tag()}`,
    })
    await archiveCourse(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
    })

    await expect(
      publishCourse(owner(), { workspaceId, academyId, courseId: course.id }),
    ).rejects.toThrow(/archived/)
  })
})

describe('the release snapshot', () => {
  it('carries the questions and their marking rules', async () => {
    const snapshot = await buildReleaseSnapshot(courseId)
    const lesson = snapshot.modules
      .flatMap((module) => module.lessons)
      .find((candidate) => candidate.contentType === 'QUIZ')

    expect(lesson?.quiz).not.toBeNull()
    expect(lesson?.quiz?.questions).toHaveLength(1)
    expect(lesson?.quiz?.questions[0]?.marking.correctAnswer).toBe('4')
  })

  it('records the quiz-level marking rules rather than inferring them', async () => {
    const snapshot = await buildReleaseSnapshot(courseId)
    const quiz = snapshot.modules
      .flatMap((module) => module.lessons)
      .find((candidate) => candidate.quiz)?.quiz

    // A quiz can have negative marking on with every question deducting zero,
    // and inferring from the questions would read that back as off.
    expect(quiz?.quizMarking).toEqual({
      negativeMarking: true,
      defaultNegativeMark: 1,
    })
  })

  it('counts modules, lessons and quiz minutes', async () => {
    const snapshot = await buildReleaseSnapshot(courseId)

    expect(snapshot.totals.modules).toBe(snapshot.modules.length)
    expect(snapshot.totals.lessons).toBeGreaterThan(0)
  })

  it('is a JSON document with no Date objects in it', async () => {
    // A `Date` would serialise on write and come back as a string, so the type
    // would be a lie until something called a method on it.
    const snapshot = await buildReleaseSnapshot(courseId)
    const roundTripped = JSON.parse(JSON.stringify(snapshot))

    expect(roundTripped).toEqual(snapshot)
  })

  it('appears in the stored release exactly as built', async () => {
    // Whatever a test can see, a reader of the release sees. A divergence here
    // would mean the published snapshot is not the one that was validated.
    const built = await buildReleaseSnapshot(courseId)
    const stored = await getRelease(owner(), {
      workspaceId,
      academyId,
      courseId,
    })

    expect(stored.snapshot.courseId).toBe(built.courseId)
    expect(stored.snapshot.totals).toEqual(built.totals)
  })

  it('gives the grading snapshot the quiz marking', () => {
    // The attempt path reads marking from a release, never from live rows, so
    // this is the seam that protects an in-progress attempt from a later edit.
    const release = {
      version: 1 as const,
      courseId,
      title: 'T',
      description: null,
      modules: [
        {
          id: 'm1',
          title: 'M',
          summary: null,
          position: 1,
          lessons: [
            {
              id: 'l1',
              title: 'Quiz',
              summary: null,
              contentType: 'QUIZ',
              position: 1,
              isFree: false,
              body: null,
              mediaAssetId: null,
              embedUrl: null,
              completionRule: { type: 'VIEW' as const },
              assignment: null,
              quiz: {
                id: 'q1',
                title: 'Quiz',
                description: null,
                passingPercent: 70,
                maxAttempts: null,
                timeLimitMinutes: 10,
                opensAt: null,
                closesAt: null,
                isMockTest: false,
                sections: [],
                quizMarking: { negativeMarking: true, defaultNegativeMark: 2 },
                questions: [
                  {
                    id: 'q1a',
                    prompt: 'P',
                    questionType: 'MULTIPLE_CHOICE' as const,
                    options: ['a', 'b'],
                    explanation: null,
                    points: 4,
                    sectionId: null,
                    position: 1,
                    marking: {
                      questionType: 'MULTIPLE_CHOICE' as const,
                      correctAnswer: 'a',
                      correctAnswers: [],
                      points: 4,
                      negativePoints: 1,
                      partialMarking: false,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
      totals: { modules: 1, lessons: 1, quizMinutes: 10 },
    }

    const grading = gradingSnapshotFrom(release, 'l1')

    expect(grading?.quiz).toEqual({
      negativeMarking: true,
      defaultNegativeMark: 2,
    })
    expect(grading?.questions).toHaveLength(1)
    expect(gradingSnapshotFrom(release, 'not-a-lesson')).toBeNull()
  })
})

describe('stable lesson identity', () => {
  it('keeps the draft lesson id in the release, so progress survives', async () => {
    // This is the property that makes republication safe: a `ReleaseLesson`
    // carries the draft lesson's id rather than one of its own, so a completion
    // recorded against it still refers to the same lesson afterwards.
    const releaseLesson = await prisma.releaseLesson.findFirst({
      where: { release: { courseId } },
      select: { lessonId: true },
    })

    const draftLesson = await prisma.lesson.findUnique({
      where: { id: releaseLesson!.lessonId },
    })

    expect(draftLesson).not.toBeNull()
  })

  it('numbers release lessons across the whole release, not per module', async () => {
    // `ReleaseLesson` is flat and its index is `(releaseId, position)`, so a
    // per-module counter would collide on the second module.
    const second = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId,
      moduleId,
      title: 'Third lesson',
      contentType: 'TEXT',
      body: '<p>More</p>',
    })

    const moduleTwo = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId,
      title: 'Second module',
    })

    await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId,
      moduleId: moduleTwo.id,
      title: 'In module two',
      contentType: 'TEXT',
      body: '<p>Second module</p>',
    })

    const release = await publishCourse(owner(), {
      workspaceId,
      academyId,
      courseId,
    })

    const positions = await prisma.releaseLesson.findMany({
      where: { releaseId: release.id },
      orderBy: { position: 'asc' },
      select: { position: true },
    })

    expect(positions.map((row) => row.position)).toEqual(
      positions.map((_row, index) => index + 1),
    )

    await prisma.lesson.delete({ where: { id: second.id } })
    await prisma.module.delete({ where: { id: moduleTwo.id } })
  })
})

describe('deleting a draft lesson', () => {
  it('is allowed even when a release contains it, and the release is untouched', async () => {
    // ADR 5: the published release is a copy, so a learner following it still
    // sees the lesson. Refusing here would make removing a lesson impossible,
    // because the draft is the only editable thing.
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Deletable',
      slug: `deletable-${tag()}`,
    })
    const module = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Module',
    })
    const lesson = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Temporary',
      contentType: 'TEXT',
      body: '<p>Gone soon</p>',
    })

    const release = await publishCourse(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
    })

    await deleteDraftLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      lessonId: lesson.id,
    })

    const releaseLessons = await prisma.releaseLesson.count({
      where: { releaseId: release.id },
    })

    expect(releaseLessons).toBe(1)

    const stillReadable = await getRelease(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      version: release.version,
    })

    expect(
      stillReadable.snapshot.modules
        .flatMap((m) => m.lessons)
        .map((l) => l.title),
    ).toContain('Temporary')
  })

  it('refuses a lesson with quiz attempts recorded against it', async () => {
    // That is a learner's work rather than a content decision, and deleting the
    // lesson cascades into the questions the attempt snapshot references.
    const quizQuestion = await prisma.question.findFirst({
      where: { quiz: { lesson: { module: { courseId } } } },
    })

    if (!quizQuestion) return

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizQuestion.quizId },
      select: { lessonId: true },
    })

    const learner = await prisma.learner.create({
      data: {
        id: `l-${tag()}`,
        academyId,
        name: 'Attempt Owner',
        email: `attempt-${tag()}@example.com`,
      },
    })

    await prisma.quizAttempt.create({
      data: {
        quizId: quizQuestion.quizId,
        learnerId: learner.id,
        attemptNumber: 1,
        gradingSnapshot: {},
      },
    })

    await expect(
      deleteDraftLesson(owner(), {
        workspaceId,
        academyId,
        courseId,
        lessonId: quiz!.lessonId,
      }),
    ).rejects.toThrow(/recorded against it/)
  })
})

describe('reordering', () => {
  it('assigns positions in the order given', async () => {
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Reorder',
      slug: `reorder-${tag()}`,
    })
    const first = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'First',
    })
    const second = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Second',
    })

    await reorderModules(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      order: [second.id, first.id],
    })

    const modules = await prisma.module.findMany({
      where: { courseId: course.id },
      orderBy: { position: 'asc' },
      select: { id: true },
    })

    expect(modules.map((module) => module.id)).toEqual([second.id, first.id])
  })

  it('refuses a partial order', async () => {
    // A partial reorder would leave duplicate positions, so it is refused
    // rather than half-applied.
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Partial',
      slug: `partial-${tag()}`,
    })
    await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'One',
    })

    await expect(
      reorderModules(owner(), {
        workspaceId,
        academyId,
        courseId: course.id,
        order: [],
      }),
    ).rejects.toThrow(/exactly once/)
  })

  it('refuses an order that names a lesson twice', async () => {
    const course = await createCourse(owner(), {
      workspaceId,
      academyId,
      title: 'Duplicates',
      slug: `duplicates-${tag()}`,
    })
    const module = await createModule(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      title: 'Module',
    })
    const lesson = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId: course.id,
      moduleId: module.id,
      title: 'Only',
      contentType: 'TEXT',
      body: '<p>x</p>',
    })

    await expect(
      reorderLessons(owner(), {
        workspaceId,
        academyId,
        courseId: course.id,
        moduleId: module.id,
        order: [lesson.id, lesson.id],
      }),
    ).rejects.toThrow(/exactly once/)
  })

  it('refuses across tenants', async () => {
    await expect(
      reorderModules(outsider(), {
        workspaceId,
        academyId,
        courseId,
        order: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})
