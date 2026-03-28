import { supabase } from '../config/supabase.js'
import { leaveService } from '../services/leave.service.js'
import { leaveAccrualService } from '../services/leaveAccrual.service.js'
import { successResponse, createdResponse, errorResponse, badRequestResponse, notFoundResponse } from '../utils/response.js'

/**
 * Resolve memberId: use provided value, or look up from profile_id for employees.
 */
async function resolveMemberId(req) {
  if (req.body?.memberId) return req.body.memberId
  if (req.params?.memberId) return req.params.memberId
  // Employee self-service: look up organization_members.id from profile_id
  if (req.user?.id && req.user?.organizationId) {
    const { data } = await supabase
      .from('organization_members')
      .select('id')
      .eq('profile_id', req.user.id)
      .eq('organization_id', req.user.organizationId)
      .single()
    return data?.id || null
  }
  return null
}

export const leaveController = {
  /**
   * GET /api/leave/balance/:memberId
   * Get combined leave balance summary (sick + home)
   */
  async getBalanceSummary(req, res, next) {
    try {
      let memberId = req.params.memberId
      if (memberId === 'me') memberId = await resolveMemberId(req)
      if (!memberId) return badRequestResponse(res, 'Member ID required')
      const summary = await leaveService.getLeaveBalanceSummary(memberId)
      return successResponse(res, summary, 'Leave balance retrieved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/leave/balance/:memberId/:type
   * Get balance for a specific leave type (sick_leave or home_leave)
   */
  async getBalance(req, res, next) {
    try {
      const { memberId, type } = req.params
      let balance
      if (type === 'sick_leave') {
        balance = await leaveService.calculateSickLeaveBalance(memberId)
      } else if (type === 'home_leave') {
        balance = await leaveService.calculateHomeLeaveBalance(memberId)
      } else {
        return badRequestResponse(res, 'Invalid leave type. Must be sick_leave or home_leave.')
      }
      return successResponse(res, balance, 'Leave balance retrieved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/leave/requests
   * Create a new leave request
   */
  async createRequest(req, res, next) {
    try {
      const { leaveTypeCode, startDate, endDate, reason } = req.body
      const employeeId = await resolveMemberId(req)
      if (!employeeId) return badRequestResponse(res, 'Employee ID is required')

      const result = await leaveService.createLeaveRequest(
        employeeId,
        req.user.organizationId,
        { leaveTypeCode, startDate, endDate, reason }
      )
      return createdResponse(res, result, 'Leave request created')
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /api/leave/requests/:id/approve
   */
  async approveRequest(req, res, next) {
    try {
      const result = await leaveService.approveLeaveRequest(
        req.params.id,
        req.user.organizationId,
        req.user.id
      )
      return successResponse(res, result, 'Leave request approved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /api/leave/requests/:id/reject
   */
  async rejectRequest(req, res, next) {
    try {
      const { reason } = req.body
      const result = await leaveService.rejectLeaveRequest(
        req.params.id,
        req.user.organizationId,
        reason
      )
      return successResponse(res, result, 'Leave request rejected')
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/leave/requests
   * List leave requests with optional filters
   */
  async listRequests(req, res, next) {
    try {
      const filters = {
        employeeId: req.query.memberId,
        status: req.query.status,
        leaveTypeCode: req.query.leaveType
      }
      const requests = await leaveService.listLeaveRequests(req.user.organizationId, filters)
      return successResponse(res, requests, 'Leave requests retrieved')
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/leave/encashment/:memberId
   */
  async calculateEncashment(req, res, next) {
    try {
      const { memberId } = req.params
      const { terminationDate } = req.body
      const result = await leaveService.calculateEncashment(memberId, terminationDate || new Date())
      return successResponse(res, result, 'Encashment calculated')
    } catch (error) {
      next(error)
    }
  },

  // ─── Event-Triggered Leave Endpoints ────────────────────────

  async createMaternityRequest(req, res, next) {
    try {
      const { memberId, expectedDeliveryDate, leaveStartDate, coverWithAccumulated } = req.body
      const result = await leaveService.createMaternityLeaveRequest(
        memberId, req.user.organizationId,
        { expectedDeliveryDate, leaveStartDate, coverWithAccumulated }
      )
      return createdResponse(res, result, 'Maternity leave request created')
    } catch (error) { next(error) }
  },

  async createPaternityRequest(req, res, next) {
    try {
      const { memberId, childBirthDate, leaveStartDate } = req.body
      const result = await leaveService.createPaternityLeaveRequest(
        memberId, req.user.organizationId,
        { childBirthDate, leaveStartDate }
      )
      return createdResponse(res, result, 'Paternity leave request created')
    } catch (error) { next(error) }
  },

  async createMourningRequest(req, res, next) {
    try {
      const { memberId, deceasedName, relationship, deathDate, leaveStartDate } = req.body
      const result = await leaveService.createMourningLeaveRequest(
        memberId, req.user.organizationId,
        { deceasedName, relationship, deathDate, leaveStartDate }
      )
      return createdResponse(res, result, 'Mourning leave request created')
    } catch (error) { next(error) }
  },

  async createSpecialRequest(req, res, next) {
    try {
      const { memberId, startDate, endDate, reason } = req.body
      const result = await leaveService.createSpecialLeaveRequest(
        memberId, req.user.organizationId,
        { startDate, endDate, reason }
      )
      return createdResponse(res, result, 'Special leave request created')
    } catch (error) { next(error) }
  },

  async recordCompensatoryWork(req, res, next) {
    try {
      const { memberId, workDate, reason } = req.body
      const result = await leaveService.recordCompensatoryWork(
        memberId, req.user.organizationId,
        { workDate, reason }
      )
      return createdResponse(res, result, 'Compensatory work recorded')
    } catch (error) { next(error) }
  },

  async listPublicHolidays(req, res, next) {
    try {
      const result = await leaveService.listPublicHolidays(
        req.user.organizationId,
        req.query.fiscalYear
      )
      return successResponse(res, result, 'Public holidays retrieved')
    } catch (error) { next(error) }
  }
}
