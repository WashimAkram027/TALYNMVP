import { authorizedUsersService } from '../services/authorizedUsers.service.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  badRequestResponse
} from '../utils/response.js'

export const authorizedUsersController = {
  /**
   * POST /api/authorized-users
   * Invite an authorized user
   */
  async invite(req, res) {
    try {
      const { email, firstName, lastName } = req.body

      const member = await authorizedUsersService.invite(
        req.user.organizationId,
        req.user.id,
        { email, firstName, lastName }
      )

      return createdResponse(res, member, 'Invitation sent successfully')
    } catch (error) {
      console.error('Invite authorized user error:', error)
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode)
      }
      return errorResponse(res, 'Failed to send invitation', 500)
    }
  },

  /**
   * GET /api/authorized-users
   * List authorized users for the organization
   */
  async list(req, res) {
    try {
      const users = await authorizedUsersService.getAuthorizedUsers(req.user.organizationId)
      return successResponse(res, users)
    } catch (error) {
      console.error('List authorized users error:', error)
      return errorResponse(res, 'Failed to list authorized users', 500)
    }
  },

  /**
   * DELETE /api/authorized-users/:id
   * Revoke an authorized user's access
   */
  async revoke(req, res) {
    try {
      const { id } = req.params
      const result = await authorizedUsersService.revokeAuthorizedUser(id, req.user.organizationId)
      return successResponse(res, result, 'User access revoked')
    } catch (error) {
      console.error('Revoke authorized user error:', error)
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode)
      }
      return errorResponse(res, 'Failed to revoke access', 500)
    }
  },

  /**
   * POST /api/authorized-users/setup
   * Set up an authorized user's account (public, token-based)
   */
  async setup(req, res) {
    try {
      const { token, password } = req.body
      const result = await authorizedUsersService.setupAccount(token, password)
      return successResponse(res, result, 'Account created successfully')
    } catch (error) {
      console.error('Setup authorized user error:', error)
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode)
      }
      return errorResponse(res, 'Failed to set up account', 500)
    }
  },

  /**
   * GET /api/authorized-users/validate-token
   * Validate an invitation token (public)
   */
  async validateToken(req, res) {
    try {
      const { token } = req.query
      if (!token) {
        return badRequestResponse(res, 'Token is required')
      }
      const result = await authorizedUsersService.validateSetupToken(token)
      return successResponse(res, result)
    } catch (error) {
      console.error('Validate token error:', error)
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode)
      }
      return errorResponse(res, 'Invalid token', 400)
    }
  },

  /**
   * POST /api/authorized-users/:id/resend
   * Resend invitation email
   */
  async resendInvite(req, res) {
    try {
      const { id } = req.params
      const result = await authorizedUsersService.resendInvitation(id, req.user.organizationId, req.user.id)
      return successResponse(res, result, 'Invitation resent successfully')
    } catch (error) {
      console.error('Resend authorized user invite error:', error)
      if (error.statusCode) {
        return errorResponse(res, error.message, error.statusCode)
      }
      return errorResponse(res, 'Failed to resend invitation', 500)
    }
  }
}
