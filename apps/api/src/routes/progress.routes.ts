import { Router } from 'express'
import {
  authorizeLessonAccess,
  verifyManagedUser,
} from '../middlewares/auth.middleware'
import { updateProgress } from '../controllers/progress.controller'

const router = Router()

router
  .route('/lessons/:lessonId/progress')
  .post(verifyManagedUser, authorizeLessonAccess, updateProgress)

export default router
