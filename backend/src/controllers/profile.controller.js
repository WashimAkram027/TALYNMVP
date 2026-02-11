import { profileService } from '../services/profile.service.js'
import { successResponse, badRequestResponse } from '../utils/response.js'

/**
 * Profile controller - handles profile HTTP requests
 */
export const profileController = {
  /**
   * GET /api/profile
   */
  async getProfile(req, res, next) {
    try {
      const profile = await profileService.getProfile(req.user.id)
      return successResponse(res, profile)
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /api/profile
   */
  async updateProfile(req, res, next) {
    try {
      const profile = await profileService.updateProfile(req.user.id, req.body)
      return successResponse(res, profile, 'Profile updated')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/profile/complete-employer
   */
  async completeEmployer(req, res, next) {
    try {
      const profile = await profileService.completeEmployerSignup(req.user.id, req.body)
      return successResponse(res, profile, 'Employer signup completed')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/profile/complete-candidate
   */
  async completeCandidate(req, res, next) {
    try {
      const profile = await profileService.completeCandidateSignup(req.user.id, req.body)
      return successResponse(res, profile, 'Candidate signup completed')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/profile/check-email
   */
  async checkEmail(req, res, next) {
    try {
      const { email } = req.body
      const exists = await profileService.checkEmailExists(email)
      return successResponse(res, { exists })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/profile/avatar
   * Accepts multipart/form-data with 'file' field
   */
  async uploadAvatar(req, res, next) {
    try {
      console.log('[ProfileController] Avatar upload request received')
      console.log('[ProfileController] File:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file')

      if (!req.file) {
        return badRequestResponse(res, 'No file provided')
      }

      const result = await profileService.uploadAvatar(req.user.id, req.file.buffer, req.file.originalname)
      return successResponse(res, result, 'Avatar uploaded')
    } catch (error) {
      console.error('[ProfileController] Avatar upload error:', error)
      next(error)
    }
  },

  /**
   * POST /api/profile/resume
   * Accepts multipart/form-data with 'file' field
   */
  async uploadResume(req, res, next) {
    try {
      console.log('[ProfileController] Resume upload request received')
      console.log('[ProfileController] File:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file')

      if (!req.file) {
        return badRequestResponse(res, 'No file provided')
      }

      const result = await profileService.uploadResume(req.user.id, req.file.buffer, req.file.originalname)
      return successResponse(res, result, 'Resume uploaded')
    } catch (error) {
      console.error('[ProfileController] Resume upload error:', error)
      next(error)
    }
  }
}
