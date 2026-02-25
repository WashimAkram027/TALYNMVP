import { onboardingService } from '../services/onboarding.service.js'
import { successResponse } from '../utils/response.js'

export const onboardingController = {
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
