import { Router } from 'express'
import { onboardingController } from '../controllers/onboarding.controller.js'
import { authenticate, requireEmployer } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  employerOnboardingProfileSchema,
  employerOnboardingServiceSchema,
  orgProfileEnrichmentSchema,
  entityDocumentUploadSchema
} from '../utils/validators.js'

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

// Dashboard onboarding checklist
router.get('/employer/checklist', onboardingController.getChecklist)
router.post('/employer/org-profile', validate(orgProfileEnrichmentSchema), onboardingController.completeOrgProfile)
router.post('/employer/entity-document', validate(entityDocumentUploadSchema), onboardingController.uploadEntityDocument)
router.delete('/employer/entity-document/:docType', onboardingController.deleteEntityDocument)
router.post('/employer/submit-entity', onboardingController.submitEntity)

export default router
