import { authService } from '../services/auth.service.js'
import { successResponse, createdResponse, badRequestResponse } from '../utils/response.js'

/**
 * Auth controller - handles auth HTTP requests
 */
export const authController = {
  /**
   * POST /api/auth/signup
   */
  async signup(req, res, next) {
    try {
      const result = await authService.signup(req.body)

      return createdResponse(res, {
        user: {
          id: result.user.id,
          email: result.user.email
        },
        profile: result.profile,
        token: result.token,
        requiresVerification: result.requiresVerification
      }, 'Account created successfully. Please check your email to verify your account.')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/auth/verify-email
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.query
      if (!token) {
        return badRequestResponse(res, 'Verification token is required')
      }

      const result = await authService.verifyEmail(token)
      return successResponse(res, result, 'Email verified successfully')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/resend-verification
   */
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body
      await authService.resendVerificationEmail(email)
      return successResponse(res, null, 'If the email exists and is not verified, a new verification email has been sent')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body)

      return successResponse(res, {
        user: {
          id: result.user.id,
          email: result.user.email
        },
        profile: result.profile,
        organization: result.organization,
        membership: result.membership,
        pendingInvitations: result.pendingInvitations,
        token: result.token
      }, 'Login successful')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      await authService.logout(req.user?.id)
      return successResponse(res, null, 'Logged out successfully')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/auth/me
   */
  async me(req, res, next) {
    try {
      const result = await authService.getCurrentUser(req.user.id)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body
      await authService.forgotPassword(email)

      // Always return success to not reveal if email exists
      return successResponse(res, null, 'If the email exists, a reset link has been sent')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body
      await authService.resetPassword(token, password)
      return successResponse(res, null, 'Password reset successful')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const result = await authService.refreshToken(req.user.id)
      return successResponse(res, result, 'Token refreshed')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body
      await authService.changePassword(req.user.id, currentPassword, newPassword)
      return successResponse(res, null, 'Password changed successfully')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/auth/check-email
   * Check if email is already registered
   */
  async checkEmail(req, res, next) {
    try {
      const { email } = req.body
      const result = await authService.checkEmailExists(email)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }
}
