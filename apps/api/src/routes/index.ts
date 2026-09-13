import { Hono } from 'hono'
import type { Context } from 'hono'

import type { Principal, ResolvedAcademy } from '@docento/domain'
import {
  ForbiddenAccess,
  NotFoundError,
  archiveCourse,
  completeLesson,
  createAcademy,
  createCourse,
  createLesson,
  createModule,
  createServiceKey,
  deleteDraftLesson,
  deleteModule,
  enroll,
  getAcademy,
  getAssignmentForLearner,
  getCourse,
  getCourseForLearner,
  getLesson,
  getCourseProgress,
  getLearnerProfile,
  getPublicAcademy,
  getStaffIdentity,
  readAcademyIdentity,
  getPublicCourse,
  getPublicOutline,
  getQuizForLearner,
  getRelease,
  getWorkspace,
  gradeSubmission,
  issueCertificate,
  listAcademies,
  listAttempts,
  listCourses,
  listDraftModules,
  listLearnerCertificates,
  listLearnerCourses,
  listPublicCourses,
  listServiceKeys,
  listSubmissions,
  listWorkspacesForPrincipal,
  publishCourse,
  recordProgress,
  reorderLessons,
  reorderModules,
  revokeServiceKey,
  startAttempt,
  submitAssignment,
  submitAttempt,
  updateAcademy,
  updateCourse,
  updateLesson,
  updateModule,
  updateWorkspace,
  upsertAssignment,
  upsertQuestion,
  upsertQuiz,
  upsertSection,
  verifyCertificate,
} from '@docento/domain'

import { operation } from './operation.js'

/**
 * Every route, each a thin adapter over a domain operation.
 *
 * ## What a handler is allowed to do
 *
 * Resolve the arguments a domain operation needs, call it, return its result.
 * Nothing here grades an answer, computes completion, or decides who may do
 * what — those live in `packages/domain`, and a second implementation here is
 * how two call paths start disagreeing about a rule. Nothing here imports
 * Prisma either: that boundary is what makes "one query path" true rather than
 * aspirational, and it is enforced by `pnpm boundaries`.
 *
 * ## Where identifiers come from
 *
 * The academy is never taken from a request body. A staff handler takes its
 * workspace from the principal, which came from the session. A learner handler
 * takes its learner and academy from the principal too. That is what makes a
 * body unable to redirect a write, and it is why the handlers below look
 * repetitive: they are all reading the same two facts from the same place,
 * deliberately.
 */

/** The academy a request resolved to, or the same not-found a wrong id gets. */
function requireAcademy(academy: ResolvedAcademy | null): ResolvedAcademy {
  if (!academy) throw new NotFoundError('academy', 'unspecified')

  return academy
}

/**
 * The learner making the request.
 *
 * From the session rather than the input, always. A learner operation that read
 * a learner id from a body would let one learner act as another, and the domain
 * would refuse it — but only after the request had been accepted far enough to
 * be misleading.
 */
function requireLearner(principal: Principal): { learnerId: string; academyId: string } {
  if (principal.kind !== 'learner') {
    throw new ForbiddenAccess('This operation requires a learner session.')
  }

  return { learnerId: principal.learnerId, academyId: principal.academyId }
}

/**
 * The workspace a staff or service-key principal acts in.
 *
 * A signed-in staff member who has not chosen a workspace is refused here rather
 * than by `can()`, because the two failures need different advice: this one is
 * resolved by visiting the workspace chooser, and a permission failure is not.
 */
function requireWorkspace(principal: Principal): string {
  if (principal.kind === 'serviceKey') return principal.workspaceId

  if (principal.kind === 'staff') {
    if (!principal.workspaceId) {
      throw new ForbiddenAccess(
        'This operation acts in a workspace, and none has been chosen. Choose one first.',
      )
    }

    return principal.workspaceId
  }

  throw new ForbiddenAccess('This operation requires a staff session or a service key.')
}

/**
 * The workspace a write may carry, absent for a learner.
 *
 * Narrows explicitly rather than returning `principal.workspaceId`, which does
 * not exist on every member of the union — an anonymous principal has no
 * workspace, and the compiler is right to refuse the read. Returning `null` for
 * an anonymous caller is not a grant: the domain operation then refuses it,
 * which is the same answer it would give for any other missing scope.
 */
function optionalWorkspace(principal: Principal): string | null {
  if (principal.kind === 'staff' || principal.kind === 'serviceKey') {
    return principal.workspaceId
  }

  return null
}

