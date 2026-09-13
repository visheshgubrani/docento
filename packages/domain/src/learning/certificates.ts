/**
 * Certificates.
 *
 * ## What a certificate is
 *
 * A durable row recording that a named learner completed a named course, with
 * the evidence that supported it and a public identifier anybody can look up.
 * It is not a rendered document: the document is a view of the row, so a
 * redesign never invalidates an issued certificate.
 *
 * ## Why the record must survive everything
 *
 * A certificate is the one artifact a learner takes to an employer. Deleting a
 * learner, archiving a course, or unpublishing a release must not make it stop
 * verifying — the schema deliberately does not cascade it from `Course`, and
 * this module never deletes one. Revocation is explicit and keeps the row, so a
 * revoked certificate reports *that it was revoked* rather than seeming never
 * to have existed.
 *
 * ## The public view
 *
 * Verification is the second of the two actions an unauthenticated visitor may
 * perform (the other is reading the catalogue). It returns a minimal
 * projection: no learner email, no internal identifiers, no academy
 * configuration. "Anyone may verify" is not "anyone may enumerate".
 */

import { prisma } from '../db'
import type { Principal } from '../authorization/principal'
import { ConflictError, assertCan, assertFound } from '../shared/errors'

export type CertificateSummary = {
  id: string
  academyId: string
  courseId: string
  learnerId: string
  verificationId: string
  title: string
  recipientName: string
  issuedAt: Date
  revokedAt: Date | null
  revocationReason: string | null
}

const CERTIFICATE_FIELDS = {
  id: true,
  academyId: true,
  courseId: true,
  learnerId: true,
  verificationId: true,
  title: true,
  recipientName: true,
  issuedAt: true,
  revokedAt: true,
  revocationReason: true,
} as const

/**
 * The evidence a certificate was earned against.
 *
 * Recorded so a certificate can be defended years later: which release, how
 * many lessons it required, and which grade was attached if there was one.
 * Without this, "was this earned?" is answerable only from the learner's
 * current progress, which a republication will have changed.
 */
export type CompletionEvidence = {
  releaseId: string
  releaseVersion: number
  requiredLessons: number
  completedLessons: number
  completedAt: string
  /** Present when the course carried a graded assessment. */
  assessment?: {
    lessonId: string
    score: number
    totalPoints: number
    percent: number
    passed: boolean
  }
}

/**
 * A public identifier for a certificate.
 *
 * Unguessable by construction: 24 random bytes, URL-safe. Sequential ids would
 * make the verification endpoint an enumeration of every certificate ever
 * issued, which is a directory of who studied what.
 */
export function generateVerificationId(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString(
    'base64url',
  )
}

/**
 * Issue a certificate for a completed course.
 *
 * ## Idempotence
 *
 * A second call returns the existing certificate with the same
 * `verificationId`. This matters more than usual: issuance is triggered by
 * completion, completion can be recomputed by several paths — a lesson
 * completion, a graded submission, an operator's backfill — and two
 * certificates for one achievement would mean two verification links, one of
 * which an employer might hold and the other the learner.
 *
 * ## Completion is checked, not assumed
 *
 * The caller does not get to assert completion. It is recomputed from progress
 * against the current release, so a certificate cannot be issued for a course
 * somebody has not finished — including by a client that says they have.
 */
export async function issueCertificate(
  principal: Principal,
  input: {
    /**
     * Required for staff, ignored for a learner.
     *
     * A learner requesting their own certificate has no workspace to name, and
     * the learner branch below checks the academy and their own id instead. A
     * staff member issuing on someone's behalf is workspace-scoped, and without
     * this the containment check was skipped entirely — which is the bug the
     * test caught.
     */
    workspaceId?: string | null
    academyId: string
    learnerId: string
    courseId: string
  },
): Promise<{ certificate: CertificateSummary; created: boolean }> {
  /**
   * A learner may request their own certificate; staff may issue one.
   *
   * `certificate:issue` covers the staff case. A learner asking for their own
   * is `learner:certificate:read` — the same act from their side, because the
   * server decides whether it exists to be read.
   */
  if (principal.kind === 'learner') {
    assertCan(principal, 'learner:certificate:read', {
      academyId: input.academyId,
      learnerId: input.learnerId,
    })
  } else {
    assertCan(principal, 'certificate:issue', {
      workspaceId: input.workspaceId,
      academyId: input.academyId,
      courseId: input.courseId,
    })
  }

  const existing = await prisma.certificate.findUnique({
    where: {
      courseId_learnerId: {
        courseId: input.courseId,
        learnerId: input.learnerId,
      },
    },
    select: CERTIFICATE_FIELDS,
  })

  if (existing) return { certificate: existing, created: false }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_learnerId: {
        courseId: input.courseId,
        learnerId: input.learnerId,
      },
    },
    select: { id: true, completedAt: true },
  })

  assertFound('enrollment', enrollment, `${input.learnerId}/${input.courseId}`)

  const release = await prisma.courseRelease.findFirst({
    where: { courseId: input.courseId, supersededAt: null },
    orderBy: { version: 'desc' },
    select: { id: true, version: true },
  })

  assertFound('course release', release, input.courseId)

  const required = await prisma.releaseLesson.findMany({
    where: { releaseId: release.id, isRequired: true },
    select: { lessonId: true },
  })

  const completed = await prisma.lessonProgress.count({
    where: {
      enrollmentId: enrollment.id,
      isCompleted: true,
      lessonId: { in: required.map((lesson) => lesson.lessonId) },
    },
  })

  if (required.length === 0 || completed < required.length) {
    throw new ConflictError(
      'course_incomplete',
      `This course is not complete: ${completed} of ${required.length} required lessons are done.`,
    )
  }

  const learner = await prisma.learner.findFirst({
    where: { id: input.learnerId, academyId: input.academyId },
    select: { name: true, email: true },
  })

  assertFound('learner', learner, input.learnerId)

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, academyId: input.academyId },
    select: { title: true },
  })

  assertFound('course', course, input.courseId)

  const evidence: CompletionEvidence = {
    releaseId: release.id,
    releaseVersion: release.version,
    requiredLessons: required.length,
    completedLessons: completed,
    completedAt: (enrollment.completedAt ?? new Date()).toISOString(),
  }

  const certificate = await prisma.certificate.create({
    data: {
      academyId: input.academyId,
      courseId: input.courseId,
      learnerId: input.learnerId,
      verificationId: generateVerificationId(),
      title: course.title,
      /**
       * The name as it stands at issuance, copied rather than referenced.
       *
       * A certificate is a statement about a moment. If the learner later
       * changes their name, the issued certificate should still say what it
       * said — the same reasoning that makes a release a snapshot.
       */
      recipientName: learner.name,
      completionEvidence: evidence as unknown as object,
    },
    select: CERTIFICATE_FIELDS,
  })

  return { certificate, created: true }
}

