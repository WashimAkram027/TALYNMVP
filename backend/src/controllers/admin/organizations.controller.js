import { adminOrganizationsService } from '../../services/admin/organizations.service.js'
import { successResponse, errorResponse } from '../../utils/response.js'

export const adminOrganizationsController = {
  async list(req, res) {
    try {
      const { page, limit, search, status, sortBy, sortOrder } = req.query
      const entityStatus = req.query.entityStatus || req.query.entity_status
      const industry = req.query.industry
      const result = await adminOrganizationsService.listOrgs({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        search, status, entityStatus, industry, sortBy, sortOrder
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getDetail(req, res) {
    try {
      const org = await adminOrganizationsService.getOrgDetail(req.params.id)
      return successResponse(res, org)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getEntity(req, res) {
    try {
      const entity = await adminOrganizationsService.getEntityDetails(req.params.id)
      return successResponse(res, entity)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async approveEntity(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminOrganizationsService.approveEntity(req.params.id, req.admin.id, ip)
      return successResponse(res, result, 'Entity approved successfully')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async rejectEntity(req, res) {
    try {
      const { reason } = req.body
      if (!reason) return errorResponse(res, 'Rejection reason is required', 400)
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminOrganizationsService.rejectEntity(req.params.id, req.admin.id, reason, ip)
      return successResponse(res, result, 'Entity rejected')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getMembers(req, res) {
    try {
      const { page, limit } = req.query
      const result = await adminOrganizationsService.getOrgMembers(req.params.id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getPaymentMethods(req, res) {
    try {
      const result = await adminOrganizationsService.getOrgPaymentMethods(req.params.id)
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async getPayrollRuns(req, res) {
    try {
      const { page, limit } = req.query
      const result = await adminOrganizationsService.getOrgPayrollRuns(req.params.id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      })
      return successResponse(res, result)
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async update(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const data = await adminOrganizationsService.updateOrg(req.params.id, req.body, req.admin.id, ip)
      return successResponse(res, data, 'Organization updated')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async suspend(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const { reason } = req.body
      const result = await adminOrganizationsService.suspendOrg(req.params.id, req.admin.id, reason, ip)
      return successResponse(res, result, 'Organization suspended')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  },

  async reactivate(req, res) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']
      const result = await adminOrganizationsService.reactivateOrg(req.params.id, req.admin.id, ip)
      return successResponse(res, result, 'Organization reactivated')
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500)
    }
  }
}
