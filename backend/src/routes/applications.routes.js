import { Router } from 'express'
import { applicationsController } from '../controllers/applications.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { applyToJobSchema, moveStageSchema, updateApplicationSchema } from '../utils/validators.js'

const router = Router()

router.use(authenticate)

// Candidate routes (no org required)
router.get('/my', applicationsController.getMy)
router.post('/apply', validateBody(applyToJobSchema), applicationsController.apply)
router.get('/check/:jobId', applicationsController.checkApplied)

// Organization routes
router.use(requireOrganization)

router.get('/job/:jobId', applicationsController.getByJob)
router.get('/pipeline-summary', applicationsController.getPipelineSummary)
router.get('/:id', applicationsController.getById)
router.get('/:id/activity', applicationsController.getActivity)
router.put('/:id', validateBody(updateApplicationSchema), applicationsController.update)
router.put('/:id/stage', validateBody(moveStageSchema), applicationsController.moveStage)

export default router
