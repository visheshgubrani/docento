/**
 * Assignments: authoring, submission and grading.
 *
 * ## Why grading is separate from completion
 *
 * The legacy application marked a lesson complete as a side effect of grading a
 * submission, which meant a grader's action silently changed a learner's
 * progress. Here grading writes a grade and nothing else: completion follows the
 * release's completion rule, and where an assignment *is* the completion rule
 * the caller asks for it explicitly. A marker should be able to give feedback
 * without altering what a course says a learner has done.
 *
 * ## One submission per learner
 *
 * `@@unique([assignmentId, learnerId])`. A learner resubmitting replaces their
 * own work while it is ungraded, and is refused once it has been graded —
 * silently overwriting a graded submission would make a grade refer to
 * something the learner can no longer see.
 */

import { prisma } from '../db'
import type { Principal } from '../authorization/principal'
import {
  ConflictError,
  DomainRuleError,
  NotFoundError,
  assertCan,
  assertFound,
} from '../shared/errors'
import { hasAccess } from '../learning/enrollment'

export type AssignmentSummary = {
  id: string
  lessonId: string
  title: string
  instructions: string | null
  dueAt: Date | null
  totalPoints: number
}

const ASSIGNMENT_FIELDS = {
  id: true,
  lessonId: true,
  title: true,
  instructions: true,
  dueAt: true,
  totalPoints: true,
} as const

export type SubmissionSummary = {
  id: string
  assignmentId: string
  learnerId: string
  content: string | null
  fileUrl: string | null
  grade: number | null
  feedback: string | null
  gradedAt: Date | null
  gradedById: string | null
  submittedAt: Date
  updatedAt: Date
}

const SUBMISSION_FIELDS = {
  id: true,
  assignmentId: true,
  learnerId: true,
  content: true,
  fileUrl: true,
  grade: true,
  feedback: true,
  gradedAt: true,
  gradedById: true,
  submittedAt: true,
  updatedAt: true,
} as const

/**
 * Create or update the assignment attached to a lesson.
 *
 * A lesson has at most one (`Assignment.lessonId` is unique), so this upserts
 * rather than making an author know whether the row exists.
 */
export async function upsertAssignment(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    courseId: string
    lessonId: string
    title: string
    instructions?: string | null
    dueAt?: Date | null
    totalPoints?: number
  },
): Promise<AssignmentSummary> {
  assertCan(principal, 'course:update', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
    courseId: input.courseId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: { id: input.lessonId, module: { courseId: input.courseId } },
    select: { id: true, assignment: { select: { id: true } } },
  })

  assertFound('lesson', lesson, input.lessonId)

  const title = input.title.trim()

  if (title.length === 0) {
    throw new DomainRuleError(
      'invalid_assignment',
      'An assignment needs a title.',
      [{ path: 'title', message: 'is required' }],
    )
  }

  if (input.totalPoints !== undefined && input.totalPoints < 1) {
    throw new DomainRuleError(
      'invalid_assignment',
      'Total points must be at least 1.',
      [{ path: 'totalPoints', message: 'must be at least 1' }],
    )
  }

  const data = {
    title,
    ...(input.instructions !== undefined
      ? { instructions: input.instructions }
      : {}),
    ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
    ...(input.totalPoints !== undefined
      ? { totalPoints: input.totalPoints }
      : {}),
  }

  if (lesson.assignment) {
    return prisma.assignment.update({
      where: { id: lesson.assignment.id },
      data,
      select: ASSIGNMENT_FIELDS,
    })
  }

  return prisma.assignment.create({
    data: { ...data, lessonId: input.lessonId },
    select: ASSIGNMENT_FIELDS,
  })
}

/**
 * The assignment as a learner sees it, with their own submission.
 *
 * Refuses when access has lapsed, so a learner who lost access cannot read the
 * brief or submit against it.
 */
export async function getAssignmentForLearner(
  principal: Principal,
  input: { academyId: string; learnerId: string; lessonId: string },
): Promise<{
  assignment: AssignmentSummary
  submission: SubmissionSummary | null
}> {
  assertCan(principal, 'learner:submission:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: input.lessonId,
      module: { course: { academyId: input.academyId } },
    },
    select: {
      assignment: { select: ASSIGNMENT_FIELDS },
      module: { select: { courseId: true } },
    },
  })

  assertFound('lesson', lesson, input.lessonId)
  assertFound('assignment', lesson.assignment, input.lessonId)

  const entitled = await hasAccess(
    input.academyId,
    lesson.module.courseId,
    input.learnerId,
  )

  if (!entitled) {
    throw new NotFoundError('assignment', input.lessonId)
  }

  const submission = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_learnerId: {
        assignmentId: lesson.assignment.id,
        learnerId: input.learnerId,
      },
    },
    select: SUBMISSION_FIELDS,
  })

  return { assignment: lesson.assignment, submission }
}

/**
 * Submit work.
 *
 * ## Due dates
 *
 * Refused after the due date. Late work is a policy decision an operator may
 * want to make differently, so the refusal names the date rather than silently
 * accepting or silently dropping the submission — and an operator can extend
 * the due date, which is a change to the assignment rather than to this rule.
 *
 * ## Resubmission
 *
 * Allowed while ungraded, refused once graded. Overwriting a graded submission
 * would leave a grade attached to work the learner can no longer see.
 */
