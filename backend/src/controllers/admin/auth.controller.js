import { adminAuthService } from '../../services/admin/auth.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminAuthController = {
  async login(req, res) {
    try {
      const { email, password } = req.body
      const ip = req.ip || req.headers['x-forwarded-for'] || null
      const result = await adminAuthService.login(email, password, ip)
      return successResponse(res, result, 'Admin login successful')
    } catch (error) {
      const status = error.statusCode || 500
      return errorResponse(res, error.message, status)
    }
  },

  async getMe(req, res) {
    try {
      const admin = await adminAuthService.getMe(req.admin.id)
      return successResponse(res, admin)
    } catch (error) {
      const status = error.statusCode || 500
      return errorResponse(res, error.message, status)
    }
  }
}
