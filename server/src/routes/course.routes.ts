import { Router } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import * as courseController from '../controllers/course.controller'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'

const router = Router({ mergeParams: true })

router.use(authorizeProjectAccess)

// List and create courses
/**
 * @openapi
 * /projects/{projectId}/courses:
 *   get:
 *     tags: [Courses]
 *     summary: List courses
 *     description: Retrieves courses for the specified project, optionally filtered by publish status.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: isPublished
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by publish status
 *     responses:
 *       200:
 *         description: Courses fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     courses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           thumbnail:
 *                             type: string
 *                             nullable: true
 *                           category:
 *                             type: array
 *                             items:
 *                               type: string
 *                           instructors:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 avatar:
 *                                   type: string
 *                                   nullable: true
 *                                 role:
 *                                   type: string
 *                                   nullable: true
 *                                 description:
 *                                   type: string
 *                                   nullable: true
 *                           price:
 *                             type: number
 *                             nullable: true
 *                           isPublished:
 *                             type: boolean
 *                           slug:
 *                             type: string
 *                           _count:
 *                             type: object
 *                             properties:
 *                               modules:
 *                                 type: number
 *                               enrollments:
 *                                 type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/', courseController.getCourses)
/**
 * @openapi
 * /projects/{projectId}/courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create course
 *     description: Creates a new course under the specified project.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Intro to Product Management
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *               instructors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name]
 *                   properties:
 *                     name:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *               isPublished:
 *                 type: boolean
 *               price:
 *                 type: number
 *               enrollmentValidityDays:
 *                 type: integer
 *                 nullable: true
 *                 description: Access window in days from enrollment. Use null for lifetime access.
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     course:
 *                       type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', courseController.createCourse)

// Individual course operations
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}:
 *   get:
 *     tags: [Courses]
 *     summary: Get course details
 *     description: Retrieves a course with modules and lessons.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     course:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         thumbnail:
 *                           type: string
 *                           nullable: true
 *                         category:
 *                           type: array
 *                           items:
 *                             type: string
 *                         instructors:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                                 nullable: true
 *                               role:
 *                                 type: string
 *                                 nullable: true
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                         price:
 *                           type: number
 *                           nullable: true
 *                         isPublished:
 *                           type: boolean
 *                         slug:
 *                           type: string
 *                         modules:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                               order:
 *                                 type: number
 *                               lessons:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     title:
 *                                       type: string
 *                                     description:
 *                                       type: string
 *                                       nullable: true
 *                                     contentType:
 *                                       type: string
 *                                     videoUrl:
 *                                       type: string
 *                                       nullable: true
 *                                     textContent:
 *                                       type: string
 *                                       nullable: true
 *                                     fileUrl:
 *                                       type: string
 *                                       nullable: true
 *                                     duration:
 *                                       type: number
 *                                       nullable: true
 *                                     isFree:
 *                                       type: boolean
 *                                     order:
 *                                       type: number
 *       404:
 *         description: Course not found
 */
router.get('/:courseId', resolveCourseContext, courseController.getCourse)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}:
 *   patch:
 *     tags: [Courses]
 *     summary: Update course
 *     description: Updates course fields such as title, description, price, thumbnail, category, structured instructors, or publish status.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *               instructors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name]
 *                   properties:
 *                     name:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *               isPublished:
 *                 type: boolean
 *               price:
 *                 type: number
 *               enrollmentValidityDays:
 *                 type: integer
 *                 nullable: true
 *                 description: Access window in days from enrollment. Use null for lifetime access.
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       400:
 *         description: Please provide at least one field to update
 *       404:
 *         description: Course not found
 */
router.patch('/:courseId', resolveCourseContext, courseController.updateCourse)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}:
 *   delete:
 *     tags: [Courses]
 *     summary: Delete course
 *     description: Permanently deletes a course and its related content.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 */
router.delete('/:courseId', resolveCourseContext, courseController.deleteCourse)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/publish:
 *   post:
 *     tags: [Courses]
 *     summary: Toggle publish status
 *     description: Publishes or unpublishes a course.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course publish status updated
 *       404:
 *         description: Course not found
 */
router.post(
  '/:courseId/publish',
  resolveCourseContext,
  courseController.togglePublishCourse,
)

// Thumbnail upload presign
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/thumbnail/presign:
 *   post:
 *     tags: [Courses]
 *     summary: Create thumbnail upload URL
 *     description: Generates a presigned URL for uploading a course thumbnail.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName]
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: thumbnail.jpg
 *               contentType:
 *                 type: string
 *                 example: image/jpeg
 *     responses:
 *       200:
 *         description: Presigned upload URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     presignedUrl:
 *                       type: string
 *                     fileUrl:
 *                       type: string
 *                     key:
 *                       type: string
 *                     method:
 *                       type: string
 *                       example: PUT
 *                     headers:
 *                       type: object
 *       400:
 *         description: fileName is required
 *       500:
 *         description: Storage provider is not configured
 */
router.post(
  '/:courseId/thumbnail/presign',
  resolveCourseContext,
  courseController.createThumbnailUpload,
)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/instructors/avatar/presign:
 *   post:
 *     tags: [Courses]
 *     summary: Create instructor avatar upload URL
 *     description: Generates a presigned URL for uploading an instructor avatar image.
 *     security:
 *       - ApiKeyAuth: []
 *       - OwnerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName]
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: instructor-avatar.jpg
 *               contentType:
 *                 type: string
 *                 example: image/jpeg
 *     responses:
 *       200:
 *         description: Presigned upload URL generated
 *       400:
 *         description: fileName is required
 *       500:
 *         description: Storage provider is not configured
 */
router.post(
  '/:courseId/instructors/avatar/presign',
  resolveCourseContext,
  courseController.createInstructorAvatarUpload,
)

// TODO: PUBLISH ROUTE
export default router
