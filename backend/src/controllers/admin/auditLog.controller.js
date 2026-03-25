import { auditLogService } from '../../services/admin/auditLog.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminAuditLogController = {
  async list(req, res) {
    try {
      const { page, limit, adminId, action, targetType, targetId } = req.query
      const result = await auditLogService.getLogs({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        adminId,
        action,
        targetType,
        targetId
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, 500)
    }
  }
}
