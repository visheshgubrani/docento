import { Router } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import * as moduleController from '../controllers/module.controller'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'
import { resolveModuleContext } from '../middlewares/resolveModuleContext'

const router = Router({ mergeParams: true })

router.use(authorizeProjectAccess)
router.use(resolveCourseContext)

// Module CRUD
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules:
 *   get:
 *     tags: [Modules]
 *     summary: List modules
 *     description: Retrieves modules for a course in order, including lesson counts.
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
 *         description: Modules fetched successfully
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
 *                     modules:
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
 *                           order:
 *                             type: number
 *                           lessons:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 title:
 *                                   type: string
 *                                 contentType:
 *                                   type: string
 *                                 duration:
 *                                   type: number
 *                                   nullable: true
 *                                 isFree:
 *                                   type: boolean
 *                                 order:
 *                                   type: number
 *                           _count:
 *                             type: object
 *                             properties:
 *                               lessons:
 *                                 type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/', moduleController.getModules)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules:
 *   post:
 *     tags: [Modules]
 *     summary: Create module
 *     description: Creates a new module within a course.
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
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Module created successfully
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
 *                     module:
 *                       type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', moduleController.createModule)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}:
 *   get:
 *     tags: [Modules]
 *     summary: Get module
 *     description: Retrieves a module with lessons and course context.
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
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module fetched successfully
 *       404:
 *         description: Module not found
 */
router.get('/:moduleId', resolveModuleContext, moduleController.getModule)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}:
 *   patch:
 *     tags: [Modules]
 *     summary: Update module
 *     description: Updates module fields such as title, description, or order.
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
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
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
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Module updated successfully
 *       400:
 *         description: At least one field is required to update
 *       404:
 *         description: Module not found
 */
router.patch('/:moduleId', resolveModuleContext, moduleController.updateModule)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}:
 *   delete:
 *     tags: [Modules]
 *     summary: Delete module
 *     description: Permanently deletes a module and its lessons.
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
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module deleted successfully
 *       404:
 *         description: Module not found
 */
router.delete('/:moduleId', resolveModuleContext, moduleController.deleteModule)

// Reorder
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/reorder:
 *   post:
 *     tags: [Modules]
 *     summary: Reorder modules
 *     description: Reorders modules within a course.
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
 *             required: [moduleOrders]
 *             properties:
 *               moduleOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: number
 *     responses:
 *       200:
 *         description: Modules reordered successfully
 *       400:
 *         description: Invalid moduleOrders payload
 */
router.post('/reorder', moduleController.reorderModules)

export default router
