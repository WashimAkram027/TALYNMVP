import { adminUsersService } from '../../services/admin/users.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminUsersController = {
  async list(req, res) {
    try {
      const { page, limit, search, role, status, sortBy, sortOrder } = req.query
      const result = await adminUsersService.listUsers({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        search, role, status, sortBy, sortOrder
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getDetail(req, res) {
    try {
      const user = await adminUsersService.getUserDetail(req.params.id)
      return successResponse(res, user)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async suspend(req, res) {
    try {
      const { reason } = req.body || {}
      const ip = req.ip || req.headers['x-forwarded-for']
      await adminUsersService.suspendUser(req.params.id, req.admin.id, reason, ip)
      return successResponse(res, null, 'User suspended')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async reactivate(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      await adminUsersService.reactivateUser(req.params.id, req.admin.id, ip)
      return successResponse(res, null, 'User reactivated')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async resetPassword(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminUsersService.forcePasswordReset(req.params.id, req.admin.id, ip)
      return successResponse(res, result, 'Password reset successfully')
    } catch (error) {
      const status = error.name === 'NotFoundError' ? 404 : 500
      return errorResponse(res, error.message, status)
    }
  },

  async verifyEmail(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminUsersService.verifyEmail(req.params.id, req.admin.id, ip)
      return successResponse(res, result, 'Email verified successfully')
    } catch (error) {
      const status = error.name === 'NotFoundError' ? 404 : error.name === 'BadRequestError' ? 400 : 500
      return errorResponse(res, error.message, status)
    }
  },

  async update(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminUsersService.updateUser(req.params.id, req.body, req.admin.id, ip)
      return successResponse(res, result, 'User updated successfully')
    } catch (error) {
      const status = error.name === 'NotFoundError' ? 404 : error.name === 'BadRequestError' ? 400 : 500
      return errorResponse(res, error.message, status)
    }
  },

  async deleteUser(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminUsersService.deleteUser(req.params.id, req.admin.id, ip)
      return successResponse(res, result, 'User deleted successfully')
    } catch (error) {
      const status = error.statusCode || (error.name === 'NotFoundError' ? 404 : error.name === 'BadRequestError' ? 400 : 500)
      return errorResponse(res, error.message, status)
    }
  }
}
