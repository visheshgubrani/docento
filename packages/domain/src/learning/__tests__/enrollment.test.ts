import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../../db'
import type { Principal } from '../../authorization/principal'
import { ForbiddenError, NotFoundError } from '../../shared/errors'
import { createAcademy, createWorkspace } from '../../tenancy/academies'
import { createCourse, createLesson, createModule } from '../../content/drafts'
import { publishCourse } from '../../content/publishing'
import {
  completeLesson,
  enroll,
  getCourseForLearner,
  getCourseProgress,
  grantAccess,
  hasAccess,
  listLearnerCourses,
  recordProgress,
  revokeAccess,
} from '../enrollment'
import {
  getCertificate,
  issueCertificate,
  listLearnerCertificates,
  revokeCertificate,
  verifyCertificate,
} from '../certificates'

/**
 * The learner half of the free loop.
 *
 * These tests are mostly about what survives a change: a revoked grant must not
 * erase progress, a republication must not lose a completion, and a certificate
 * must keep verifying after the course that produced it is archived.
 */

let workspaceId: string
let academyId: string
let ownerUserId: string
let learnerId: string
let otherLearnerId: string
let courseId: string
let lessonOneId: string
let lessonTwoId: string

const owner = (): Principal => ({
  kind: 'staff',
  userId: ownerUserId,
  workspaceId,
  memberId: 'unused',
  role: 'owner',
})

const learner = (): Principal => ({
  kind: 'learner',
  learnerId,
  academyId,
})

const tag = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

beforeAll(async () => {
  const value = tag()

  const user = await prisma.staffUser.create({
    data: {
      id: `u-${value}`,
      name: 'Owner',
      email: `learn-${value}@example.com`,
    },
  })
  ownerUserId = user.id

  const workspace = await createWorkspace({
    name: 'Learning',
    slug: `learning-${value}`,
    ownerUserId,
  })
  workspaceId = workspace.id

  const academy = await createAcademy(owner(), workspaceId, {
    name: 'Learning Academy',
    slug: `learning-academy-${value}`,
  })
  academyId = academy.id

  const [one, two] = await Promise.all([
    prisma.learner.create({
      data: {
        id: `l-${value}`,
        academyId,
        name: 'Ada Lovelace',
        email: `ada-${value}@example.com`,
      },
    }),
    prisma.learner.create({
      data: {
        id: `l2-${value}`,
        academyId,
        name: 'Grace Hopper',
        email: `grace-${value}@example.com`,
      },
    }),
  ])

  learnerId = one.id
  otherLearnerId = two.id

  const course = await createCourse(owner(), {
    workspaceId,
    academyId,
    title: 'Introduction to Computing',
    slug: `computing-${value}`,
  })
  courseId = course.id

  const module = await createModule(owner(), {
    workspaceId,
    academyId,
    courseId,
    title: 'Foundations',
  })

  const lessonOne = await createLesson(owner(), {
    workspaceId,
    academyId,
    courseId,
    moduleId: module.id,
    title: 'What a machine is',
    contentType: 'TEXT',
    body: '<p>Machines.</p>',
    isFree: true,
  })
  lessonOneId = lessonOne.id

  const lessonTwo = await createLesson(owner(), {
    workspaceId,
    academyId,
    courseId,
    moduleId: module.id,
    title: 'What an algorithm is',
    contentType: 'TEXT',
    body: '<p>Algorithms.</p>',
  })
  lessonTwoId = lessonTwo.id

  await publishCourse(owner(), { workspaceId, academyId, courseId })
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.staffUser.deleteMany({ where: { id: ownerUserId } })
  await prisma.$disconnect()
})

