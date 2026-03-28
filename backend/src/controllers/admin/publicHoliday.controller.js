import { publicHolidayService } from '../../services/publicHoliday.service.js'
import { successResponse, createdResponse, errorResponse, badRequestResponse } from '../../utils/response.js'

export const adminPublicHolidayController = {
  /**
   * POST /api/admin/public-holidays/seed
   * Bulk seed holidays for a fiscal year across all organizations.
   */
  async seedHolidays(req, res, next) {
    try {
      const { fiscalYear, holidays, source } = req.body
      if (!fiscalYear || !holidays?.length) {
        return badRequestResponse(res, 'fiscalYear and holidays array are required')
      }
      const result = await publicHolidayService.seedForAllOrgs(fiscalYear, holidays, source)
      return successResponse(res, result, `Seeded ${result.totalInserted} holidays across ${result.orgsProcessed} organizations`)
    } catch (error) { next(error) }
  },

  /**
   * POST /api/admin/public-holidays
   * Add a single holiday for a specific organization.
   */
  async addHoliday(req, res, next) {
    try {
      const { organizationId, ...holidayData } = req.body
      if (!organizationId) return badRequestResponse(res, 'organizationId is required')
      const result = await publicHolidayService.addHoliday(organizationId, holidayData)
      return createdResponse(res, result, 'Holiday added')
    } catch (error) { next(error) }
  },

  /**
   * PATCH /api/admin/public-holidays/:id
   */
  async updateHoliday(req, res, next) {
    try {
      const result = await publicHolidayService.updateHoliday(req.params.id, req.body)
      return successResponse(res, result, 'Holiday updated')
    } catch (error) { next(error) }
  },

  /**
   * PATCH /api/admin/public-holidays/:id/deactivate
   */
  async deactivateHoliday(req, res, next) {
    try {
      const result = await publicHolidayService.deactivateHoliday(req.params.id)
      return successResponse(res, result, 'Holiday deactivated')
    } catch (error) { next(error) }
  },

  /**
   * GET /api/admin/public-holidays/compliance/:orgId
   */
  async checkCompliance(req, res, next) {
    try {
      const fiscalYear = req.query.fiscalYear
      if (!fiscalYear) return badRequestResponse(res, 'fiscalYear query param is required')
      const result = await publicHolidayService.checkHolidayCompliance(req.params.orgId, fiscalYear)
      return successResponse(res, result, 'Compliance check completed')
    } catch (error) { next(error) }
  },

  /**
   * GET /api/admin/public-holidays
   * List holidays with filters (orgId, fiscalYear, category).
   */
  async listHolidays(req, res, next) {
    try {
      const { orgId, fiscalYear, category, startDate, endDate } = req.query
      if (!orgId) return badRequestResponse(res, 'orgId query param is required')
      const result = await publicHolidayService.listHolidays(orgId, { fiscalYear, category, startDate, endDate })
      return successResponse(res, result, 'Holidays retrieved')
    } catch (error) { next(error) }
  }
}
