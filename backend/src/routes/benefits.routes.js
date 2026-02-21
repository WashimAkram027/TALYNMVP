import { Router } from 'express'
import { benefitsController } from '../controllers/benefits.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createBenefitsPlanSchema, updateBenefitsPlanSchema, enrollMemberSchema, updateEnrollmentSchema } from '../utils/validators.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

// Plans
router.get('/plans', benefitsController.getPlans)
router.get('/plans/:id', benefitsController.getPlan)
router.get('/plans/:planId/enrollments', benefitsController.getPlanEnrollments)
router.post('/plans', validateBody(createBenefitsPlanSchema), benefitsController.createPlan)
router.put('/plans/:id', validateBody(updateBenefitsPlanSchema), benefitsController.updatePlan)
router.delete('/plans/:id', benefitsController.deletePlan)

// Enrollments
router.get('/member/:memberId/enrollments', benefitsController.getMemberEnrollments)
router.get('/member/:memberId/coverage', benefitsController.getActiveCoverage)
router.post('/enrollments', validateBody(enrollMemberSchema), benefitsController.enrollMember)
router.put('/enrollments/:id', validateBody(updateEnrollmentSchema), benefitsController.updateEnrollment)
router.put('/enrollments/:id/cancel', benefitsController.cancelEnrollment)

export default router
