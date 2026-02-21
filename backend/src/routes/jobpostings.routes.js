import { Router } from 'express'
import { jobPostingsController } from '../controllers/jobpostings.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validateBody, validateQuery } from '../middleware/validate.js'
import { createJobPostingSchema, updateJobPostingSchema, jobPostingFiltersSchema } from '../utils/validators.js'

const router = Router()

// Public route (no auth required)
router.get('/public', jobPostingsController.getPublic)

// Protected routes
router.use(authenticate)
router.use(requireOrganization)

router.get('/', validateQuery(jobPostingFiltersSchema), jobPostingsController.getAll)
router.get('/departments', jobPostingsController.getDepartments)
router.get('/:id', jobPostingsController.getById)
router.post('/', validateBody(createJobPostingSchema), jobPostingsController.create)
router.put('/:id', validateBody(updateJobPostingSchema), jobPostingsController.update)
router.delete('/:id', jobPostingsController.delete)

export default router
