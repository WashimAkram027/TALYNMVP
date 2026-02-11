import { complianceService } from '../services/compliance.service.js'
import { successResponse, createdResponse, errorResponse, notFoundResponse } from '../utils/response.js'

export const complianceController = {
  async getItems(req, res) {
    try {
      const filters = {
        status: req.query.status,
        itemType: req.query.itemType,
        memberId: req.query.memberId,
        isRequired: req.query.isRequired === 'true' ? true : req.query.isRequired === 'false' ? false : undefined
      }
      const items = await complianceService.getComplianceItems(req.user.organizationId, filters)
      return successResponse(res, items)
    } catch (error) {
      return errorResponse(res, 'Failed to get compliance items', 500, error)
    }
  },

  async getMemberItems(req, res) {
    try {
      const items = await complianceService.getMemberComplianceItems(req.params.memberId, req.user.organizationId)
      return successResponse(res, items)
    } catch (error) {
      if (error.message === 'Member not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to get member compliance items', 500, error)
    }
  },

  async createItem(req, res) {
    try {
      const item = await complianceService.createComplianceItem(req.user.organizationId, req.body)
      return createdResponse(res, item, 'Compliance item created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create compliance item', 500, error)
    }
  },

  async updateItem(req, res) {
    try {
      const item = await complianceService.updateComplianceItem(req.params.id, req.user.organizationId, req.body)
      return successResponse(res, item, 'Compliance item updated')
    } catch (error) {
      if (error.message === 'Compliance item not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to update compliance item', 500, error)
    }
  },

  async deleteItem(req, res) {
    try {
      await complianceService.deleteComplianceItem(req.params.id, req.user.organizationId)
      return successResponse(res, null, 'Compliance item deleted')
    } catch (error) {
      return errorResponse(res, 'Failed to delete compliance item', 500, error)
    }
  },

  async getAlerts(req, res) {
    try {
      const filters = {
        includeRead: req.query.includeRead === 'true',
        includeDismissed: req.query.includeDismissed === 'true',
        alertType: req.query.alertType
      }
      const alerts = await complianceService.getAlerts(req.user.organizationId, filters)
      return successResponse(res, alerts)
    } catch (error) {
      return errorResponse(res, 'Failed to get compliance alerts', 500, error)
    }
  },

  async createAlert(req, res) {
    try {
      const alert = await complianceService.createAlert(req.user.organizationId, req.body)
      return createdResponse(res, alert, 'Alert created successfully')
    } catch (error) {
      return errorResponse(res, 'Failed to create alert', 500, error)
    }
  },

  async markAlertRead(req, res) {
    try {
      const alert = await complianceService.markAlertRead(req.params.id, req.user.organizationId)
      return successResponse(res, alert, 'Alert marked as read')
    } catch (error) {
      if (error.message === 'Alert not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to mark alert as read', 500, error)
    }
  },

  async dismissAlert(req, res) {
    try {
      const alert = await complianceService.dismissAlert(req.params.id, req.user.organizationId)
      return successResponse(res, alert, 'Alert dismissed')
    } catch (error) {
      if (error.message === 'Alert not found') return notFoundResponse(res, error.message)
      return errorResponse(res, 'Failed to dismiss alert', 500, error)
    }
  },

  async getScore(req, res) {
    try {
      const score = await complianceService.getComplianceScore(req.user.organizationId)
      return successResponse(res, { score })
    } catch (error) {
      return errorResponse(res, 'Failed to get compliance score', 500, error)
    }
  },

  async getDueSoon(req, res) {
    try {
      const daysAhead = parseInt(req.query.daysAhead) || 30
      const items = await complianceService.getItemsDueSoon(req.user.organizationId, daysAhead)
      return successResponse(res, items)
    } catch (error) {
      return errorResponse(res, 'Failed to get items due soon', 500, error)
    }
  }
}
