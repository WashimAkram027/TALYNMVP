import { adminPayrollService } from '../../services/admin/payroll.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminPayrollController = {
  async listRuns(req, res) {
    try {
      const { page, limit, status, orgId, sortBy, sortOrder } = req.query
      const result = await adminPayrollService.listPayrollRuns({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status, orgId, sortBy, sortOrder
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getRunDetail(req, res) {
    try {
      const result = await adminPayrollService.getPayrollRunDetail(req.params.id)
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async approve(req, res) {
    try {
      const { notes } = req.body || {}
      const ip = req.ip || req.headers['x-forwarded-for']
      await adminPayrollService.approvePayrollRun(req.params.id, req.admin.id, notes, ip)
      return successResponse(res, null, 'Payroll run approved')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async reject(req, res) {
    try {
      const { notes } = req.body || {}
      const ip = req.ip || req.headers['x-forwarded-for']
      await adminPayrollService.rejectPayrollRun(req.params.id, req.admin.id, notes, ip)
      return successResponse(res, null, 'Payroll run rejected')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async updateItem(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminPayrollService.updatePayrollItem(req.params.itemId, req.body, req.admin.id, ip)
      return successResponse(res, result, 'Payroll item updated')
    } catch (error) {
      const status = error.name === 'NotFoundError' ? 404 : error.name === 'BadRequestError' ? 400 : 500
      return errorResponse(res, error.message, status)
    }
  }
}