/**
 * Revoke a certificate.
 *
 * Kept rather than deleted. A revoked certificate that reports its revocation
 * lets an employer who already holds a copy find out; a deleted one leaves them
 * holding a document that looks valid and cannot be checked.
 */
export async function revokeCertificate(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    certificateId: string
    reason: string
  },
): Promise<CertificateSummary> {
  assertCan(principal, 'certificate:revoke', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  /**
   * Pinned to the academy as well as the id.
   *
   * `findUnique` on the id alone would find a certificate belonging to another
   * academy in the same workspace, which `can()` permits — the workspace is the
   * containment boundary, and an academy inside it is not a tenant to the staff
   * role. Scoping the query means a wrong-academy id is a not-found rather than
   * a cross-academy revocation.
   */
  const certificate = await prisma.certificate.findFirst({
    where: { id: input.certificateId, academyId: input.academyId },
    select: { id: true, revokedAt: true },
  })

  assertFound('certificate', certificate, input.certificateId)

  if (certificate.revokedAt) {
    return prisma.certificate.findUniqueOrThrow({
      where: { id: input.certificateId },
      select: CERTIFICATE_FIELDS,
    })
  }

  return prisma.certificate.update({
    where: { id: input.certificateId },
    data: { revokedAt: new Date(), revocationReason: input.reason },
    select: CERTIFICATE_FIELDS,
  })
}

/** A learner's own certificate for a course, if it exists. */
export async function getCertificate(
  principal: Principal,
  input: { academyId: string; learnerId: string; courseId: string },
): Promise<CertificateSummary | null> {
  assertCan(principal, 'learner:certificate:read', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  return prisma.certificate.findUnique({
    where: {
      courseId_learnerId: {
        courseId: input.courseId,
        learnerId: input.learnerId,
      },
    },
    select: CERTIFICATE_FIELDS,
  })
}

/**
 * The public verification view.
 *
 * ## What is deliberately absent
 *
 * No learner email, no learner id, no academy id, no course id, no evidence
 * blob. The projection is a type rather than a `select` comment, so a field
 * added to `Certificate` cannot arrive here by default.
 *
 * ## Why the academy name is present
 *
 * An employer checking a certificate needs to know who issued it. The academy's
 * display name is public information — it is on the catalogue page — so
 * including it is the difference between a verifiable document and an opaque
 * one. Its configuration, domains and keys are not.
 */
export type PublicCertificateView = {
  verificationId: string
  /** VALID | REVOKED */
  status: 'VALID' | 'REVOKED'
  title: string
  recipientName: string
  issuedAt: string
  academy: { name: string; slug: string }
  /** Present only when revoked, so a holder learns why. */
  revocationReason: string | null
}

/**
 * Look up a certificate by its public identifier.
 *
 * Anonymous, by design — this is the second of the two public actions. Returns
 * `null` rather than throwing so the caller can choose a `404` without the
 * difference between "unknown" and "revoked" leaking through an error type.
 */
export async function verifyCertificate(
  verificationId: string,
): Promise<PublicCertificateView | null> {
  const principal: Principal = { kind: 'anonymous' }
  assertCan(principal, 'certificate:verify', {})

  const certificate = await prisma.certificate.findUnique({
    where: { verificationId },
    select: {
      verificationId: true,
      title: true,
      recipientName: true,
      issuedAt: true,
      revokedAt: true,
      revocationReason: true,
      academy: { select: { name: true, slug: true } },
    },
  })

  if (!certificate) return null

  return {
    verificationId: certificate.verificationId,
    status: certificate.revokedAt ? 'REVOKED' : 'VALID',
    title: certificate.title,
    recipientName: certificate.recipientName,
    issuedAt: certificate.issuedAt.toISOString(),
    academy: certificate.academy,
    revocationReason: certificate.revokedAt
      ? certificate.revocationReason
      : null,
  }
}

/** Every certificate a learner holds, for a profile page. */
export async function listLearnerCertificates(
  principal: Principal,
  input: { academyId: string; learnerId: string },
): Promise<CertificateSummary[]> {
  assertCan(principal, 'learner:certificate:read', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  return prisma.certificate.findMany({
    where: { academyId: input.academyId, learnerId: input.learnerId },
    orderBy: { issuedAt: 'desc' },
    select: CERTIFICATE_FIELDS,
  })
}
