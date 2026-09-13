import { Router } from 'express'

import projectRoutes from './projects.routes'
import securityRoutes from './security.routes'
import courseRoutes from './course.routes'
import moduleRoutes from './module.routes'
import lessonRoutes from './lesson.routes'
import enrollmentRoutes from './enrollment.routes'
import videoRoutes from './video.routes'
import uploadRoutes from './upload.routes'
import storefrontRoutes from './storefront.routes'
import progressRoutes from './progress.routes'
import authRoutes from './user.routes'
import delegatedRoutes from './delegatedUser.routes'
import studentRoutes from './student.routes'
import certificateRoutes from './certificate.routes'
import quizRoutes from './quiz.routes'
import callbackRoutes from './callbacks.routes'
import billingRoutes from './billing.routes'
import commerceRoutes from './commerce.routes'
import aiRoutes from './ai.routes'
import assignmentRoutes from './assignment.routes'
import couponRoutes from './coupon.routes'

const router = Router()

router.use('/projects', projectRoutes)
router.use('/projects', securityRoutes)
router.use('/projects/:projectId/coupons', couponRoutes)
// Courses (nested under projects)
router.use('/projects/:projectId/courses', courseRoutes)
// Modules (nested under courses)
router.use('/projects/:projectId/courses/:courseId/modules', moduleRoutes)
// Lessons (nested under modules)
router.use(
  '/projects/:projectId/courses/:courseId/modules/:moduleId/lessons',
  lessonRoutes
)

// Video upload (nested under lessons)
router.use(
  '/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId',
  videoRoutes
)
router.use(
  '/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/uploads',
  uploadRoutes
)

// Enrollments (nested under courses)
router.use(
  '/projects/:projectId/courses/:courseId/enrollments',
  enrollmentRoutes
)

router.use('/billing', billingRoutes)

// ===== END-USER ROUTES =====
// Managed user authentication
router.use('/auth', authRoutes)
// Delegated user routes
router.use('/delegated', delegatedRoutes)
router.use('/', progressRoutes)

// Progress tracking
// router.use('/student', progressRoutes)
router.use('/student', studentRoutes)
router.use('/student', certificateRoutes)
router.use(
  '/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/quizzes',
  quizRoutes
)
router.use(
  '/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/assignments',
  assignmentRoutes
)
router.use('/storefront', storefrontRoutes)
router.use('/commerce', commerceRoutes)
router.use('/callback', callbackRoutes)

// AI routes (project-level for course generation)
router.use('/projects/:projectId/ai', aiRoutes)

// AI routes (nested under lessons for video-related AI features)
router.use(
  '/projects/:projectId/courses/:courseId/modules/:moduleId/lessons/:lessonId/ai',
  aiRoutes
)

export default router
