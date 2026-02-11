import { Router } from 'express'
import { jobPostingsController } from '../controllers/jobpostings.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'

const router = Router()

// Public route (no auth required)
router.get('/public', jobPostingsController.getPublic)

// Protected routes
router.use(authenticate)
router.use(requireOrganization)

router.get('/', jobPostingsController.getAll)
router.get('/departments', jobPostingsController.getDepartments)
router.get('/:id', jobPostingsController.getById)
router.post('/', jobPostingsController.create)
router.put('/:id', jobPostingsController.update)
router.delete('/:id', jobPostingsController.delete)

export default router