export async function submitAssignment(
  principal: Principal,
  input: {
    academyId: string
    learnerId: string
    lessonId: string
    content?: string | null
    fileUrl?: string | null
  },
): Promise<SubmissionSummary> {
  assertCan(principal, 'learner:submission:write', {
    academyId: input.academyId,
    learnerId: input.learnerId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: input.lessonId,
      module: { course: { academyId: input.academyId } },
    },
    select: {
      assignment: { select: ASSIGNMENT_FIELDS },
      module: { select: { courseId: true } },
    },
  })

  assertFound('lesson', lesson, input.lessonId)
  assertFound('assignment', lesson.assignment, input.lessonId)

  const entitled = await hasAccess(
    input.academyId,
    lesson.module.courseId,
    input.learnerId,
  )

  if (!entitled) {
    throw new NotFoundError('assignment', input.lessonId)
  }

  const hasContent = (input.content ?? '').trim().length > 0
  const hasFile = (input.fileUrl ?? '').trim().length > 0

  if (!hasContent && !hasFile) {
    throw new DomainRuleError(
      'empty_submission',
      'A submission needs either written work or a file.',
      [{ path: 'content', message: 'provide written work or attach a file' }],
    )
  }

  if (
    lesson.assignment.dueAt &&
    lesson.assignment.dueAt.getTime() < Date.now()
  ) {
    throw new ConflictError(
      'assignment_closed',
      `This assignment was due on ${lesson.assignment.dueAt.toISOString()}.`,
    )
  }

  const existing = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_learnerId: {
        assignmentId: lesson.assignment.id,
        learnerId: input.learnerId,
      },
    },
    select: { id: true, gradedAt: true },
  })

  if (existing?.gradedAt) {
    throw new ConflictError(
      'submission_graded',
      'This submission has been graded. Ask your instructor to reopen it before submitting again.',
    )
  }

  const data = {
    content: input.content ?? null,
    fileUrl: input.fileUrl ?? null,
    submittedAt: new Date(),
  }

  if (existing) {
    return prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data,
      select: SUBMISSION_FIELDS,
    })
  }

  return prisma.assignmentSubmission.create({
    data: {
      ...data,
      assignmentId: lesson.assignment.id,
      learnerId: input.learnerId,
    },
    select: SUBMISSION_FIELDS,
  })
}

/**
 * Grade a submission.
 *
 * Writes the grade and nothing else. In particular it does not complete the
 * lesson: a marker giving feedback is not a statement that the learner has
 * finished the course, and coupling the two made a grader's action change a
 * learner's progress in the application this replaces.
 */
export async function gradeSubmission(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    submissionId: string
    grade: number
    feedback?: string | null
  },
): Promise<SubmissionSummary> {
  assertCan(principal, 'submission:grade', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  /**
   * Scoped to the academy in the query, not only in `can()`.
   *
   * `can()` checks the workspace, which is the containment boundary for staff —
   * an academy inside it is not a tenant to a workspace role. Finding the
   * submission through its academy here means a grader cannot mark work in an
   * academy they were not pointed at, and a wrong id is a not-found rather than
   * a cross-academy write.
   */
  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      id: input.submissionId,
      assignment: {
        lesson: { module: { course: { academyId: input.academyId } } },
      },
    },
    select: {
      id: true,
      assignment: { select: { totalPoints: true } },
    },
  })

  assertFound('submission', submission, input.submissionId)

  const totalPoints = submission.assignment.totalPoints

  if (
    !Number.isFinite(input.grade) ||
    input.grade < 0 ||
    input.grade > totalPoints
  ) {
    throw new DomainRuleError(
      'invalid_grade',
      `A grade must be between 0 and ${totalPoints}.`,
      [{ path: 'grade', message: `must be between 0 and ${totalPoints}` }],
    )
  }

  return prisma.assignmentSubmission.update({
    where: { id: input.submissionId },
    data: {
      grade: input.grade,
      feedback: input.feedback ?? null,
      gradedAt: new Date(),
      gradedById: principal.kind === 'staff' ? principal.userId : null,
    },
    select: SUBMISSION_FIELDS,
  })
}

/**
 * Every submission for an assignment, for a gradebook.
 *
 * `ungraded` first because that is what a marker opens the page to find.
 */
export async function listSubmissions(
  principal: Principal,
  input: {
    workspaceId: string
    academyId: string
    lessonId: string
    status?: 'graded' | 'ungraded'
  },
): Promise<{
  assignment: AssignmentSummary
  submissions: (SubmissionSummary & {
    learnerName: string
    learnerEmail: string
  })[]
}> {
  assertCan(principal, 'submission:read', {
    workspaceId: input.workspaceId,
    academyId: input.academyId,
  })

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: input.lessonId,
      module: { course: { academyId: input.academyId } },
    },
    select: { assignment: { select: ASSIGNMENT_FIELDS } },
  })

  assertFound('lesson', lesson, input.lessonId)
  assertFound('assignment', lesson.assignment, input.lessonId)

  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: lesson.assignment.id,
      ...(input.status === 'graded'
        ? { gradedAt: { not: null } }
        : input.status === 'ungraded'
          ? { gradedAt: null }
          : {}),
    },
    orderBy: [{ gradedAt: 'asc' }, { submittedAt: 'asc' }],
    select: {
      ...SUBMISSION_FIELDS,
      learner: { select: { name: true, email: true } },
    },
  })

  return {
    assignment: lesson.assignment,
    submissions: submissions.map(({ learner, ...submission }) => ({
      ...submission,
      learnerName: learner.name,
      learnerEmail: learner.email,
    })),
  }
}