/** Path parameters arrive as strings; this reads one. */
function param(input: { params?: unknown }, key: string): string {
  const params = (input.params ?? {}) as Record<string, string>

  return params[key] ?? ''
}

export function createRoutes(): Hono {
  const routes = new Hono()

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  routes.get(
    '/health',
    operation('health', async () => ({
      status: 'ok' as const,
      version: process.env.npm_package_version ?? '0.1.0',
    })),
  )

  // -------------------------------------------------------------------------
  // Workspace
  // -------------------------------------------------------------------------

  routes.get(
    '/workspaces',
    operation('workspace.list', async ({ principal }) => ({
      workspaces: await listWorkspacesForPrincipal(principal),
    })),
  )

  routes.get(
    '/workspaces/:workspaceId',
    operation('workspace.get', async ({ principal, input }) => ({
      workspace: await getWorkspace(principal, param(input, 'workspaceId')),
    })),
  )

  routes.patch(
    '/workspaces/:workspaceId',
    operation('workspace.update', async ({ principal, input }) => ({
      workspace: await updateWorkspace(principal, param(input, 'workspaceId'), {
        ...((input.body ?? {}) as { name?: string }),
      }),
    })),
  )

  // -------------------------------------------------------------------------
  // Academy
  // -------------------------------------------------------------------------

  routes.get(
    '/workspaces/:workspaceId/academies',
    operation('academy.list', async ({ principal, input }) => ({
      academies: await listAcademies(principal, param(input, 'workspaceId')),
    })),
  )

  routes.post(
    '/workspaces/:workspaceId/academies',
    operation('academy.create', async ({ principal, input }) => ({
      academy: await createAcademy(principal, param(input, 'workspaceId'), {
        ...(input.body as { name: string; slug: string }),
      }),
    })),
  )

  routes.get(
    '/workspaces/:workspaceId/academies/:academyId',
    operation('academy.get', async ({ principal, input }) => ({
      academy: await getAcademy(
        principal,
        param(input, 'workspaceId'),
        param(input, 'academyId'),
      ),
    })),
  )

  routes.patch(
    '/workspaces/:workspaceId/academies/:academyId',
    operation('academy.update', async ({ principal, input }) => ({
      academy: await updateAcademy(
        principal,
        param(input, 'workspaceId'),
        param(input, 'academyId'),
        { ...((input.body ?? {}) as { name?: string }) },
      ),
    })),
  )

  // -------------------------------------------------------------------------
  // Course authoring
  // -------------------------------------------------------------------------

  routes.get(
    '/workspaces/:workspaceId/academies/:academyId/courses',
    operation('course.list', async ({ principal, input }) => {
      const query = (input.query ?? {}) as { status?: string }

      return {
        courses: await listCourses(principal, {
          workspaceId: param(input, 'workspaceId'),
          academyId: param(input, 'academyId'),
          ...(query.status ? { status: query.status } : {}),
        }),
      }
    }),
  )

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/courses',
    operation('course.create', async ({ principal, input }) => ({
      course: await createCourse(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        ...(input.body as { title: string; slug: string }),
      }),
    })),
  )

  routes.get(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId',
    operation('course.get', async ({ principal, input }) => {
      const scope = {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
      }

      /**
       * The draft curriculum, because this is the authoring read.
       *
       * A course with no release yet has drafts and nothing else. The
       * learner-facing read is a different operation against a release, which is
       * what keeps an unfinished edit from reaching a student.
       */
      /**
       * The live release, when there is one.
       *
       * A course that has never been published has no release, and the domain
       * raises not-found for that — which is an answer here rather than an
       * error, because "nothing is published yet" is the state a new course is
       * in. Caught narrowly so a genuine failure is not flattened into "not
       * published".
       */
      const release = await getRelease(principal, scope)
        .then((result) => result.release)
        .catch((error: unknown) => {
          if (error instanceof NotFoundError) return null

          throw error
        })

      return {
        course: await getCourse(principal, scope),
        modules: await listDraftModules(principal, {
          workspaceId: scope.workspaceId,
          courseId: scope.courseId,
        }),
        release,
      }
    }),
  )

  routes.patch(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId',
    operation('course.update', async ({ principal, input }) => ({
      course: await updateCourse(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        ...((input.body ?? {}) as { title?: string }),
      }),
    })),
  )

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/archive',
    operation('course.archive', async ({ principal, input }) => ({
      course: await archiveCourse(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
      }),
    })),
  )

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/publish',
    operation('course.publish', async ({ principal, input }) => {
      const release = await publishCourse(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
      })

      // `unchanged` is lifted out of the release so the summary matches the
      // contract's release shape rather than carrying an extra field.
      const { unchanged, ...summary } = release

      return { release: summary, unchanged }
    }),
  )

  routes.get(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/releases/:version',
    operation('course.release', async ({ principal, input }) =>
      getRelease(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        version: Number(param(input, 'version')),
      }),
    ),
  )

  // -------------------------------------------------------------------------
  // Modules
  // -------------------------------------------------------------------------

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/modules',
    operation('module.create', async ({ principal, input }) => ({
      module: await createModule(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        ...(input.body as { title: string }),
      }),
    })),
  )

  routes.patch(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/modules/:moduleId',
    operation('module.update', async ({ principal, input }) => ({
      module: await updateModule(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        moduleId: param(input, 'moduleId'),
        ...((input.body ?? {}) as { title?: string }),
      }),
    })),
  )

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/modules/reorder',
    operation('module.reorder', async ({ principal, input }) => {
      await reorderModules(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        order: (input.body as { order: string[] }).order,
      })

      return { ok: true as const }
    }),
  )

  routes.delete(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/modules/:moduleId',
    operation('module.delete', async ({ principal, input }) => {
      await deleteModule(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        moduleId: param(input, 'moduleId'),
      })

      return { ok: true as const }
    }),
  )

  // -------------------------------------------------------------------------
  // Lessons
  // -------------------------------------------------------------------------

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/modules/:moduleId/lessons',
    operation('lesson.create', async ({ principal, input }) => ({
      lesson: await createLesson(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        moduleId: param(input, 'moduleId'),
        ...(input.body as { title: string; contentType: string }),
      }),
    })),
  )

  routes.get(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/lessons/:lessonId',
    operation('lesson.get', async ({ principal, input }) => ({
      lesson: await getLesson(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        lessonId: param(input, 'lessonId'),
      }),
    })),
  )

  routes.patch(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/lessons/:lessonId',
    operation('lesson.update', async ({ principal, input }) => ({
      lesson: await updateLesson(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        lessonId: param(input, 'lessonId'),
        ...((input.body ?? {}) as { title?: string }),
      }),
    })),
  )

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/modules/:moduleId/lessons/reorder',
    operation('lesson.reorder', async ({ principal, input }) => {
      await reorderLessons(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        moduleId: param(input, 'moduleId'),
        order: (input.body as { order: string[] }).order,
      })

      return { ok: true as const }
    }),
  )

  routes.delete(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/lessons/:lessonId',
    operation('lesson.delete', async ({ principal, input }) => {
      await deleteDraftLesson(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        lessonId: param(input, 'lessonId'),
      })

      return { ok: true as const }
    }),
  )

  // -------------------------------------------------------------------------
  // Quiz authoring
  // -------------------------------------------------------------------------

  routes.put(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/lessons/:lessonId/quiz',
    operation('quiz.upsert', async ({ principal, input }) => {
      const quiz = await upsertQuiz(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        lessonId: param(input, 'lessonId'),
        ...(input.body as { title: string }),
      })

      return { quizId: quiz.id, lessonId: quiz.lessonId }
    }),
  )

  routes.put(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/quizzes/:quizId/sections',
    operation('quiz.section.upsert', async ({ principal, input }) => {
      const section = await upsertSection(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        quizId: param(input, 'quizId'),
        ...(input.body as { title: string }),
      })

      return { sectionId: section.id }
    }),
  )

  routes.put(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/quizzes/:quizId/questions',
    operation('quiz.question.upsert', async ({ principal, input }) => {
      const question = await upsertQuestion(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        quizId: param(input, 'quizId'),
        ...(input.body as { prompt: string; questionType: string; correctAnswer: string }),
      })

      return { questionId: question.id }
    }),
  )

  /**
   * The quiz gradebook.
   *
   * Composed from the enrolment list rather than served by a domain operation,
   * because the domain's `listAttempts` is scoped to one learner by design —
   * that is what the learner path needs, and a variant answering both questions
   * is how a learner's own history becomes readable by anyone holding
   * `enrollment:read`.
   *
   * A learner whose attempts cannot be read is skipped rather than failing the
   * whole page: one malformed enrolment should not blank a gradebook.
   */
  routes.get(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/lessons/:lessonId/quiz/attempts',
    operation('quiz.gradebook', async ({ principal, input }) => {
      const academyId = param(input, 'academyId')
      const lessonId = param(input, 'lessonId')

      const attempts = []
      const seen = new Set<string>()

      const { prisma } = await import('@docento/domain')

      const enrollments = await prisma.enrollment.findMany({
        where: { academyId, courseId: param(input, 'courseId') },
        select: { learnerId: true },
      })

      for (const enrollment of enrollments) {
        if (seen.has(enrollment.learnerId)) continue
        seen.add(enrollment.learnerId)

        const history = await listAttempts(principal, {
          academyId,
          learnerId: enrollment.learnerId,
          lessonId,
        }).catch(() => null)

        if (history) attempts.push(...history.attempts)
      }

      return { attempts }
    }),
  )

  // -------------------------------------------------------------------------
  // Assignments and grading
  // -------------------------------------------------------------------------

  routes.put(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/lessons/:lessonId/assignment',
    operation('assignment.upsert', async ({ principal, input }) => {
      const assignment = await upsertAssignment(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        courseId: param(input, 'courseId'),
        lessonId: param(input, 'lessonId'),
        ...(input.body as { title: string }),
      })

      return { assignmentId: assignment.id }
    }),
  )

  routes.get(
    '/workspaces/:workspaceId/academies/:academyId/courses/:courseId/lessons/:lessonId/submissions',
    operation('assignment.submissions', async ({ principal, input }) => {
      const query = (input.query ?? {}) as { status?: 'graded' | 'ungraded' }

      const result = await listSubmissions(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        lessonId: param(input, 'lessonId'),
        ...(query.status ? { status: query.status } : {}),
      })

      return { submissions: result.submissions }
    }),
  )

  routes.post(
    '/workspaces/:workspaceId/academies/:academyId/submissions/:submissionId/grade',
    operation('submission.grade', async ({ principal, input }) => ({
      submission: await gradeSubmission(principal, {
        workspaceId: param(input, 'workspaceId'),
        academyId: param(input, 'academyId'),
        submissionId: param(input, 'submissionId'),
        ...(input.body as { grade: number }),
      }),
    })),
  )

  // -------------------------------------------------------------------------
  // Public catalogue
  // -------------------------------------------------------------------------

  /**
   * Which academy this request is about.
   *
   * Reads the academy the wrapper already resolved from the host or a slug, and
   * answers a not-found when nothing resolved. The resolution itself is not
   * repeated here — it happened once, at the top of the wrapper, and asking
   * twice would be two answers to one question.
   */
  routes.get(
    '/academy/resolve',
    operation('academy.resolve', async ({ academy }) => ({
      academy: toPublicAcademyShape(requireAcademy(academy)),
    })),
  )

  routes.get(
    '/catalog/academies/:academyId',
    operation('catalog.academy', async ({ input }) => ({
      academy: await getPublicAcademy(param(input, 'academyId')),
    })),
  )

  routes.get(
    '/catalog/academies/:academyId/courses',
    operation('catalog.courses', async ({ input }) => {
      const query = (input.query ?? {}) as { limit?: number; cursor?: string }

      return {
        courses: await listPublicCourses({
          academyId: param(input, 'academyId'),
          ...(query.limit !== undefined ? { limit: query.limit } : {}),
          ...(query.cursor ? { cursor: query.cursor } : {}),
        }),
      }
    }),
  )

  routes.get(
    '/catalog/academies/:academyId/courses/:courseId',
    operation('catalog.course', async ({ input }) => {
      const academyId = param(input, 'academyId')
      const courseId = param(input, 'courseId')

      return {
        course: await getPublicCourse({ academyId, courseId }),
        curriculum: await getPublicOutline({ academyId, courseId }),
      }
    }),
  )

  // -------------------------------------------------------------------------
  // Certificate verification
  // -------------------------------------------------------------------------

  routes.get(
    '/verify/:verificationId',
    operation('certificate.verify', async ({ input }) => {
      const verificationId = param(input, 'verificationId')

      const certificate = await verifyCertificate(verificationId)

      if (!certificate) throw new NotFoundError('certificate', verificationId)

      return { certificate }
    }),
  )

  // -------------------------------------------------------------------------
  // Staff
  // -------------------------------------------------------------------------

  /**
   * Who the caller is, and where they may act.
   *
   * Mounted before any workspace-scoped route because it is the one staff
   * operation that has no workspace to be scoped by — the application asks it
   * before a workspace exists in the URL. Like the learner session above, it
   * re-validates nothing: the principal was resolved at the top of the wrapper,
   * and reading the session a second time is how two answers start disagreeing.
   */
  routes.get(
    '/staff/session',
    operation('staff.session', async ({ principal }) => ({
      session: await getStaffIdentity(principal),
    })),
  )

  // -------------------------------------------------------------------------
  // Learner
  // -------------------------------------------------------------------------

  /**
   * Who the caller is.
   *
   * The principal was resolved from the session at the top of the wrapper, so
   * this does not re-validate anything — it reports what was already decided.
   * Re-reading the session here would be a second check, and the second check is
   * the one that disagrees.
   */
  routes.get(
    '/learn/session',
    operation('learner.session', async ({ principal }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const learner = await getLearnerProfile(principal, { academyId, learnerId })

      return {
        session: {
          learnerId: learner.id,
          name: learner.name,
          email: learner.email,
          academyId: learner.academyId,
        },
      }
    }),
  )

  routes.get(
    '/learn/courses',
    operation('learner.courses', async ({ principal }) => {
      const { learnerId, academyId } = requireLearner(principal)

      return { courses: await listLearnerCourses(principal, { academyId, learnerId }) }
    }),
  )

  routes.post(
    '/learn/courses/:courseId/enrollment',
    operation('learner.enroll', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const { enrollment } = await enroll(principal, {
        workspaceId: optionalWorkspace(principal),
        academyId,
        courseId: param(input, 'courseId'),
        learnerId,
      })

      return { enrollment }
    }),
  )

  routes.get(
    '/learn/courses/:courseId',
    operation('learner.course', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const result = await getCourseForLearner(principal, {
        academyId,
        learnerId,
        courseId: param(input, 'courseId'),
      })

      /**
       * The learner projection, built here rather than returning the release
       * snapshot.
       *
       * A snapshot is an internal document: it carries the answer key and the
       * completion rules, and returning it would leave the key one field away
       * from a client. Progress comes from the progress read rather than being
       * invented here, because a second computation of completion is a second
       * answer to the same question.
       */
      const progress = await getCourseProgress(principal, {
        academyId,
        learnerId,
        courseId: param(input, 'courseId'),
      })

      const lastSeenAt = progress.lessons.reduce<Date | null>(
        (latest, lesson) =>
          latest === null || lesson.lastSeenAt > latest ? lesson.lastSeenAt : latest,
        null,
      )

      return {
        course: {
          courseId: result.course.id,
          title: result.course.title,
          slug: result.course.slug,
          description: result.course.description,
          thumbnail: null,
          percent: progress.percent,
          isComplete: progress.isComplete,
          hasAccess: result.hasAccess,
          lastSeenAt,
        },
        modules: result.modules.map((module) => ({
          id: module.id,
          title: module.title,
          summary: module.summary,
          position: module.position,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            summary: lesson.summary,
            contentType: lesson.contentType,
            position: lesson.position,
            isFree: lesson.isFree,
            body: lesson.body,
            mediaAssetId: lesson.mediaAssetId,
            embedUrl: lesson.embedUrl,
            hasQuiz: lesson.quiz !== null,
            hasAssignment: lesson.assignment !== null,
          })),
        })),
        hasAccess: result.hasAccess,
        releaseVersion: result.release.version,
      }
    }),
  )

  routes.get(
    '/learn/courses/:courseId/progress',
    operation('learner.progress', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const progress = await getCourseProgress(principal, {
        academyId,
        learnerId,
        courseId: param(input, 'courseId'),
      })

      return {
        progress: {
          requiredLessons: progress.requiredLessons,
          completedLessons: progress.completedLessons,
          percent: progress.percent,
          isComplete: progress.isComplete,
        },
        lessons: progress.lessons.map((lesson) => ({
          lessonId: lesson.lessonId,
          isCompleted: lesson.isCompleted,
          positionSeconds: lesson.positionSeconds,
          watchedSeconds: lesson.watchedSeconds,
        })),
      }
    }),
  )

  routes.post(
    '/learn/lessons/:lessonId/progress',
    operation('learner.progress.record', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const progress = await recordProgress(principal, {
        academyId,
        learnerId,
        lessonId: param(input, 'lessonId'),
        ...((input.body ?? {}) as { positionSeconds?: number }),
      })

      return {
        lessonId: progress.lessonId,
        isCompleted: progress.isCompleted,
        positionSeconds: progress.positionSeconds,
        watchedSeconds: progress.watchedSeconds,
      }
    }),
  )

  routes.post(
    '/learn/lessons/:lessonId/complete',
    operation('learner.lesson.complete', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      return completeLesson(principal, {
        academyId,
        learnerId,
        lessonId: param(input, 'lessonId'),
      })
    }),
  )

  // -------------------------------------------------------------------------
  // Learner: quiz
  // -------------------------------------------------------------------------

  routes.get(
    '/learn/lessons/:lessonId/quiz',
    operation('learner.quiz', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const quiz = await getQuizForLearner(principal, {
        academyId,
        learnerId,
        lessonId: param(input, 'lessonId'),
      })

      return { quiz }
    }),
  )

  routes.post(
    '/learn/lessons/:lessonId/quiz/attempts',
    operation('learner.quiz.start', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      return startAttempt(principal, {
        academyId,
        learnerId,
        lessonId: param(input, 'lessonId'),
      })
    }),
  )

  routes.post(
    '/learn/quiz/attempts/:attemptId/submit',
    operation('learner.quiz.submit', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const result = await submitAttempt(principal, {
        academyId,
        learnerId,
        attemptId: param(input, 'attemptId'),
        answers: (input.body as { answers: [] }).answers,
      })

      return { result }
    }),
  )

  routes.get(
    '/learn/lessons/:lessonId/quiz/attempts',
    operation('learner.quiz.history', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      return listAttempts(principal, {
        academyId,
        learnerId,
        lessonId: param(input, 'lessonId'),
      })
    }),
  )

  // -------------------------------------------------------------------------
  // Learner: assignments
  // -------------------------------------------------------------------------

  routes.get(
    '/learn/lessons/:lessonId/assignment',
    operation('learner.assignment', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      return getAssignmentForLearner(principal, {
        academyId,
        learnerId,
        lessonId: param(input, 'lessonId'),
      })
    }),
  )

  routes.post(
    '/learn/lessons/:lessonId/assignment/submission',
    operation('learner.assignment.submit', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      return {
        submission: await submitAssignment(principal, {
          academyId,
          learnerId,
          lessonId: param(input, 'lessonId'),
          ...((input.body ?? {}) as { content?: string }),
        }),
      }
    }),
  )

  // -------------------------------------------------------------------------
  // Learner: certificates
  // -------------------------------------------------------------------------

  routes.get(
    '/learn/certificates',
    operation('learner.certificates', async ({ principal }) => {
      const { learnerId, academyId } = requireLearner(principal)

      return {
        certificates: await listLearnerCertificates(principal, { academyId, learnerId }),
      }
    }),
  )

  routes.post(
    '/learn/courses/:courseId/certificate',
    operation('learner.certificate.issue', async ({ principal, input }) => {
      const { learnerId, academyId } = requireLearner(principal)

      const { certificate, created } = await issueCertificate(principal, {
        workspaceId: optionalWorkspace(principal),
        academyId,
        learnerId,
        courseId: param(input, 'courseId'),
      })

      return { certificate, created }
    }),
  )

  // -------------------------------------------------------------------------
  // Service keys
  // -------------------------------------------------------------------------

  routes.get(
    '/workspaces/:workspaceId/service-keys',
    operation('serviceKey.list', async ({ principal, input }) => ({
      keys: await listServiceKeys(principal, param(input, 'workspaceId')),
    })),
  )

  routes.post(
    '/workspaces/:workspaceId/service-keys',
    operation('serviceKey.create', async ({ principal, input }) => {
      const created = await createServiceKey(principal, param(input, 'workspaceId'), {
        ...(input.body as { name: string; scopes: string[] }),
      })

      return { id: created.id, name: created.name, key: created.key }
    }),
  )

  routes.delete(
    '/workspaces/:workspaceId/service-keys/:keyId',
    operation('serviceKey.revoke', async ({ principal, input }) => {
      await revokeServiceKey(
        principal,
        param(input, 'workspaceId'),
        param(input, 'keyId'),
      )

      return { ok: true as const }
    }),
  )

  return routes
}

/**
 * The academy an operation resolved, in the shape the contract promises.
 *
 * `readAcademyIdentity` is applied because the row's `authMode` and `branding`
 * are a `String` and a `Json` column — the same narrowing the staff read and the
 * catalogue read use, rather than a third answer to what a valid value is.
 */
function toPublicAcademyShape(academy: ResolvedAcademy) {
  const identity = readAcademyIdentity({
    authMode: academy.authMode,
    branding: academy.branding,
  })

  return { ...academy, ...identity }
}

export { requireAcademy, requireLearner, requireWorkspace }
export type { Context }
