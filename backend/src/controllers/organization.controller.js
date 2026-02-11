import { organizationService } from '../services/organization.service.js'
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse
} from '../utils/response.js'

/**
 * Organization Controller
 * Handles HTTP requests for organization management
 */
export const organizationController = {
  /**
   * GET /api/organization
   * Get current user's organization
   */
  async get(req, res) {
    try {
      if (!req.user.organizationId) {
        return notFoundResponse(res, 'No organization found')
      }

      const organization = await organizationService.getWithOwner(req.user.organizationId)

      if (!organization) {
        return notFoundResponse(res, 'Organization not found')
      }

      return successResponse(res, organization)
    } catch (error) {
      console.error('Get organization error:', error)
      return errorResponse(res, 'Failed to get organization', 500, error)
    }
  },

  /**
   * PUT /api/organization
   * Update organization details
   */
  async update(req, res) {
    try {
      if (!req.user.organizationId) {
        return notFoundResponse(res, 'No organization found')
      }

      const allowedFields = [
        'name',
        'phone',
        'website',
        'legal_name',
        'registration_number',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'postal_code',
        'country',
        'industry',
        'industry_other'
      ]

      const updates = {}
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return badRequestResponse(res, 'No valid fields to update')
      }

      const organization = await organizationService.update(
        req.user.organizationId,
        req.user.id,
        updates
      )

      return successResponse(res, organization, 'Organization updated successfully')
    } catch (error) {
      console.error('Update organization error:', error)
      if (error.message === 'Not authorized to update this organization') {
        return forbiddenResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to update organization', 500, error)
    }
  },

  /**
   * GET /api/organization/stats
   * Get organization statistics
   */
  async getStats(req, res) {
    try {
      if (!req.user.organizationId) {
        return notFoundResponse(res, 'No organization found')
      }

      const stats = await organizationService.getStats(req.user.organizationId)

      return successResponse(res, stats)
    } catch (error) {
      console.error('Get organization stats error:', error)
      return errorResponse(res, 'Failed to get organization stats', 500, error)
    }
  },

  /**
   * GET /api/organization/departments
   * Get list of departments in organization
   */
  async getDepartments(req, res) {
    try {
      if (!req.user.organizationId) {
        return notFoundResponse(res, 'No organization found')
      }

      const departments = await organizationService.getDepartments(req.user.organizationId)

      return successResponse(res, departments)
    } catch (error) {
      console.error('Get departments error:', error)
      return errorResponse(res, 'Failed to get departments', 500, error)
    }
  },

  /**
   * PUT /api/organization/settings
   * Update organization settings
   */
  async updateSettings(req, res) {
    try {
      if (!req.user.organizationId) {
        return notFoundResponse(res, 'No organization found')
      }

      const { settings } = req.body

      if (!settings || typeof settings !== 'object') {
        return badRequestResponse(res, 'Settings object is required')
      }

      const organization = await organizationService.updateSettings(
        req.user.organizationId,
        req.user.id,
        settings
      )

      return successResponse(res, organization, 'Settings updated successfully')
    } catch (error) {
      console.error('Update settings error:', error)
      if (error.message === 'Not authorized to update this organization') {
        return forbiddenResponse(res, error.message)
      }
      return errorResponse(res, 'Failed to update settings', 500, error)
    }
  }
}
