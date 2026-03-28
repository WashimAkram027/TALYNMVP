import { Router } from 'express'
import { onboardingController } from '../controllers/onboarding.controller.js'
import { authenticate, requireEmployer, requireCandidate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  employerOnboardingProfileSchema,
  employerOnboardingServiceSchema,
  orgProfileEnrichmentSchema,
  entityDocumentUploadSchema,
  employeeAdvanceStepSchema,
  employeeBankDetailsSchema,
  employeePersonalInfoSchema,
  employeeEmergencyContactSchema,
  employeeTaxInfoSchema,
  employeeDocumentUploadSchema
} from '../utils/validators.js'

const router = Router()

// All onboarding routes require authentication
router.use(authenticate)

// === Employer routes ===
router.post('/employer/profile', requireEmployer, validate(employerOnboardingProfileSchema), onboardingController.completeProfile)
router.post('/employer/service', requireEmployer, validate(employerOnboardingServiceSchema), onboardingController.selectService)
router.get('/employer/status', requireEmployer, onboardingController.getOnboardingStatus)
router.get('/employer/checklist', requireEmployer, onboardingController.getChecklist)
router.post('/employer/org-profile', requireEmployer, validate(orgProfileEnrichmentSchema), onboardingController.completeOrgProfile)
router.post('/employer/entity-document', requireEmployer, validate(entityDocumentUploadSchema), onboardingController.uploadEntityDocument)
router.delete('/employer/entity-document/:docType', requireEmployer, onboardingController.deleteEntityDocument)
router.post('/employer/submit-entity', requireEmployer, onboardingController.submitEntity)

// === Employee routes ===
router.get('/employee/status', requireCandidate, onboardingController.getEmployeeOnboardingStatus)
router.post('/employee/advance-step', requireCandidate, validate(employeeAdvanceStepSchema), onboardingController.advanceEmployeeStep)
router.post('/employee/personal-info', requireCandidate, validate(employeePersonalInfoSchema), onboardingController.submitPersonalInfo)
router.post('/employee/emergency-contact', requireCandidate, validate(employeeEmergencyContactSchema), onboardingController.submitEmergencyContact)
router.post('/employee/tax-info', requireCandidate, validate(employeeTaxInfoSchema), onboardingController.submitTaxInfo)
router.post('/employee/document', requireCandidate, validate(employeeDocumentUploadSchema), onboardingController.uploadEmployeeDocument)
router.post('/employee/complete-documents', requireCandidate, onboardingController.completeDocumentStep)
router.post('/employee/bank-details', requireCandidate, validate(employeeBankDetailsSchema), onboardingController.submitEmployeeBankDetails)

export default router
