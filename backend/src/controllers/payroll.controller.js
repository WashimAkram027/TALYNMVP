import { payrollService } from '../services/payroll.service.js'
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse
} from '../utils/response.js'

/**
 * Payroll Controller
 * Handles HTTP requests for payroll operations
 */
export const payrollController = {
  /**
   * GET /api/payroll/runs
   * Get all payroll runs for the organization
   */
  async getRuns(req, res) {
    try {
      const filters = {
        status: req.query.status,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate
      }

      const runs = await payrollService.getPayrollRuns(req.user.organizationId, filters)
      return successResponse(res, runs)
    } catch (error) {
      console.error('[PayrollController] GetRuns error:', error)
      return errorResponse(res, 'Failed to get payroll runs', 500, error)
    }
  },

  /**
   * GET /api/payroll/runs/:id
   * Get a single payroll run with items
   */
  async getRun(req, res) {
    try {
      const { id } = req.params
      const run = await payrollService.getPayrollRun(id, req.user.organizationId)
      return successResponse(res, run)
    } catch (error) {
      console.error('[PayrollController] GetRun error:', error)
      if (error.message === 'Payroll run not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get payroll run', 500, error)
    }
  },

  /**
   * POST /api/payroll/runs
   * Create a new payroll run
   */
  async createRun(req, res) {
    try {
      const { payPeriodStart, payPeriodEnd, payDate } = req.body

      if (!payPeriodStart || !payPeriodEnd || !payDate) {
        return badRequestResponse(res, 'Pay period start, end, and pay date are required')
      }

      const run = await payrollService.createPayrollRun(
        req.user.organizationId,
        payPeriodStart,
        payPeriodEnd,
        payDate
      )

      return createdResponse(res, run, 'Payroll run created successfully')
    } catch (error) {
      console.error('[PayrollController] CreateRun error:', error)
      return errorResponse(res, 'Failed to create payroll run', 500, error)
    }
  },

  /**
   * PUT /api/payroll/runs/:id/status
   * Update payroll run status
   */
  async updateRunStatus(req, res) {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!status) {
        return badRequestResponse(res, 'Status is required')
      }

      const run = await payrollService.updatePayrollRunStatus(id, req.user.organizationId, status)
      return successResponse(res, run, 'Payroll run status updated')
    } catch (error) {
      console.error('[PayrollController] UpdateRunStatus error:', error)
      if (error.message === 'Payroll run not found') {
        return notFoundResponse(res, error.message)
      }
      if (error.message === 'Invalid status') {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to update payroll run status', 500, error)
    }
  },

  /**
   * PUT /api/payroll/items/:id
   * Update a payroll item
   */
  async updateItem(req, res) {
    try {
      const { id } = req.params
      const item = await payrollService.updatePayrollItem(id, req.user.organizationId, req.body)
      return successResponse(res, item, 'Payroll item updated')
    } catch (error) {
      console.error('[PayrollController] UpdateItem error:', error)
      if (error.message === 'Payroll item not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to update payroll item', 500, error)
    }
  },

  /**
   * GET /api/payroll/upcoming
   * Get upcoming payroll for the organization
   */
  async getUpcoming(req, res) {
    try {
      const upcoming = await payrollService.getUpcomingPayroll(req.user.organizationId)
      return successResponse(res, upcoming)
    } catch (error) {
      console.error('[PayrollController] GetUpcoming error:', error)
      return errorResponse(res, 'Failed to get upcoming payroll', 500, error)
    }
  },

  /**
   * GET /api/payroll/member/:memberId/history
   * Get payroll history for a specific member
   */
  async getMemberHistory(req, res) {
    try {
      const { memberId } = req.params
      const limit = parseInt(req.query.limit) || 12

      const history = await payrollService.getEmployeePayrollHistory(
        memberId,
        req.user.organizationId,
        limit
      )

      return successResponse(res, history)
    } catch (error) {
      console.error('[PayrollController] GetMemberHistory error:', error)
      if (error.message === 'Member not found') {
        return notFoundResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to get member payroll history', 500, error)
    }
  },

  /**
   * DELETE /api/payroll/runs/:id
   * Delete a payroll run (only if draft)
   */
  async deleteRun(req, res) {
    try {
      const { id } = req.params
      await payrollService.deletePayrollRun(id, req.user.organizationId)
      return successResponse(res, null, 'Payroll run deleted successfully')
    } catch (error) {
      console.error('[PayrollController] DeleteRun error:', error)
      if (error.message === 'Payroll run not found') {
        return notFoundResponse(res, error.message)
      }
      if (error.message === 'Can only delete draft payroll runs') {
        return badRequestResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to delete payroll run', 500, error)
    }
  }
}
