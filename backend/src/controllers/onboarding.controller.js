import { onboardingService } from '../services/onboarding.service.js'
import { successResponse } from '../utils/response.js'

export const onboardingController = {
  /**
   * GET /api/onboarding/employee/quote-and-job
   */
  async getEmployeeQuoteAndJob(req, res, next) {
    try {
      const result = await onboardingService.getEmployeeQuoteAndJob(req.user.id)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/verify-quote
   */
  async verifyEmployeeQuote(req, res, next) {
    try {
      const { verified, discrepancyNote } = req.body
      const result = await onboardingService.verifyEmployeeQuote(req.user.id, verified, discrepancyNote)
      return successResponse(res, result, verified ? 'Employment details verified' : 'Discrepancy flagged')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/onboarding/employee/status
   */
  async getEmployeeOnboardingStatus(req, res, next) {
    try {
      const result = await onboardingService.getEmployeeOnboardingStatus(req.user.id)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/advance-step
   */
  async advanceEmployeeStep(req, res, next) {
    try {
      const result = await onboardingService.advanceEmployeeStep(req.user.id, req.body.currentStep)
      return successResponse(res, result, 'Step advanced')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/bank-details
   */
  async submitEmployeeBankDetails(req, res, next) {
    try {
      const result = await onboardingService.completeEmployeeBankDetails(req.user.id, req.body)
      return successResponse(res, result, 'Bank details saved and onboarding completed')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/personal-info
   */
  async submitPersonalInfo(req, res, next) {
    try {
      const result = await onboardingService.completeEmployeePersonalInfo(req.user.id, req.body)
      return successResponse(res, result, 'Personal information saved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/emergency-contact
   */
  async submitEmergencyContact(req, res, next) {
    try {
      const result = await onboardingService.completeEmployeeEmergencyContact(req.user.id, req.body)
      return successResponse(res, result, 'Emergency contact saved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/tax-info
   */
  async submitTaxInfo(req, res, next) {
    try {
      const result = await onboardingService.completeEmployeeTaxInfo(req.user.id, req.body)
      return successResponse(res, result, 'Tax information saved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/document
   */
  async uploadEmployeeDocument(req, res, next) {
    try {
      const result = await onboardingService.uploadEmployeeDocument(req.user.id, req.body)
      return successResponse(res, result, 'Document uploaded')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employee/complete-documents
   */
  async completeDocumentStep(req, res, next) {
    try {
      const result = await onboardingService.completeEmployeeDocumentStep(req.user.id)
      return successResponse(res, result, 'Document step completed')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/onboarding/employee/tasks
   * Get pending onboarding tasks (documents, banking) for dashboard checklist
   */
  async getEmployeeOnboardingTasks(req, res, next) {
    try {
      const result = await onboardingService.getEmployeeOnboardingTasks(req.user.id)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employer/profile - Step 1
   */
  async completeProfile(req, res, next) {
    try {
      const result = await onboardingService.completeEmployerProfile(req.user.id, req.body)
      return successResponse(res, result, 'Profile and organization created successfully')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employer/service - Step 2
   */
  async selectService(req, res, next) {
    try {
      const result = await onboardingService.selectService(req.user.id, req.body.serviceType)
      return successResponse(res, result, 'Service selected and onboarding completed')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/onboarding/employer/status
   */
  async getOnboardingStatus(req, res, next) {
    try {
      const result = await onboardingService.getOnboardingStatus(req.user.id)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/onboarding/employer/checklist
   */
  async getChecklist(req, res, next) {
    try {
      if (!req.user.organizationId) {
        return successResponse(res, null, 'No organization found')
      }
      const result = await onboardingService.getChecklistStatus(req.user.id, req.user.organizationId)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employer/org-profile
   */
  async completeOrgProfile(req, res, next) {
    try {
      const result = await onboardingService.completeOrgProfile(req.user.id, req.user.organizationId, req.body)
      return successResponse(res, result, 'Organization profile updated')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employer/entity-document
   */
  async uploadEntityDocument(req, res, next) {
    try {
      const result = await onboardingService.uploadEntityDocument(req.user.id, req.user.organizationId, req.body)
      return successResponse(res, result, 'Document uploaded')
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /api/onboarding/employer/entity-document/:docType
   */
  async deleteEntityDocument(req, res, next) {
    try {
      const result = await onboardingService.deleteEntityDocument(req.user.id, req.user.organizationId, req.params.docType)
      return successResponse(res, result, 'Document deleted')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/onboarding/employer/submit-entity
   */
  async submitEntity(req, res, next) {
    try {
      const result = await onboardingService.submitEntityForReview(req.user.id, req.user.organizationId)
      return successResponse(res, result, 'Entity submitted for review')
    } catch (error) {
      next(error)
    }
  }
}
