import { Router } from 'express'
import { onboardingController } from '../controllers/onboarding.controller.js'
import { authenticate, requireEmployer } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { employerOnboardingProfileSchema, employerOnboardingServiceSchema } from '../utils/validators.js'

const router = Router()

// All onboarding routes require authentication + employer role
router.use(authenticate)
router.use(requireEmployer)

// Step 1: Complete profile + create organization
router.post('/employer/profile', validate(employerOnboardingProfileSchema), onboardingController.completeProfile)

// Step 2: Select service type
router.post('/employer/service', validate(employerOnboardingServiceSchema), onboardingController.selectService)

// Get current onboarding status
router.get('/employer/status', onboardingController.getOnboardingStatus)

export default router
