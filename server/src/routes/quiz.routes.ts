// routes/quiz.routes.ts
import { Router } from 'express'
import { authorizeProjectAccess } from '../middlewares/auth.middleware'
import { resolveCourseContext } from '../middlewares/resolveCourseContext'
import { resolveModuleContext } from '../middlewares/resolveModuleContext'
import { resolveLessonContext } from '../middlewares/resolveLessonContext'
import { resolveQuizContext } from '../middlewares/resolveQuizContext'
import * as quizController from '../controllers/quiz.controller'

const router = Router({ mergeParams: true })

// Chain: project → course → module → lesson ownership
router.use(authorizeProjectAccess)
router.use(resolveCourseContext)
router.use(resolveModuleContext)
router.use(resolveLessonContext)

// ===== QUIZ ROUTES (One-to-One with Lesson) =====
// Much simpler! No :quizId in URL

// Get/Create/Update/Delete quiz for a lesson
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz
 *     description: Returns the quiz for a lesson (or null if not created).
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Quiz fetched successfully
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
 *                     quiz:
 *                       type: object
 *                       nullable: true
 */
router.get('/', quizController.getQuiz) // GET quiz or null
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes:
 *   post:
 *     tags: [Quizzes]
 *     summary: Create quiz
 *     description: Creates a quiz for a lesson (one quiz per lesson).
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
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
 *               passingScore:
 *                 type: number
 *                 description: 0-100
 *               maxAttempts:
 *                 type: number
 *               timeLimit:
 *                 type: number
 *                 description: Minutes
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', quizController.createQuiz) // CREATE quiz (fails if exists)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes:
 *   patch:
 *     tags: [Quizzes]
 *     summary: Update quiz
 *     description: Updates quiz settings for a lesson.
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
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
 *               passingScore:
 *                 type: number
 *                 description: 0-100
 *               maxAttempts:
 *                 type: number
 *               timeLimit:
 *                 type: number
 *                 description: Minutes
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       400:
 *         description: At least one field is required to update
 *       404:
 *         description: Quiz not found
 */
router.patch('/', quizController.updateQuiz) // UPDATE quiz (fails if not exists)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes:
 *   delete:
 *     tags: [Quizzes]
 *     summary: Delete quiz
 *     description: Deletes the quiz for a lesson.
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
 *       404:
 *         description: Quiz not found
 */
router.delete('/', quizController.deleteQuiz) // DELETE quiz

// Quiz statistics
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/stats:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz statistics
 *     description: Returns aggregate quiz performance stats for the lesson.
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     responses:
 *       200:
 *         description: Quiz statistics fetched successfully
 *       404:
 *         description: Quiz not found
 */
router.get('/stats', quizController.getQuizStats)

// ===== QUESTION ROUTES =====
// Questions belong to the lesson's quiz

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/questions:
 *   post:
 *     tags: [Quizzes]
 *     summary: Create question
 *     description: Adds a question to the lesson quiz.
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionText, questionType, correctAnswer]
 *             properties:
 *               questionText:
 *                 type: string
 *               questionType:
 *                 type: string
 *                 enum: [MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE, SHORT_ANSWER, INTEGER]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *                 description: For single-answer types (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, INTEGER)
 *               correctAnswers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: For MULTI_SELECT - array of correct options
 *               explanation:
 *                 type: string
 *               points:
 *                 type: number
 *               negativePoints:
 *                 type: number
 *                 description: Deduction for wrong answer (overrides quiz default)
 *               partialMarking:
 *                 type: boolean
 *                 description: Enable JEE Advanced partial credit for MULTI_SELECT
 *     responses:
 *       201:
 *         description: Question created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: No quiz found for this lesson
 */
router.post('/questions', quizController.createQuestion)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/questions/{questionId}:
 *   patch:
 *     tags: [Quizzes]
 *     summary: Update question
 *     description: Updates a quiz question.
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *       - name: questionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionText:
 *                 type: string
 *               questionType:
 *                 type: string
 *                 enum: [MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE, SHORT_ANSWER, INTEGER]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *               correctAnswers:
 *                 type: array
 *                 items:
 *                   type: string
 *               explanation:
 *                 type: string
 *               points:
 *                 type: number
 *               negativePoints:
 *                 type: number
 *               partialMarking:
 *                 type: boolean
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       400:
 *         description: At least one field is required to update
 *       404:
 *         description: Question not found in this quiz
 */
router.patch('/questions/:questionId', quizController.updateQuestion)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/questions/{questionId}:
 *   delete:
 *     tags: [Quizzes]
 *     summary: Delete question
 *     description: Deletes a question from the quiz.
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *       - name: questionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       404:
 *         description: Question not found in this quiz
 */
router.delete('/questions/:questionId', quizController.deleteQuestion)
/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/questions/reorder:
 *   post:
 *     tags: [Quizzes]
 *     summary: Reorder questions
 *     description: Reorders quiz questions for a lesson.
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
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionOrders]
 *             properties:
 *               questionOrders:
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
 *         description: Questions reordered successfully
 *       400:
 *         description: Invalid questionOrders payload
 */
router.post('/questions/reorder', quizController.reorderQuestions)

// ===== SECTION ROUTES (Mock Tests) =====

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/sections:
 *   get:
 *     tags: [Quizzes]
 *     summary: List sections
 *     description: Returns all sections for the quiz with question counts.
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
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sections fetched successfully
 *       404:
 *         description: Quiz not found
 */
router.get('/sections', quizController.listSections)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/sections:
 *   post:
 *     tags: [Quizzes]
 *     summary: Create section
 *     description: Creates a new section in the quiz for mock test grouping.
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
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
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
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Section created successfully
 *       400:
 *         description: Title is required
 *       404:
 *         description: Quiz not found
 */
router.post('/sections', quizController.createSection)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/sections/{sectionId}:
 *   patch:
 *     tags: [Quizzes]
 *     summary: Update section
 *     description: Updates a quiz section's title or order.
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
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: sectionId
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
 *             properties:
 *               title:
 *                 type: string
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Section updated successfully
 *       404:
 *         description: Section not found
 */
router.patch('/sections/:sectionId', quizController.updateSection)

/**
 * @openapi
 * /projects/{projectId}/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quizzes/sections/{sectionId}:
 *   delete:
 *     tags: [Quizzes]
 *     summary: Delete section
 *     description: Deletes a quiz section. Questions in this section are unlinked, not deleted.
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
 *       - name: moduleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: sectionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section deleted successfully
 *       404:
 *         description: Section not found
 */
router.delete('/sections/:sectionId', quizController.deleteSection)

export default router
