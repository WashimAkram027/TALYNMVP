import { timeOffService } from '../services/timeoff.service.js'
import { supabase } from '../config/supabase.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse
} from '../utils/response.js'

/**
 * Look up the current user's organization_members ID
 */
async function getMembershipId(profileId, organizationId) {
  const { data } = await supabase
    .from('organization_members')
    .select('id')
    .eq('profile_id', profileId)
    .eq('organization_id', organizationId)
    .single()
  return data?.id || null
}

/**
 * Time Off Controller
 * Handles HTTP requests for time off operations
 */
export const timeOffController = {
  /**
   * GET /api/timeoff/policies
   * Get time off policies for the organization
   */
  async getPolicies(req, res) {
    try {
      const policies = await timeOffService.getPolicies(req.user.organizationId)
      return successResponse(res, policies)
    } catch (error) {
      console.error('[TimeOffController] GetPolicies error:', error)
      return errorResponse(res, 'Failed to get policies', 500, error)
    }
  },

  /**
   * POST /api/timeoff/policies
   * Create a time off policy
   */
  async createPolicy(req, res) {
    try {
      const policy = await timeOffService.createPolicy(req.user.organizationId, req.body)
      return createdResponse(res, policy, 'Policy created successfully')
    } catch (error) {
      console.error('[TimeOffController] CreatePolicy error:', error)
      return errorResponse(res, 'Failed to create policy', 500, error)
    }
  },

  /**
   * PUT /api/timeoff/policies/:id
   * Update a time off policy
   */
  async updatePolicy(req, res) {
    try {
      const { id } = req.params
      const policy = await timeOffService.updatePolicy(id, req.user.organizationId, req.body)
      return successResponse(res, policy, 'Policy updated successfully')
    } catch (error) {
      console.error('[TimeOffController] UpdatePolicy error:', error)
      if (error.message === 'Policy not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to update policy', 500, error)
    }
  },

  /**
   * DELETE /api/timeoff/policies/:id
   * Delete (deactivate) a time off policy
   */
  async deletePolicy(req, res) {
    try {
      const { id } = req.params
      await timeOffService.deletePolicy(id, req.user.organizationId)
      return successResponse(res, null, 'Policy deleted successfully')
    } catch (error) {
      console.error('[TimeOffController] DeletePolicy error:', error)
      if (error.message === 'Policy not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to delete policy', 500, error)
    }
  },

  /**
   * GET /api/timeoff/balances/:memberId
   * Get employee time off balances
   */
  async getBalances(req, res) {
    try {
      const { memberId } = req.params
      const year = parseInt(req.query.year) || new Date().getFullYear()
      const balances = await timeOffService.getBalances(memberId, req.user.organizationId, year)
      return successResponse(res, balances)
    } catch (error) {
      console.error('[TimeOffController] GetBalances error:', error)
      if (error.message === 'Member not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get balances', 500, error)
    }
  },

  /**
   * POST /api/timeoff/balances/:memberId/initialize
   * Initialize balances for a new year/employee
   */
  async initializeBalances(req, res) {
    try {
      const { memberId } = req.params
      const year = parseInt(req.body.year) || new Date().getFullYear()
      const balances = await timeOffService.initializeBalances(memberId, req.user.organizationId, year)
      return createdResponse(res, balances, 'Balances initialized successfully')
    } catch (error) {
      console.error('[TimeOffController] InitializeBalances error:', error)
      if (error.message === 'Member not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to initialize balances', 500, error)
    }
  },

  /**
   * GET /api/timeoff/requests
   * Get time off requests
   */
  async getRequests(req, res) {
    try {
      const filters = {
        memberId: req.query.memberId,
        status: req.query.status,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      }
      const requests = await timeOffService.getRequests(req.user.organizationId, filters)
      return successResponse(res, requests)
    } catch (error) {
      console.error('[TimeOffController] GetRequests error:', error)
      return errorResponse(res, 'Failed to get requests', 500, error)
    }
  },

  /**
   * POST /api/timeoff/requests
   * Request time off
   */
  async createRequest(req, res) {
    try {
      const { policyId, startDate, endDate, reason, memberId } = req.body

      if (!policyId || !startDate || !endDate) {
        return badRequestResponse(res, 'Policy ID, start date, and end date are required')
      }

      // Use provided memberId or look up from organization_members
      let targetMemberId = memberId
      if (!targetMemberId) {
        targetMemberId = await getMembershipId(req.user.id, req.user.organizationId)
      }

      if (!targetMemberId) {
        return badRequestResponse(res, 'Member ID is required')
      }

      const request = await timeOffService.requestTimeOff(
        targetMemberId,
        req.user.organizationId,
        policyId,
        startDate,
        endDate,
        reason
      )

      return createdResponse(res, request, 'Time off request submitted')
    } catch (error) {
      console.error('[TimeOffController] CreateRequest error:', error)
      if (error.message === 'Member not found' || error.message === 'Policy not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to create request', 500, error)
    }
  },

  /**
   * PUT /api/timeoff/requests/:id/review
   * Review (approve/reject) time off request
   */
  async reviewRequest(req, res) {
    try {
      const { id } = req.params
      const { approved, notes } = req.body

      if (approved === undefined) {
        return badRequestResponse(res, 'Approved status is required')
      }

      const result = await timeOffService.reviewRequest(
        id,
        req.user.organizationId,
        req.user.id,
        approved,
        notes
      )

      return successResponse(res, result, `Request ${approved ? 'approved' : 'rejected'}`)
    } catch (error) {
      console.error('[TimeOffController] ReviewRequest error:', error)
      if (error.message === 'Request not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to review request', 500, error)
    }
  },

  /**
   * PUT /api/timeoff/requests/:id/cancel
   * Cancel a pending request
   */
  async cancelRequest(req, res) {
    try {
      const { id } = req.params

      // Look up the current user's membership ID
      const membershipId = await getMembershipId(req.user.id, req.user.organizationId)
      if (!membershipId) {
        return badRequestResponse(res, 'Membership not found')
      }

      const result = await timeOffService.cancelRequest(
        id,
        membershipId,
        req.user.organizationId
      )

      return successResponse(res, result, 'Request cancelled')
    } catch (error) {
      console.error('[TimeOffController] CancelRequest error:', error)
      if (error.message === 'Request not found') {
        return notFoundResponse(res, error.message)
      }
      if (error.message.includes('Can only cancel')) {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to cancel request', 500, error)
    }
  },

  /**
   * GET /api/timeoff/member/:memberId/upcoming
   * Get upcoming time off for an employee
   */
  async getUpcomingTimeOff(req, res) {
    try {
      const { memberId } = req.params
      const upcoming = await timeOffService.getUpcomingTimeOff(memberId, req.user.organizationId)
      return successResponse(res, upcoming)
    } catch (error) {
      console.error('[TimeOffController] GetUpcomingTimeOff error:', error)
      if (error.message === 'Member not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get upcoming time off', 500, error)
    }
  }
}
