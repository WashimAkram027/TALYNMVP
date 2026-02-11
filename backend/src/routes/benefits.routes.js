import { Router } from 'express'
import { benefitsController } from '../controllers/benefits.controller.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireOrganization)

// Plans
router.get('/plans', benefitsController.getPlans)
router.get('/plans/:id', benefitsController.getPlan)
router.get('/plans/:planId/enrollments', benefitsController.getPlanEnrollments)
router.post('/plans', benefitsController.createPlan)
router.put('/plans/:id', benefitsController.updatePlan)
router.delete('/plans/:id', benefitsController.deletePlan)

// Enrollments
router.get('/member/:memberId/enrollments', benefitsController.getMemberEnrollments)
router.get('/member/:memberId/coverage', benefitsController.getActiveCoverage)
router.post('/enrollments', benefitsController.enrollMember)
router.put('/enrollments/:id', benefitsController.updateEnrollment)
router.put('/enrollments/:id/cancel', benefitsController.cancelEnrollment)

export default router
