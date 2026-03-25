import { adminDashboardService } from '../../services/admin/dashboard.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminDashboardController = {
  async getMetrics(req, res) {
    try {
      const metrics = await adminDashboardService.getMetrics()
      return successResponse(res, metrics)
    } catch (error) {
      return errorResponse(res, error.message, 500)
    }
  },

  async getAlerts(req, res) {
    try {
      const alerts = await adminDashboardService.getAlerts()
      return successResponse(res, alerts)
    } catch (error) {
      return errorResponse(res, error.message, 500)
    }
  }
}
