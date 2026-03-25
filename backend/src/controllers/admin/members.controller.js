import { adminMembersService } from '../../services/admin/members.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminMembersController = {
  async list(req, res) {
    try {
      const { page, limit, search, status, orgId, memberRole, sortBy, sortOrder } = req.query
      const result = await adminMembersService.listMembers({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        search, status, orgId, memberRole, sortBy, sortOrder
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getDetail(req, res) {
    try {
      const member = await adminMembersService.getMemberDetail(req.params.id)
      return successResponse(res, member)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async overrideStatus(req, res) {
    try {
      const { status, reason } = req.body || {}
      const ip = req.ip || req.headers['x-forwarded-for']
      await adminMembersService.overrideStatus(req.params.id, status, req.admin.id, reason, ip)
      return successResponse(res, null, 'Member status updated')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  }
}