describe('enroll', () => {
  it('creates the enrolment and a free grant together', async () => {
    const result = await enroll(learner(), {
      workspaceId,
      academyId,
      courseId,
      learnerId,
    })

    expect(result.created).toBe(true)
    expect(await hasAccess(academyId, courseId, learnerId)).toBe(true)
  })

  it('is idempotent: enrolling twice returns the same enrolment', async () => {
    // A double-tap or a retried request is not an error, and the unique
    // constraint would refuse the second insert anyway — so the only question
    // is whether that surfaces as a conflict or as the thing the caller wanted.
    const second = await enroll(learner(), {
      workspaceId,
      academyId,
      courseId,
      learnerId,
    })

    expect(second.created).toBe(false)

    const count = await prisma.enrollment.count({
      where: { courseId, learnerId },
    })
    expect(count).toBe(1)
  })

  it('refuses a learner from another academy', async () => {
    const elsewhere = await prisma.academy.create({
      data: { workspaceId, name: 'Elsewhere', slug: `elsewhere-${tag()}` },
    })

    await expect(
      enroll(learner(), {
        workspaceId,
        academyId: elsewhere.id,
        courseId,
        learnerId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)

    await prisma.academy.delete({ where: { id: elsewhere.id } })
  })

  it('refuses a learner who belongs to a different academy', async () => {
    // `can()` permits this — the owner may create enrolments in this workspace —
    // so the refusal has to come from the query, which pins the academy. That
    // makes it a not-found rather than a refusal, which is the right answer:
    // the learner is not in the academy the request named.
    const otherAcademy = await prisma.academy.create({
      data: { workspaceId, name: 'Third', slug: `third-${tag()}` },
    })

    const stranger = await prisma.learner.create({
      data: {
        id: `l3-${tag()}`,
        academyId: otherAcademy.id,
        name: 'Stranger',
        email: `stranger-${tag()}@example.com`,
      },
    })

    await expect(
      enroll(owner(), {
        workspaceId,
        academyId,
        courseId,
        learnerId: stranger.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError)

    await prisma.academy.delete({ where: { id: otherAcademy.id } })
  })

  it('refuses an owner of another workspace, before any lookup', async () => {
    // The cross-tenant denial for the staff path. `enrollment:create` requires a
    // workspace, so containment is evaluated rather than skipped.
    await expect(
      enroll(
        {
          kind: 'staff',
          userId: 'u-x',
          workspaceId: 'ws-x',
          memberId: 'm',
          role: 'owner',
        },
        { workspaceId, academyId, courseId, learnerId },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('refuses an unknown course', async () => {
    await expect(
      enroll(learner(), {
        workspaceId,
        academyId,
        courseId: 'no-such-course',
        learnerId,
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('access grants', () => {
  it('compose: revoking one leaves another', async () => {
    // The reason permission is a set of grants rather than a column. A refund
    // revoking a purchase must not disturb an instructor's manual grant.
    await enroll(owner(), {
      workspaceId,
      academyId,
      courseId,
      learnerId: otherLearnerId,
    })

    const manual = await grantAccess(owner(), {
      workspaceId,
      academyId,
      courseId,
      learnerId: otherLearnerId,
      source: 'MANUAL',
    })

    const free = await prisma.accessGrant.findFirstOrThrow({
      where: { academyId, courseId, learnerId: otherLearnerId, source: 'FREE' },
      select: { id: true },
    })

    await revokeAccess(owner(), {
      workspaceId,
      academyId,
      grantId: free.id,
      reason: 'refund',
    })

    // The manual grant still stands, so access survives.
    expect(await hasAccess(academyId, courseId, otherLearnerId)).toBe(true)

    await revokeAccess(owner(), {
      workspaceId,
      academyId,
      grantId: manual.id,
      reason: 'end of programme',
    })

    expect(await hasAccess(academyId, courseId, otherLearnerId)).toBe(false)
  })

  it('is refused by an expired grant', async () => {
    // Re-enrol: the previous test revoked every grant this learner had, and
    // relying on that ordering would make this test fail for the wrong reason.
    await enroll(owner(), {
      workspaceId,
      academyId,
      courseId,
      learnerId: otherLearnerId,
    })

    await prisma.accessGrant.updateMany({
      where: { academyId, courseId, learnerId: otherLearnerId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    expect(await hasAccess(academyId, courseId, otherLearnerId)).toBe(false)

    await prisma.accessGrant.deleteMany({
      where: { academyId, courseId, learnerId: otherLearnerId },
    })
  })

  it('re-enrolling restores access by clearing the revocation', async () => {
    // Reuses the row rather than inserting a second one, so "how did this
    // person get access" has one answer.
    await enroll(learner(), { workspaceId, academyId, courseId, learnerId })

    await prisma.accessGrant.updateMany({
      where: { academyId, courseId, learnerId },
      data: { revokedAt: new Date(), revokedReason: 'test' },
    })

    expect(await hasAccess(academyId, courseId, learnerId)).toBe(false)

    await enroll(learner(), { workspaceId, academyId, courseId, learnerId })

    expect(await hasAccess(academyId, courseId, learnerId)).toBe(true)

    const grants = await prisma.accessGrant.count({
      where: { academyId, courseId, learnerId },
    })
    expect(grants).toBe(1)
  })
})

describe('recordProgress', () => {
  it('stores the reported position', async () => {
    const progress = await recordProgress(learner(), {
      academyId,
      learnerId,
      lessonId: lessonOneId,
      positionSeconds: 42,
      watchedSeconds: 42,
    })

    expect(progress.positionSeconds).toBe(42)
    expect(progress.isCompleted).toBe(false)
  })

  it('never decreases watched seconds', async () => {
    // A learner who scrubs backwards has not un-watched anything.
    const progress = await recordProgress(learner(), {
      academyId,
      learnerId,
      lessonId: lessonOneId,
      positionSeconds: 0,
      watchedSeconds: 10,
    })

    expect(progress.positionSeconds).toBe(0)
    expect(progress.watchedSeconds).toBe(42)
  })

  it('sets the enrolment start date on first activity', async () => {
    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { courseId_learnerId: { courseId, learnerId } },
      select: { startedAt: true },
    })

    expect(enrollment.startedAt).not.toBeNull()
  })

  it('refuses progress for a lesson in another academy', async () => {
    const elsewhere = await prisma.academy.create({
      data: { workspaceId, name: 'Other', slug: `other-${tag()}` },
    })
    const stranger = await prisma.learner.create({
      data: {
        id: `l4-${tag()}`,
        academyId: elsewhere.id,
        name: 'S',
        email: `s-${tag()}@example.com`,
      },
    })

    await expect(
      recordProgress(
        { kind: 'learner', learnerId: stranger.id, academyId: elsewhere.id },
        {
          academyId: elsewhere.id,
          learnerId: stranger.id,
          lessonId: lessonOneId,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundError)

    await prisma.academy.delete({ where: { id: elsewhere.id } })
  })
})

describe('completeLesson', () => {
  it('marks the lesson complete and leaves the course incomplete', async () => {
    const result = await completeLesson(learner(), {
      academyId,
      learnerId,
      lessonId: lessonOneId,
    })

    expect(result.lessonCompleted).toBe(true)
    expect(result.courseCompleted).toBe(false)
  })

  it('does not move the completion date when completed again', async () => {
    const before = await prisma.lessonProgress.findUniqueOrThrow({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: await enrollmentId(),
          lessonId: lessonOneId,
        },
      },
      select: { completedAt: true },
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    await completeLesson(learner(), {
      academyId,
      learnerId,
      lessonId: lessonOneId,
    })

    const after = await prisma.lessonProgress.findUniqueOrThrow({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: await enrollmentId(),
          lessonId: lessonOneId,
        },
      },
      select: { completedAt: true },
    })

    // Otherwise "when did they finish this" becomes "when did they last open
    // it".
    expect(after.completedAt?.getTime()).toBe(before.completedAt?.getTime())
  })

  it('completes the course when the last required lesson is done', async () => {
    const result = await completeLesson(learner(), {
      academyId,
      learnerId,
      lessonId: lessonTwoId,
    })

    expect(result.courseCompleted).toBe(true)
  })

  it('reports 100 percent', async () => {
    const progress = await getCourseProgress(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    expect(progress.requiredLessons).toBe(2)
    expect(progress.completedLessons).toBe(2)
    expect(progress.percent).toBe(100)
    expect(progress.isComplete).toBe(true)
  })
})

describe('progress survives change', () => {
  it('keeps progress when the grant is revoked', async () => {
    // Permission and learning are separate. Revoking access must not delete the
    // record that somebody learned something.
    await prisma.accessGrant.updateMany({
      where: { academyId, courseId, learnerId },
      data: { revokedAt: new Date(), revokedReason: 'refund' },
    })

    expect(await hasAccess(academyId, courseId, learnerId)).toBe(false)

    const progress = await getCourseProgress(learner(), {
      academyId,
      learnerId,
      courseId,
    })
    expect(progress.completedLessons).toBe(2)

    await prisma.accessGrant.updateMany({
      where: { academyId, courseId, learnerId },
      data: { revokedAt: null, revokedReason: null },
    })
  })

  it('keeps completed lessons when the course is republished with a new one', async () => {
    const module = await prisma.module.findFirstOrThrow({
      where: { courseId },
      select: { id: true },
    })

    const third = await createLesson(owner(), {
      workspaceId,
      academyId,
      courseId,
      moduleId: module.id,
      title: 'Third lesson',
      contentType: 'TEXT',
      body: '<p>More</p>',
    })

    await publishCourse(owner(), { workspaceId, academyId, courseId })

    const progress = await getCourseProgress(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    // The course is incomplete again, correctly: there is now something the
    // learner has not done. The two completions survive.
    expect(progress.requiredLessons).toBe(3)
    expect(progress.completedLessons).toBe(2)
    expect(progress.isComplete).toBe(false)

    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { courseId_learnerId: { courseId, learnerId } },
      select: { completedAt: true },
    })
    expect(enrollment.completedAt).toBeNull()

    await completeLesson(learner(), {
      academyId,
      learnerId,
      lessonId: third.id,
    })
  })

  it('drops a removed lesson from the denominator but keeps its record', async () => {
    // Deleting the draft lesson does not delete the progress row, and the
    // release a learner follows no longer contains it.
    const third = await prisma.lesson.findFirstOrThrow({
      where: { module: { courseId }, title: 'Third lesson' },
      select: { id: true },
    })

    await prisma.lesson.delete({ where: { id: third.id } })
    await publishCourse(owner(), { workspaceId, academyId, courseId })

    const progress = await getCourseProgress(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    expect(progress.requiredLessons).toBe(2)

    const orphaned = await prisma.lessonProgress.findFirst({
      where: { lessonId: third.id },
      select: { isCompleted: true },
    })

    // The historical record survives even though the lesson does not.
    expect(orphaned?.isCompleted).toBe(true)
  })
})

describe('courseread for a learner', () => {
  it('serves the release without the answer key', async () => {
    const view = await getCourseForLearner(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    expect(view.course.title).toBe('Introduction to Computing')
    expect(view.hasAccess).toBe(true)
    expect(view.modules.flatMap((module) => module.lessons).length).toBe(2)
  })

  it('reports lost access rather than pretending the course is gone', async () => {
    await prisma.accessGrant.updateMany({
      where: { academyId, courseId, learnerId },
      data: { revokedAt: new Date() },
    })

    const view = await getCourseForLearner(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    expect(view.hasAccess).toBe(false)

    await prisma.accessGrant.updateMany({
      where: { academyId, courseId, learnerId },
      data: { revokedAt: null },
    })
  })

  it('refuses a course in another academy', async () => {
    const elsewhere = await prisma.academy.create({
      data: { workspaceId, name: 'Nope', slug: `nope-${tag()}` },
    })

    await expect(
      getCourseForLearner(learner(), {
        academyId: elsewhere.id,
        learnerId,
        courseId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)

    await prisma.academy.delete({ where: { id: elsewhere.id } })
  })
})

describe('listLearnerCourses', () => {
  it('includes the course with its progress', async () => {
    const courses = await listLearnerCourses(learner(), {
      academyId,
      learnerId,
    })

    const entry = courses.find((course) => course.courseId === courseId)
    expect(entry?.percent).toBe(100)
    expect(entry?.isComplete).toBe(true)
  })

  it('refuses another learner’s list', async () => {
    await expect(
      listLearnerCourses(learner(), { academyId, learnerId: otherLearnerId }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})

describe('certificates', () => {
  it('refuses to issue for an incomplete course', async () => {
    // Staff issuing on a learner's behalf, which is the path that reaches the
    // completion check rather than the permission check.
    await expect(
      issueCertificate(owner(), {
        workspaceId,
        academyId,
        learnerId: otherLearnerId,
        courseId,
      }),
    ).rejects.toThrow(/not complete/)
  })

  it('refuses a learner asking for a certificate they have not earned', async () => {
    const stranger = (
      await prisma.learner.findFirstOrThrow({
        where: { academyId, id: otherLearnerId },
        select: { id: true },
      })
    ).id

    await expect(
      issueCertificate(
        { kind: 'learner', learnerId: stranger, academyId },
        { academyId, learnerId: stranger, courseId },
      ),
    ).rejects.toThrow(/not complete/)
  })

  it('issues for a complete one, with an unguessable identifier', async () => {
    const { certificate, created } = await issueCertificate(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    expect(created).toBe(true)
    expect(certificate.verificationId.length).toBeGreaterThanOrEqual(30)
    expect(certificate.recipientName).toBe('Ada Lovelace')
  })

  it('is idempotent: issuing twice returns the same certificate', async () => {
    // Two certificates for one achievement would mean two verification links,
    // one of which an employer might hold.
    const { certificate, created } = await issueCertificate(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    expect(created).toBe(false)

    const count = await prisma.certificate.count({
      where: { courseId, learnerId },
    })
    expect(count).toBe(1)
    expect(certificate.verificationId).toBeTruthy()
  })

  it('copies the recipient name rather than referencing it', async () => {
    // A certificate is a statement about a moment: renaming the learner later
    // must not rewrite what a past employer can verify.
    await prisma.learner.update({
      where: { id: learnerId },
      data: { name: 'Ada King' },
    })

    const certificate = await getCertificate(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    expect(certificate?.recipientName).toBe('Ada Lovelace')

    await prisma.learner.update({
      where: { id: learnerId },
      data: { name: 'Ada Lovelace' },
    })
  })

  it('verifies publicly, without an account, and without leaking the email', async () => {
    const certificate = await getCertificate(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    const view = await verifyCertificate(certificate!.verificationId)

    expect(view?.status).toBe('VALID')
    expect(view?.recipientName).toBe('Ada Lovelace')
    expect(view?.academy.name).toBe('Learning Academy')

    // The public projection is a type, so a field added to `Certificate` cannot
    // arrive here by default. This asserts the absence anyway.
    expect(JSON.stringify(view)).not.toContain('@')
  })

  it('returns null for an unknown identifier', async () => {
    expect(await verifyCertificate('not-a-real-verification-id')).toBeNull()
  })

  it('reports revocation rather than disappearing', async () => {
    // A deleted certificate would leave an employer holding a document that
    // looks valid and cannot be checked.
    const certificate = await getCertificate(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    await revokeCertificate(owner(), {
      workspaceId,
      academyId,
      certificateId: certificate!.id,
      reason: 'Issued in error',
    })

    const view = await verifyCertificate(certificate!.verificationId)

    expect(view?.status).toBe('REVOKED')
    expect(view?.revocationReason).toBe('Issued in error')

    // The row is still there.
    const row = await prisma.certificate.findUnique({
      where: { id: certificate!.id },
    })
    expect(row).not.toBeNull()
  })

  it('lists a learner’s certificates', async () => {
    const certificates = await listLearnerCertificates(learner(), {
      academyId,
      learnerId,
    })

    expect(certificates.length).toBeGreaterThan(0)
  })

  it('refuses to issue for another learner', async () => {
    await expect(
      issueCertificate(learner(), {
        academyId,
        learnerId: otherLearnerId,
        courseId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('refuses revocation when the principal is in another workspace', async () => {
    const certificate = await getCertificate(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    // The input names *this* workspace while the principal belongs to another,
    // so containment refuses before anything is looked up. Passing the
    // principal's own workspace as input instead would let it through and reach
    // the query, which is why the two are deliberately different here.
    await expect(
      revokeCertificate(
        {
          kind: 'staff',
          userId: 'u-x',
          workspaceId: 'ws-x',
          memberId: 'm',
          role: 'owner',
        },
        {
          workspaceId,
          academyId,
          certificateId: certificate!.id,
          reason: 'nope',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('refuses revocation when the input names another workspace', async () => {
    // The mirror: the input is what `can()` compares against, so naming a
    // foreign workspace is refused even for a legitimate principal.
    const certificate = await getCertificate(learner(), {
      academyId,
      learnerId,
      courseId,
    })

    await expect(
      revokeCertificate(owner(), {
        workspaceId: 'ws-x',
        academyId,
        certificateId: certificate!.id,
        reason: 'nope',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('reports an unknown certificate as not-found, not as a refusal', async () => {
    await expect(
      revokeCertificate(owner(), {
        workspaceId,
        academyId,
        certificateId: 'cert-does-not-exist',
        reason: 'nope',
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

/** The test's enrolment id, fetched fresh each time it is needed. */
async function enrollmentId(): Promise<string> {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { courseId_learnerId: { courseId, learnerId } },
    select: { id: true },
  })

  return enrollment.id
}
