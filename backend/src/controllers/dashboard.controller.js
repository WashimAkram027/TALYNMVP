import { dashboardService } from '../services/dashboard.service.js'
import { successResponse, badRequestResponse } from '../utils/response.js'

/**
 * Dashboard Controller
 * Handles dashboard-related HTTP requests
 */
export const dashboardController = {
  /**
   * GET /api/dashboard/employer
   * Get employer dashboard statistics
   */
  async getEmployerStats(req, res, next) {
    try {
      const organizationId = req.user.organizationId

      // Return empty stats for new organizations without errors
      if (!organizationId) {
        return successResponse(res, {
          members: { total: 0, active: 0, invited: 0, offboarded: 0 },
          payroll: { upcomingAmount: 0, currency: 'USD', dueInDays: 0 },
          pipeline: { total: 0, interview: 0, assessment: 0, offerSent: 0 },
          compliance: { score: 100, alerts: [] },
          isNewOrganization: true
        })
      }

      const stats = await dashboardService.getEmployerStats(organizationId)
      return successResponse(res, stats)
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/dashboard/team-overview
   * Get team members for dashboard table
   */
  async getTeamOverview(req, res, next) {
    try {
      const organizationId = req.user.organizationId
      const limit = parseInt(req.query.limit) || 5

      // Return empty team for new organizations
      if (!organizationId) {
        return successResponse(res, [])
      }

      const team = await dashboardService.getTeamOverview(organizationId, limit)
      return successResponse(res, team)
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/dashboard/employee
   * Get employee dashboard statistics
   */
  async getEmployeeStats(req, res, next) {
    try {
      const profileId = req.user.id
      const organizationId = req.user.organizationId // May be null for candidates

      const stats = await dashboardService.getEmployeeStats(profileId, organizationId)
      return successResponse(res, stats)
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/dashboard/holidays
   * Get upcoming holidays
   */
  async getHolidays(req, res, next) {
    try {
      const organizationId = req.user.organizationId
      const limit = parseInt(req.query.limit) || 6

      const holidays = await dashboardService.getHolidays(organizationId, limit)
      return successResponse(res, holidays)
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/dashboard/announcements
   * Get recent announcements
   */
  async getAnnouncements(req, res, next) {
    try {
      const organizationId = req.user.organizationId
      const limit = parseInt(req.query.limit) || 3

      if (!organizationId) {
        // Return empty array for users without organization
        return successResponse(res, [])
      }

      const announcements = await dashboardService.getAnnouncements(organizationId, limit)
      return successResponse(res, announcements)
    } catch (error) {
      next(error)
    }
  }
}
