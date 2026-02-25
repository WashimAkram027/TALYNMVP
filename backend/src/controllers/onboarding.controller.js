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
  }
}
