import { membersService } from '../services/members.service.js'
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse
} from '../utils/response.js'

/**
 * Invitations Controller
 * Handles HTTP requests for invitation management (candidate-facing)
 */
export const invitationsController = {
  /**
   * GET /api/invitations/pending
   * Get pending invitations for the current user (by email)
   */
  async getPending(req, res) {
    try {
      const userEmail = req.user.email

      if (!userEmail) {
        return badRequestResponse(res, 'User email not found')
      }

      const invitations = await membersService.getPendingInvitationsByEmail(userEmail)

      return successResponse(res, invitations)
    } catch (error) {
      console.error('Get pending invitations error:', error)
      return errorResponse(res, 'Failed to get pending invitations', 500, error)
    }
  },

  /**
   * POST /api/invitations/:memberId/accept
   * Accept an invitation
   */
  async accept(req, res) {
    try {
      const { memberId } = req.params
      const profileId = req.user.id

      const result = await membersService.acceptInvitation(memberId, profileId)

      return successResponse(res, result, 'Invitation accepted successfully')
    } catch (error) {
      console.error('Accept invitation error:', error)
      if (error.message.includes('not found') || error.message.includes('already accepted')) {
        return notFoundResponse(res, error.message)
      }
      if (error.message.includes('different email')) {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to accept invitation', 500, error)
    }
  },

  /**
   * POST /api/invitations/:memberId/decline
   * Decline an invitation
   */
  async decline(req, res) {
    try {
      const { memberId } = req.params
      const profileId = req.user.id

      await membersService.declineInvitation(memberId, profileId)

      return successResponse(res, { success: true }, 'Invitation declined')
    } catch (error) {
      console.error('Decline invitation error:', error)
      if (error.message.includes('not found') || error.message.includes('already processed')) {
        return notFoundResponse(res, error.message)
      }
      if (error.message.includes('different email')) {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to decline invitation', 500, error)
    }
  }
}
