import { membersService } from '../services/members.service.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse
} from '../utils/response.js'

/**
 * Members Controller
 * Handles HTTP requests for organization member management
 */
export const membersController = {
  /**
   * GET /api/members
   * Get all members of the organization
   */
  async getAll(req, res) {
    try {
      const filters = {
        status: req.query.status,
        memberRole: req.query.memberRole,
        department: req.query.department,
        employmentType: req.query.employmentType,
        search: req.query.search
      }

      const members = await membersService.getAll(req.user.organizationId, filters)

      return successResponse(res, members)
    } catch (error) {
      console.error('Get members error:', error)
      return errorResponse(res, 'Failed to get members', 500, error)
    }
  },

  /**
   * GET /api/members/stats
   * Get member statistics
   */
  async getStats(req, res) {
    try {
      const stats = await membersService.getStats(req.user.organizationId)

      return successResponse(res, stats)
    } catch (error) {
      console.error('Get member stats error:', error)
      return errorResponse(res, 'Failed to get member stats', 500, error)
    }
  },

  /**
   * GET /api/members/available-candidates
   * Get candidates available for hiring (not in any organization)
   */
  async getAvailableCandidates(req, res) {
    try {
      const candidates = await membersService.getAvailableCandidates()

      return successResponse(res, candidates)
    } catch (error) {
      console.error('Get available candidates error:', error)
      return errorResponse(res, 'Failed to get available candidates', 500, error)
    }
  },

  /**
   * GET /api/members/:id
   * Get a single member by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params

      const member = await membersService.getById(id, req.user.organizationId)

      if (!member) {
        return notFoundResponse(res, 'Member not found')
      }

      return successResponse(res, member)
    } catch (error) {
      console.error('Get member error:', error)
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Member not found')
      }
      return errorResponse(res, 'Failed to get member', 500, error)
    }
  },

  /**
   * POST /api/members
   * Invite a new member to the organization
   */
  async invite(req, res) {
    try {
      const {
        email,
        memberRole,
        jobTitle,
        department,
        employmentType,
        salaryAmount,
        salaryCurrency,
        payFrequency,
        location,
        startDate,
        jobDescription,
        probationPeriod
      } = req.body

      if (!email) {
        return badRequestResponse(res, 'Email is required')
      }

      const member = await membersService.invite(
        req.user.organizationId,
        req.user.id,
        {
          email,
          memberRole,
          jobTitle,
          department,
          employmentType,
          salaryAmount,
          salaryCurrency,
          payFrequency,
          location,
          startDate,
          jobDescription,
          probationPeriod
        }
      )

      return createdResponse(res, member, 'Member invited successfully')
    } catch (error) {
      console.error('Invite member error:', error)
      if (error.message === 'User is already a member of this organization') {
        return badRequestResponse(res, error.message)
      }
      if (error.message === 'An invitation has already been sent to this email') {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to invite member', 500, error)
    }
  },

  /**
   * POST /api/members/:id/resend-invite
   * Resend an invitation (resets invited_at timestamp)
   */
  async resendInvite(req, res) {
    try {
      const { id } = req.params

      const member = await membersService.resendInvitation(id, req.user.organizationId, req.user.id)

      return successResponse(res, member, 'Invitation resent successfully')
    } catch (error) {
      console.error('Resend invite error:', error)
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Member not found or not in invited status')
      }
      return errorResponse(res, 'Failed to resend invitation', 500, error)
    }
  },

  /**
   * PUT /api/members/:id
   * Update member details
   */
  async update(req, res) {
    try {
      const { id } = req.params

      const member = await membersService.update(id, req.user.organizationId, req.body)

      if (!member) {
        return notFoundResponse(res, 'Member not found')
      }

      return successResponse(res, member, 'Member updated successfully')
    } catch (error) {
      console.error('Update member error:', error)
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Member not found')
      }
      return errorResponse(res, 'Failed to update member', 500, error)
    }
  },

  /**
   * POST /api/members/:id/activate
   * Activate an invited member
   */
  async activate(req, res) {
    try {
      const { id } = req.params

      const member = await membersService.activate(id, req.user.organizationId)

      if (!member) {
        return notFoundResponse(res, 'Member not found or not in invited status')
      }

      return successResponse(res, member, 'Member activated successfully')
    } catch (error) {
      console.error('Activate member error:', error)
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Member not found or not in invited status')
      }
      return errorResponse(res, 'Failed to activate member', 500, error)
    }
  },

  /**
   * POST /api/members/:id/offboard
   * Offboard a member
   */
  async offboard(req, res) {
    try {
      const { id } = req.params

      // Prevent self-offboarding
      const member = await membersService.getById(id, req.user.organizationId)
      if (member && member.profile_id === req.user.id) {
        return badRequestResponse(res, 'Cannot offboard yourself')
      }

      const updatedMember = await membersService.offboard(id, req.user.organizationId)

      if (!updatedMember) {
        return notFoundResponse(res, 'Member not found')
      }

      return successResponse(res, updatedMember, 'Member offboarded successfully')
    } catch (error) {
      console.error('Offboard member error:', error)
      if (error.code === 'PGRST116') {
        return notFoundResponse(res, 'Member not found')
      }
      return errorResponse(res, 'Failed to offboard member', 500, error)
    }
  },

  /**
   * DELETE /api/members/:id
   * Delete a member (only invited status)
   */
  async delete(req, res) {
    try {
      const { id } = req.params

      await membersService.delete(id, req.user.organizationId)

      return successResponse(res, null, 'Member removed successfully')
    } catch (error) {
      console.error('Delete member error:', error)
      if (error.message === 'Member not found') {
        return notFoundResponse(res, error.message)
      }
      if (error.message.includes('Only invited members')) {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to delete member', 500, error)
    }
  }
}
